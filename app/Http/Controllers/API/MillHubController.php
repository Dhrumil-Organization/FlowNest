<?php
declare(strict_types=1);

namespace App\Http\Controllers\API;

use App\Http\Controllers\API\BaseController;
use App\Helpers\DatabaseConnection;
use App\Services\MillServerClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * ─────────────────────────────────────────────────────────────
 *  SUDAMO = only the MIDDLEWARE for Mill mode
 * ─────────────────────────────────────────────────────────────
 *  Flownest (Mills switch ON) → apig /api/mill/... → THIS → Mills server /api/...
 *
 *  NO separate Mills login: the user is the SAME Sudamo user. His Mill Hub rights are his own
 *  Sudamo rights for mill.* (Permission Manager → Mills). Data comes from the Mills server through
 *  the Sudamo BRIDGE account (MillServerClient::call — MILL_API_USER, else the existing BaseController
 *  admin login), never with a Mills password of the user.
 *
 *  1. POST /api/mill/session/status  → { logged_in: true, mill_user: <this Sudamo user>, permissions, has_access, … }
 *  2. POST /api/mill/session/login   → same as status (kept for older apps; user name / password ignored)
 *  3. POST /api/mill/session/logout  → nothing to drop any more (kept for older apps)
 *  4. POST /api/mill/{action}        → right checked HERE, then forwarded to Mills /api/millhub/{action}
 */
class MillHubController extends BaseController
{
    /** Flownest action  =>  [Mills path, timeout, required Mill Hub right ('' = any Mill screen)] */
    private const ALLOWED = [
        'ping'                       => ['millhub/ping', 15, ''],
        'bootstrap'                  => ['millhub/bootstrap', 45, ''],
        'dashboard'                  => ['millhub/dashboard', 30, 'mill.dashboard'],
        'schema'                     => ['millhub/schema', 90, '#admin'],
        'inward'                     => ['millhub/inward', 30, 'mill.inward'],
        'lots'                       => ['millhub/lots', 30, 'mill.lots'],
        'machines'                   => ['millhub/machines', 30, 'mill.machines'],
        'lab'                        => ['millhub/lab', 30, 'mill.lab'],
        'recipes'                    => ['millhub/recipes', 30, 'mill.recipes'],
        'dispatch'                   => ['millhub/dispatch', 30, 'mill.dispatch'],
        'expense/summary'            => ['millhub/expense/summary', 90, 'mill.expense'],
        'expense/ledger'             => ['millhub/expense/ledger', 30, 'mill.expense'],
        'expense/issues'             => ['millhub/expense/issues', 30, 'mill.expense'],
        'reports/summary'            => ['millhub/reports/summary', 90, 'mill.reports'],
        'reports/party'              => ['millhub/reports/party', 30, 'mill.reports'],
        'discover'                   => ['millhub/discover', 120, '#admin'],
        'expense/coal'               => ['millhub/expense/coal', 30, 'mill.expense.coal'],
        'expense/coal/steam'         => ['millhub/expense/coal/steam', 30, 'mill.expense.coal_steam_entry'],
        'expense/coal/steam/save'    => ['millhub/expense/coal/steam/save', 30, 'mill.expense.coal_steam_entry:edit'],
        'expense/coal/steam/delete'  => ['millhub/expense/coal/steam/delete', 30, 'mill.expense.coal_steam_entry:edit'],
        'expense/coal/offers'        => ['millhub/expense/coal/offers', 30, 'mill.expense.coal_optimiser'],
        'expense/coal/offers/save'   => ['millhub/expense/coal/offers/save', 30, 'mill.expense.coal_optimiser:edit'],
        'expense/coal/offers/delete' => ['millhub/expense/coal/offers/delete', 30, 'mill.expense.coal_optimiser:edit'],
        'expense/coal/constraints'   => ['millhub/expense/coal/constraints', 30, 'mill.expense.coal_optimiser'],
        'expense/coal/suppliers'     => ['millhub/expense/coal/suppliers', 30, 'mill.expense.coal_optimiser'],
        'expense/electricity'        => ['millhub/expense/electricity', 30, 'mill.expense.electricity'],
        'expense/chemicals'          => ['millhub/expense/chemicals', 30, 'mill.expense.chemicals'],
        'expense/labour'             => ['millhub/expense/labour', 30, 'mill.expense.labour'],
        'expense/maintenance'        => ['millhub/expense/maintenance', 30, 'mill.expense.maintenance'],
        'reports/colour-cost'        => ['millhub/reports/colour-cost', 60, 'mill.reports.colour_cost'],
    ];

    /* ───────────────────────── session ───────────────────────── */

    public function sessionLogin(Request $request): JsonResponse
    {
        // no Mills login any more — the same Sudamo user (older apps still call this)
        return $this->sessionAnswer($this->sudamoMillUser(), 'Mill mode (Sudamo user).');
    }

    public function sessionStatus(Request $request): JsonResponse
    {
        return $this->sessionAnswer($this->sudamoMillUser(), 'Mill mode (Sudamo user).');
    }

    /** "Mill user" = the logged-in Sudamo user himself */
    private function sudamoMillUser(): array
    {
        $u = Auth::user();
        return [
            'id'            => (int) ($u->id ?? 0),
            'name'          => (string) ($u->name ?? ''),
            'first_name'    => (string) ($u->first_name ?? ''),
            'last_name'     => (string) ($u->last_name ?? ''),
            'is_superadmin' => $this->isSudamoSuperAdmin() ? 1 : 0,
            'role_ids'      => [],
            'prpcode'       => strtoupper((string) (config('mill.prpcode') ?: 'PMD')),
            'year'          => null,
            'source'        => 'sudamo',
        ];
    }

    public function sessionLogout(Request $request): JsonResponse
    {
        MillServerClient::fromController($this)->forgetUser((int) Auth::id());
        return $this->out(true, 'Logged out of Mills.', ['logged_in' => false]);
    }

    /**
     * POST /api/mill/switch_access — may this Sudamo user SEE the "Mills" switch in the header?
     * Only with an explicit ALLOW on the Mill DASHBOARD itself (Permission Manager → Mills → Dashboard,
     * resource mill.dashboard) on one of his roles or as a user override. The "Mill Hub" parent does NOT count,
     * and there is NO super-admin fallback. A user DENY wins; among roles a DENY wins.
     */
    public function switchAccess(Request $request): JsonResponse
    {
        $uid = (int) Auth::id();
        $db  = DB::connection('master');
        $why = '';
        $allowed = false;
        try {
            $paths = ['mill.dashboard'];   // the Mill dashboard right only
            // not filtered on is_active: an older app's registry sync could have switched the row off; the right is the same
            $res = $db->table('app_resources')->whereIn('resource_path', $paths)->pluck('resource_path', 'id')->all();
            if (!$res) {
                $why = 'Mill dashboard is not in the registry yet (Permission Manager → Sync Registry).';
            } else {
                $pathOf = array_map(function ($p) { return strtolower(trim((string) $p)); }, $res);
                $roleIds = [];
                try {
                    $t  = (string) config('app_access.user_role_table', 'user_roles');
                    $uc = (string) config('app_access.user_role_user_column', 'user_id');
                    $rc = (string) config('app_access.user_role_role_column', 'role_id');
                    $roleIds = $db->table($t . ' as ur')->join('GENRoles as gr', 'gr.role_id', '=', 'ur.' . $rc)
                        ->where('ur.' . $uc, $uid)->where('gr.is_deleted', 0)->pluck('ur.' . $rc)->map(function ($v) { return (int) $v; })->unique()->values()->all();
                } catch (\Throwable $e) {
                    $roleIds = [];
                }
                $isView = function ($a) { $a = strtolower(trim((string) $a)); return $a === '' || $a === 'view'; };
                $role = [];
                if ($roleIds) {
                    foreach ($db->table('app_registry_role_permissions')->whereIn('role_id', $roleIds)->whereIn('resource_id', array_keys($pathOf))
                                 ->get(['resource_id', 'action_key', 'decision']) as $r) {
                        if (!$isView($r->action_key)) continue;
                        $p = $pathOf[(int) $r->resource_id];
                        $d = strtolower((string) $r->decision) === 'allow' ? 'allow' : 'deny';
                        if (!isset($role[$p]) || $d === 'deny') $role[$p] = $d;
                    }
                }
                $user = [];
                foreach ($db->table('app_registry_user_overrides')->where('user_id', $uid)->whereIn('resource_id', array_keys($pathOf))
                             ->get(['resource_id', 'action_key', 'decision']) as $r) {
                    if (!$isView($r->action_key)) continue;
                    $user[$pathOf[(int) $r->resource_id]] = strtolower((string) $r->decision) === 'allow' ? 'allow' : 'deny';
                }
                $decision = null;
                foreach ($paths as $p) {
                    $d = $user[$p] ?? ($role[$p] ?? null);
                    if ($d !== null) { $decision = $d; break; }
                }
                $allowed = $decision === 'allow';
                $why = $allowed ? 'Mill dashboard right given.' : ($decision === 'deny' ? 'Mill dashboard right is denied.' : 'No Mill dashboard right given to this user or his roles.');
            }
        } catch (\Throwable $e) {
            $allowed = false;
            $why = 'Could not read the Mill rights: ' . mb_substr($e->getMessage(), 0, 200);
        }
        return $this->out(true, $why, ['allowed' => $allowed, 'user_id' => $uid]);
    }

    private function sessionAnswer(array $mu, string $msg): JsonResponse
    {
        $map = $this->millRights();
        return $this->out(true, $msg, [
            'logged_in'     => true,
            'mill_user'     => $mu,
            'is_superadmin' => $this->isSudamoSuperAdmin() ? 1 : 0,
            'permissions'   => $map,
            'has_access'    => self::anyAccess($map),
            'rights_debug'  => $this->rightsDebug,
            // banner on every Mill page — only when Permission Manager → Mills → "Under development" is ALLOW
            'under_development' => $this->underDevelopment,
        ]);
    }

    /* ───────── Mill Hub RIGHTS = the SUDAMO user's own rights (existing permission tables) ─────────
     * Same tables as every other module: app_resources (mill.*), app_registry_role_permissions
     * (Sudamo roles), app_registry_user_overrides (Sudamo users). Given in Permission Manager →
     * "Mills" tab. Only the mill.* part of the map is used / returned. */
    private function isSudamoSuperAdmin(): bool
    {
        $u = Auth::user();
        return $u && (int) ($u->is_superadmin ?? 0) === (int) $this->super_admin_value;
    }

    /** last resolution details (sent back so a "no rights" message can say why) */
    private $rightsDebug = [];

    /** the "Under development" banner switch (mill.under_development) — its OWN explicit ALLOW only */
    const UNDER_DEV = 'mill.under_development';
    private $underDevelopment = false;

    /**
     * Mill Hub rights of the logged-in SUDAMO user (existing tables, no new table):
     *   app_resources (mill / mill.*) · app_resource_actions
     *   app_registry_role_permissions (his Sudamo roles: user_roles → GENRoles)
     *   app_registry_user_overrides   (his own overrides)
     *
     * Rules:
     *   • several roles disagree → DENY wins; a user override is final
     *   • a screen with no decision of its own TAKES THE DECISION OF ITS PARENT
     *     (ALLOW on "Mill Hub" = every Mill screen, unless a screen is denied) —
     *     the earlier version needed every screen ticked one by one, which is why
     *     "rights given, but Mill says no rights" happened
     *   • a parent opens when one of its children is allowed (unless denied itself)
     *   • actions: own decision, else follow the screen when the screen right came
     *     from a parent / super admin
     *   • Sudamo super admin (is_superadmin = -999, or user 1): everything, explicit DENY still applies
     */
    private function millRights(): array
    {
        $uid   = (int) Auth::id();
        $super = $this->isSudamoSuperAdmin() || $uid === 1;
        $db    = DB::connection('master');
        $this->rightsDebug = ['user_id' => $uid, 'superadmin' => $super];

        // not filtered on is_active: an older app's full registry sync used to switch mill.* off (see AppRegistryService)
        $res = $db->table('app_resources')
            ->where(function ($w) { $w->where('resource_path', 'mill')->orWhere('resource_path', 'like', 'mill.%'); })
            ->get(['id', 'resource_path']);
        $this->rightsDebug['mill_resources'] = count($res);
        if (!count($res)) {
            $this->rightsDebug['hint'] = 'The Mill Hub modules are not in the registry yet: open Permission Manager once as admin (Sync Registry).';
            return [];
        }
        $pathOf = [];
        foreach ($res as $r) $pathOf[(int) $r->id] = strtolower(trim((string) $r->resource_path));
        $ids = array_keys($pathOf);

        $actionsOf = [];
        foreach ($db->table('app_resource_actions')->where('is_active', 1)->whereIn('resource_id', $ids)->get(['resource_id', 'action_key']) as $a) {
            $k = strtolower(trim((string) $a->action_key));
            if ($k !== '' && $k !== 'view') $actionsOf[$pathOf[(int) $a->resource_id]][] = $k;
        }

        // his Sudamo roles (same table the Permission Manager uses)
        $roleIds = [];
        try {
            $t  = (string) config('app_access.user_role_table', 'user_roles');
            $uc = (string) config('app_access.user_role_user_column', 'user_id');
            $rc = (string) config('app_access.user_role_role_column', 'role_id');
            $roleIds = $db->table($t . ' as ur')->join('GENRoles as gr', 'gr.role_id', '=', 'ur.' . $rc)
                ->where('ur.' . $uc, $uid)->where('gr.is_deleted', 0)->pluck('ur.' . $rc)->map(function ($v) { return (int) $v; })->unique()->values()->all();
        } catch (\Throwable $e) {
            $this->rightsDebug['role_error'] = $e->getMessage();
        }
        $this->rightsDebug['role_ids'] = $roleIds;

        // explicit decisions  [path][action] = allow|deny     (action '' = the screen itself)
        $roleDec = [];
        if ($roleIds) {
            foreach ($db->table('app_registry_role_permissions')->whereIn('role_id', $roleIds)->whereIn('resource_id', $ids)->get(['resource_id', 'action_key', 'decision']) as $r) {
                $p = $pathOf[(int) $r->resource_id]; $a = strtolower(trim((string) $r->action_key)); if ($a === 'view') $a = '';
                $d = strtolower((string) $r->decision) === 'allow' ? 'allow' : 'deny';
                if (!isset($roleDec[$p][$a]) || $d === 'deny') $roleDec[$p][$a] = $d;
            }
        }
        $userDec = [];
        foreach ($db->table('app_registry_user_overrides')->where('user_id', $uid)->whereIn('resource_id', $ids)->get(['resource_id', 'action_key', 'decision']) as $r) {
            $p = $pathOf[(int) $r->resource_id]; $a = strtolower(trim((string) $r->action_key)); if ($a === 'view') $a = '';
            $userDec[$p][$a] = strtolower((string) $r->decision) === 'allow' ? 'allow' : 'deny';
        }
        $this->rightsDebug['role_decisions'] = array_sum(array_map('count', $roleDec));
        $this->rightsDebug['user_overrides'] = array_sum(array_map('count', $userDec));

        $dec = function (string $p, string $a) use ($roleDec, $userDec) {
            if (isset($userDec[$p][$a])) return $userDec[$p][$a];
            return $roleDec[$p][$a] ?? null;
        };

        // the banner switch: its own decision only (never inherited from "Mill Hub", never by super admin)
        $this->underDevelopment = $dec(self::UNDER_DEV, '') === 'allow';
        $this->rightsDebug['under_development'] = $this->underDevelopment;

        // 1. screen access: own decision → nearest parent decision. NO super-admin fallback:
        //    every Mill module opens only with a right given in Permission Manager → Mills (same rule as the switch).
        $paths = array_values(array_filter($pathOf, function ($p) { return $p !== self::UNDER_DEV; }));
        usort($paths, function ($x, $y) { return substr_count($x, '.') <=> substr_count($y, '.'); });
        $map = []; $own = []; $denied = [];
        foreach ($paths as $p) {
            $d = $dec($p, '');
            $own[$p] = $d !== null;
            if ($d === 'deny') $denied[$p] = true;
            if ($d === null) {
                $parts = explode('.', $p);
                while (count($parts) > 1 && $d === null) { array_pop($parts); $d = $dec(implode('.', $parts), ''); }
            }
            $map[$p] = ['access' => $d === 'allow', 'actions' => []];
        }
        // 2. a parent opens when a child is allowed (unless denied itself)
        $deep = $paths; usort($deep, function ($x, $y) { return substr_count($y, '.') <=> substr_count($x, '.'); });
        foreach ($deep as $p) {
            if (empty($map[$p]['access'])) continue;
            $parts = explode('.', $p); array_pop($parts);
            while ($parts) { $pp = implode('.', $parts); if (isset($map[$pp]) && !isset($denied[$pp])) $map[$pp]['access'] = true; array_pop($parts); }
        }
        // 3. actions
        foreach ($map as $p => &$g) {
            $g['actions']['view'] = (bool) $g['access'];
            foreach ($actionsOf[$p] ?? [] as $a) {
                $d = $dec($p, $a);
                // explicit action decision wins; none → allowed when the screen right came from a parent (Full Access)
                $g['actions'][$a] = $g['access'] && ($d !== null ? $d === 'allow' : !$own[$p]);
            }
        }
        unset($g);
        return $map;
    }

    private static function anyAccess(array $map): bool
    {
        foreach ($map as $p => $g) if ($p !== 'mill' && !empty($g['access'])) return true;
        return false;
    }

    private static function can(array $map, string $path, string $action = ''): bool
    {
        $p = strtolower(trim($path));
        if (empty($map[$p]['access'])) return false;
        return $action === '' || $action === 'view' ? true : !empty($map[$p]['actions'][strtolower($action)]);
    }

    /* ───────────────────────── data proxy ───────────────────────── */

    public function proxy(Request $request, string $path = ''): JsonResponse
    {
        $action = trim(strtolower($path), '/');
        if (!isset(self::ALLOWED[$action])) {
            return $this->out(false, 'Unknown Mill action: ' . $action, null, 'MILL_UNKNOWN_ACTION');
        }
        [$millPath, $timeout, $right] = self::ALLOWED[$action];

        $sid    = (int) Auth::id();
        $client = MillServerClient::fromController($this);
        if (!$client->isConfigured()) {
            return $this->out(false, 'Mills bridge is not configured on Sudamo (MILL_API_USER / MILL_API_PASSWORD, or the admin login in BaseController).', null, 'MILL_BRIDGE_CONFIG');
        }

        // Mill Hub right of this SUDAMO user (existing permission tables)
        $map = $this->millRights();
        $allowed = true;
        if ($right === '') {
            $allowed = self::anyAccess($map);
        } elseif ($right === '#admin') {
            $allowed = $this->isSudamoSuperAdmin() || (int) Auth::id() === 1;
        } else {
            [$p, $a] = array_pad(explode(':', $right, 2), 2, '');
            $allowed = self::can($map, $p, $a);
        }
        if (!$allowed) {
            return $this->out(false, 'You do not have the Mill Hub right for this screen.', null, 'MILL_NO_RIGHT');
        }

        $payload = $request->except(['password', 'token', 'access_token']);
        $payload['requested_by'] = $sid;
        $payload['source']       = 'sudamo';
        // prpcode + yearno → the Mills middleware (CompressResponseMiddleware → collectDb)
        // opens THIS user's PMD year database, exactly like a normal Mills screen.
        $millPrp = strtoupper((string) (config('mill.prpcode') ?: 'PMD'));
        if (empty($payload['prpcode'])) {
            $payload['prpcode'] = $millPrp;
        }
        if (empty($payload['yearno'])) {
            try {
                $y = (string) DatabaseConnection::get_current_year();
                if ($y !== '') $payload['yearno'] = $y;
            } catch (\Throwable $e) {
                // Mills picks its current year itself
            }
        }

        // data through the Sudamo bridge account (no Mills password of the user)
        $res    = $client->call('POST', $millPath, $payload, $timeout);
        $bridge = ['ms' => $res['ms'] ?? 0, 'http' => $res['http'] ?? 0];

        if (!$res['ok']) {
            return $this->out(false, (string) $res['error'], null, (string) ($res['code'] ?? 'MILL_ERROR'), $bridge);
        }

        $body = $res['body'] ?? [];
        $data = $body['response'] ?? $body['data'] ?? $body;
        $ok   = !array_key_exists('success', $body) || (bool) $body['success'];

        return response()->json([
            'success' => $ok,
            'live'    => $ok && (bool) (is_array($data) ? ($data['live'] ?? true) : true),
            'message' => (string) ($body['message'] ?? ''),
            'code'    => $ok ? null : 'MILL_ERROR',
            'data'    => $data,
            'bridge'  => $bridge,
        ]);
    }

    private function out(bool $ok, string $message, $data = null, ?string $code = null, array $bridge = []): JsonResponse
    {
        return response()->json(['success' => $ok, 'live' => false, 'message' => $message, 'code' => $code, 'data' => $data, 'bridge' => $bridge ?: null]);
    }
}
