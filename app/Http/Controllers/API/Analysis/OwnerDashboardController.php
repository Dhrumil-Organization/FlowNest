<?php

namespace App\Http\Controllers\API\Analysis;

use App\Http\Controllers\API\BaseController;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\DB;
use App\Rules\isvaliddate;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

use App\Helpers\DatabaseConnection;
use App\Classes\Logger;
use App\Services\Dashboard\DashboardSalesCardService;
use App\Services\Dashboard\DashboardProductionCardService;
use App\Services\Dashboard\OwnerDashboardCardReportService;
use App\Services\Dashboard\KnittingOutstandingAsOnService;
use App\Services\Dashboard\PaymentDashboardRules;

/**
 * OwnerDashboardController.php
 * 
 * Handles the main Owner Dashboard API
 * 
 * ENDPOINT: GET /api/dashboard/owner?date=2024-06-04
 * 
 * REQUIRED DB TABLES (replace dummy data with your queries):
 *   - sales_invoices       : bill_date, item_group, amount, sales_exec_id
 *   - production_entries   : prod_date, machine_group, qty_meters
 *   - payment_receipts     : receipt_date, sales_exec_id, amount
 *   - outstanding_ledger   : sales_exec_id, party_id, outstanding_amount
 *   - sales_targets        : sales_exec_id, month, year, target_amount
 *   - sales_executives     : id, name, avatar_color
 *   - item_groups          : id, name
 *   - machine_groups       : id, name
 */

// header('Content-Type: application/json');
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: GET');

class OwnerDashboardController extends BaseController
{

	private const OUTSTANDING_MHEADS = [6];

    private function dashboardOutstandingMHeads(string $prpType): array
    {
        return strtoupper(trim($prpType)) === 'K'
            ? [15]
            : self::OUTSTANDING_MHEADS;
    }
	private const OUTSTANDING_PAR_TYPES = ['CUS'];

    public function getDashboard(Request $request)
    {
        //$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

        //$date  = intval($this->get_value($request, "date"));

        $date = $this->format_date($this->get_value($request, "date"), "Ymd");

        // DB Connection
        $user = Auth::user();

        /*
         * Resolve the card-report intent BEFORE applying Owner Dashboard
         * authority. The same route is intentionally reused by the
         * Sales / Collection / Outstanding drill-down screens.
         *
         * OWNER DASHBOARD vs MY VIEW
         * -------------------------
         * Owner Dashboard (dashboard + its card drill-downs) is governed ONLY
         * by permissions. The Sales Executive mapping (users.saleexeid) plays
         * no part in it: no permission => 403, even for a mapped executive.
         *
         * My View is the only place where users.saleexeid matters. The client
         * opts in with view=my, and the scope is then locked server-side to
         * the logged-in user's own saleexeid. Request parameters can never
         * widen or replace that scope.
         */
        $reportType = strtolower(trim((string) $this->get_value($request, "report_type")));
        $isCardReport = $reportType !== '';
        $isMyView = $isCardReport
            && strtolower(trim((string) $this->get_value($request, "view"))) === 'my';
        $requestedYearNo = intval($this->get_value($request, "yearno"));

        /*
         * Owner Dashboard authority.
         * Director and Super Admin are both owner-level dashboard authorities.
         * Normal users remain My-View-only.
         */
        $userId = (int) ($user->id ?? 0);

        /*
         * Resolve the same effective grants returned in app_session.
         * This includes role permissions and per-user overrides, so future
         * users need no controller edits or Sales Executive mapping.
         * Fail closed when the registry is unavailable.
         */
        /*
         * PERMISSION MODEL
         * ----------------
         * Super Admin : everything visible by default; hidden ONLY when a
         *               specific permission is explicitly removed (role DENY
         *               on the SuperAdmin role, or a per-user DENY override).
         * Director    : same as Super Admin (allow-by-default, explicit DENY).
         * Everyone else: nothing visible unless explicitly ALLOWED.
         *
         * Privileged status comes from the user flags OR from an assigned
         * SuperAdmin / Director role in GENRoles.
         */
        $access = new \App\Services\AppAccessResolver();
        $registryReady = $user ? $access->isReady() : false;

        $isSuperAdmin = (bool) ($user && (
            // Keep this identical to PermissionProvider/AppAccessController:
            // any non-zero is_superadmin flag is privileged.
            (isset($user->is_superadmin) && (int) $user->is_superadmin !== 0)
            || ($userId === (int) $this->ADMIN_USER_ID)
            || ($registryReady && $access->hasSuperAdminRole($userId))
        ));
        $isDirector = (bool) ($user && (
            (isset($user->is_director) && (int) $user->is_director === 1)
            || ($registryReady && $access->hasDirectorRole($userId))
        ));
        $isPrivileged = $isSuperAdmin || $isDirector;

        $dashboardGrants = $registryReady
            ? $access->permissionMap($userId, $isSuperAdmin, $isDirector)
            : [];

        $canView = static function (string $path) use ($dashboardGrants, $isPrivileged, $registryReady): bool {
            $path = strtolower(trim($path));

            // Registry unavailable: privileged keep full access, others fail closed.
            if (!$registryReady) {
                return $isPrivileged;
            }

            // The path AND every registered parent must be visible, so removing
            // a parent tab (e.g. "dashboard") hides all of its cards too.
            $node = '';
            foreach (explode('.', $path) as $part) {
                $node = $node === '' ? $part : $node . '.' . $part;

                if (!array_key_exists($node, $dashboardGrants)) {
                    // Resource not registered yet: privileged users still see
                    // it (nothing has been removed); ordinary users do not.
                    if ($node === $path && !$isPrivileged) {
                        return false;
                    }
                    continue;
                }

                $grant = $dashboardGrants[$node];

                /*
                 * VIEW SEMANTICS MUST MATCH PermissionProvider.tsx.
                 *
                 * The permission registry stores the resource decision separately
                 * from optional action decisions. Many dashboard resources have
                 * no dedicated `view` action row at all (their actions list is
                 * intentionally empty). In that valid case, resource ALLOW means
                 * the resource is viewable.
                 *
                 * Therefore:
                 *   access=false                    => DENY
                 *   access=true + explicit view=false => DENY
                 *   access=true + no view action       => ALLOW
                 *   access=true + view=true            => ALLOW
                 *
                 * The old code used empty(actions.view), which incorrectly
                 * denied resources whose access was explicitly allowed but whose
                 * view action was simply absent. Outstanding Detail is one such
                 * card in affected permission snapshots.
                 */
                if (empty($grant['access'])) {
                    return false;
                }

                $actions = isset($grant['actions']) && is_array($grant['actions'])
                    ? $grant['actions']
                    : [];

                if (array_key_exists('view', $actions) && empty($actions['view'])) {
                    return false;
                }
            }

            return true;
        };

        $canProduction = $canView('dashboard.production_detail');
        $canSales = $canView('dashboard.sales_detail');
        $canCollection = $canView('dashboard.collection_detail');
        $canOutstanding = $canView('dashboard.outstanding_detail');
        $canPayment = $canView('dashboard.payment_detail');
        $isProductionReport = in_array($reportType, ['production_full', 'beam_status', 'beam_shortage'], true);

        // Owner View is a tab permission, not a blanket grant to every card.
        // Card access is independent of Sales Executive, Director and Owner View.
        $canAnyCard = $canProduction || $canSales || $canCollection || $canOutstanding || $canPayment || $canView('dashboard.costing_summary');
        // Owner View is available when at least one individual card is permitted.
        $canOwnerView = $canAnyCard;
        $loggedInExecutiveCode = $user ? trim((string) ($user->saleexeid ?? '')) : '';

        if (!$user) {
            return response()->json(['success' => false, 'code' => 'UNAUTHENTICATED', 'message' => 'Authentication required.'], 401);
        }
        if ($isProductionReport) {
            // Production Detail allows its own full-production drilldown. Other
            // report types retain their independent report permissions.
            $reportPermissionMap = [
                'production_full' => 'reports.production_report.daily_production',
                'beam_status' => 'reports.production_report.beam_status',
                'beam_shortage' => 'reports.production_report.beam_shortage',
            ];
            $reportAllowed = isset($reportPermissionMap[$reportType])
                && ($canView($reportPermissionMap[$reportType])
                    || ($reportType === 'production_full' && $canProduction));
            if (!$reportAllowed) {
                return response()->json(['success' => false, 'code' => 'REPORT_VIEW_NOT_ALLOWED', 'message' => 'Report view permission required.'], 403);
            }
        } elseif (!$isCardReport) {
            if (!$canOwnerView) {
                return response()->json(['success' => false, 'code' => 'OWNER_DASHBOARD_AUTHORITY_REQUIRED', 'message' => 'Dashboard view permission required.'], 403);
            }
        } else {
            $cardPermissions = [
                'sales' => $canSales,
                'fy_sales' => $canSales,
                'fy_production' => $canProduction,
                'fy_outstanding' => $canOutstanding,
                'collection' => $canCollection,
                'outstanding' => $canOutstanding,
                'payment' => $canPayment,
            ];
            if (!array_key_exists($reportType, $cardPermissions)) {
                return response()->json(['success' => false, 'code' => 'INVALID_CARD_REPORT', 'message' => 'Unsupported dashboard card report.'], 422);
            }
            if ($isMyView) {
                // My View: scope is the logged-in user's own Sales Executive only.
                if ($reportType === 'payment' || $loggedInExecutiveCode === '' || $loggedInExecutiveCode === '0') {
                    return response()->json(['success' => false, 'code' => 'MY_VIEW_NOT_AVAILABLE', 'message' => 'My View requires a Sales Executive mapping.'], 403);
                }
                $requestedExecutiveCode = trim((string) $this->get_value($request, 'executive_code'));
                if ($requestedExecutiveCode !== '' && $requestedExecutiveCode !== $loggedInExecutiveCode) {
                    return response()->json(['success' => false, 'code' => 'MY_VIEW_EXECUTIVE_SCOPE_VIOLATION', 'message' => 'My View cannot access another Sales Executive.'], 403);
                }
            } elseif (!$cardPermissions[$reportType]) {
                // Owner Dashboard drill-down: permission only, no Sales Executive fallback.
                return response()->json(['success' => false, 'code' => 'CARD_VIEW_NOT_ALLOWED', 'message' => 'Card view permission required.'], 403);
            }
        }

        /*
         * Card reports are date-driven. This is critical for the six-month
         * drill-down because the chip list can cross the financial-year
         * boundary (for example Aug-26 -> Mar-26). A stale login YearNo must
         * never keep Mar-26 connected to the 2026-27 database.
         */

        if ($isCardReport) {
            $fdate = $this->format_date($date, "Ymd");
            $yearRows = $this->get_year_nos($fdate, $fdate);
            $yearno = isset($yearRows[0]['YearNo'])
                ? intval($yearRows[0]['YearNo'])
                : 0;

            if ($yearno === 0) {
                throw new \RuntimeException(
                    'Unable to resolve financial year for dashboard report date ' . $fdate . '.'
                );
            }
        } else {
            $yearno = $requestedYearNo;

            if (intval($yearno) == 0) {
                $fdate  = $this->format_date($date, "Ymd");
                $yearRows = $this->get_year_nos($fdate, $fdate);
                $yearno = isset($yearRows[0]['YearNo'])
                    ? intval($yearRows[0]['YearNo'])
                    : 0;
            }
        }

    	$prpcode = "";
        $prptype = $this->get_value($request, "prptype");
    	
        if (trim($prptype) != '') {
            /*
             * Owner Dashboard has no PrpCode selector. Card drill-downs must
             * therefore always use every property belonging to the selected
             * PrpType and must not be narrowed by a hidden request context.
             */
            if ($isCardReport) {
                $prpcodes = $this->rpthelp()->_get_prp_from_prp_grp($prptype);
            } else {
                $prpcodes = array_filter((array) $this->get_value($request, "prpcodes"));
                if (!(!is_null($prpcodes) && count($prpcodes) > 0)) {
                    $prpcodes = $this->rpthelp()->_get_prp_from_prp_grp($prptype);
                }
            }
        	
            $prpcodes = array_filter($prpcodes);
            $dbconfig = $this->get_prp_db_config($user, $prpcodes[0], $yearno);
            $dbconfig = base64_decode($dbconfig);
            DatabaseConnection::setDbConnectionUsingConfig($dbconfig, __FUNCTION__ . $user->id);
        	$prpcode = $prpcodes[0];
        }
    	
    	$db = DB::Connection()->getDatabaseName() . ".dbo.";
    	
    	$ldb = DatabaseConnection::get_year_db($prpcodes[0], ($yearno - 1), $user); /* SIA20252026.dbo. */
        $ldb = $ldb . ".dbo.";
    
    	$fdb = DatabaseConnection::get_year_db($prpcodes[0], ($yearno + 1), $user);
        if ($fdb != "") {
            $fdb = $fdb . ".dbo.";
        }
        // DB Connection
    
    	// strcode
    	$strcode = '002';
    	if ($prptype == 'S') {
        	$strcode_qry = DB::table('gendefaults')
            			->whereraw("DNo=34")
            			->whereraw("PrpCode='".$prpcode."'")
            			->select(DB::raw("dvalue"))
            			->distinct()->pluck("dvalue")->toArray();
        	
        	if (count($strcode_qry)>0) {
            	$strcode = $strcode_qry[0];
            }
        }    	
    	// strcode

        /*
         * Dashboard sales-store scope.
         * Sudamo keeps its proven existing single-store behaviour untouched.
         * Knitting uses the equivalent unpadded store codes: 002 -> 2, 012 -> 5.
         */
        $salesStrCodes = strtoupper(trim((string) $prptype)) === 'K'
            ? ['2', '5']
            : [(string) $strcode];

        // Calculate month start for MTD
        $monthStart = date('Ym01', strtotime($date));

        /*
         * CARD-SPECIFIC FULL REPORT / DRILL-DOWN
         * ---------------------------------------
         * Reuses the existing getOwnerDashboard route so no route change is
         * required. Normal dashboard requests do not enter this branch.
         */
        // Claude Beam Status: same authenticated Owner report endpoint,
        // same PrpType -> allowed PrpCodes and financial-year database context.
        // No public route, no alternate property connection, no permission bypass.
        // FY card reports reuse the audited FY methods on the existing card services.
        // Never pass them to OwnerDashboardCardReportService (different response contract).
        if ($reportType === 'fy_outstanding') {
            // Current ledger balance only. Never claim historical month-end
            // balances from FamAcc.ClBal, which is not an as-on snapshot.
            $todayYmd = (int) date('Ymd');
            $requestedYmd = (int) preg_replace('/[^0-9]/', '', (string) $date);
            $isToday = $requestedYmd === $todayYmd;
            $snapshot = $isToday
                ? $this->getOutstandingData($prpcodes, $prptype, $salesStrCodes, $requestedYmd)
                : null;

            return response()->json([
                'success' => true,
                'data' => ['report' => [
                    'metric' => 'outstanding',
                    'as_on_date' => $requestedYmd,
                    'historical_supported' => false,
                    'status' => $isToday ? 'current_account_balance' : 'historical_not_verified',
                    'total_due' => $snapshot !== null ? $snapshot['total_due'] : null,
                    'by_exec' => $snapshot !== null ? $snapshot['by_exec'] : [],
                    'message' => $isToday ? null :
                        'Historical outstanding requires reconciled ERP settlement transactions.',
                ]],
            ]);
        }

        if ($reportType === 'fy_sales' || $reportType === 'fy_production') {
            $rawFrom = preg_replace('/[^0-9]/', '', (string) $this->get_value($request, 'from_date'));
            $rawTo = preg_replace('/[^0-9]/', '', (string) $this->get_value($request, 'to_date'));
            $rawStage = preg_replace('/[^0-9]/', '', (string) $this->get_value($request, 'stage_to_date'));
            $valid = static function ($value) {
                if (!preg_match('/^[0-9]{8}$/', (string) $value)) return false;
                $d = \DateTimeImmutable::createFromFormat('!Ymd', (string) $value);
                return $d !== false && $d->format('Ymd') === (string) $value;
            };
            if (!$valid($rawFrom) || !$valid($rawTo) || $rawFrom > $rawTo ||
                ($rawStage !== '' && (!$valid($rawStage) || $rawStage < $rawFrom || $rawStage > $rawTo))) {
                return response()->json(['success' => false, 'message' => 'Invalid FY date range.'], 422);
            }
            $from = (int) $rawFrom;
            $to = (int) $rawTo;
            $stage = $rawStage !== '' ? (int) $rawStage : $to;
            $start = \DateTimeImmutable::createFromFormat('!Ymd', $rawFrom);
            $end = \DateTimeImmutable::createFromFormat('!Ymd', $rawTo);
            // Each request must stay in a single Apr-Mar FY and start on April 1.
            $fyStartYear = (int) $start->format('n') >= 4 ? (int) $start->format('Y') : (int) $start->format('Y') - 1;
            $fyStart = sprintf('%04d0401', $fyStartYear);
            $fyEnd = sprintf('%04d0331', $fyStartYear + 1);
            if ($rawFrom !== $fyStart || $rawTo > $fyEnd) {
                return response()->json(['success' => false, 'message' => 'FY period must begin on April 1 and end within the same financial year.'], 422);
            }
            // Existing date-based connection above was resolved using request date;
            // FY requests must use the selected FY, never a stale dashboard date.
            $fyRows = $this->get_year_nos($rawFrom, $rawFrom);
            $fyYearNo = isset($fyRows[0]['YearNo']) ? (int) $fyRows[0]['YearNo'] : 0;
            if ($fyYearNo <= 0 || !$prpcodes) {
                return response()->json(['success' => false, 'message' => 'Financial-year property database unavailable.'], 422);
            }
            try {
                $connectFy = function ($targetYearNo) use ($user, $prpcodes) {
                    $config = $this->get_prp_db_config($user, $prpcodes[0], $targetYearNo);
                    if (!$config) throw new \RuntimeException('Financial-year database configuration missing.');
                    DatabaseConnection::setDbConnectionUsingConfig(base64_decode($config), __FUNCTION__ . $user->id);
                };
                $connectFy($fyYearNo);
                $sales = $reportType === 'fy_sales';
                $service = $sales ? app(DashboardSalesCardService::class) : app(DashboardProductionCardService::class);
                $drilldown = (int) $this->get_value($request, 'drilldown') === 1;
                if ($drilldown) {
                    $dimension = strtolower(trim((string) $this->get_value($request, 'dimension')));
                    $filters = [];
                    foreach (['executive', 'party', 'category', 'design', 'shed'] as $key) {
                        $filters[$key] = trim((string) $this->get_value($request, $key . '_code'));
                    }
                    $current = $sales
                        ? $service->buildFinancialYearDrilldown($from, $to, $salesStrCodes, array_values($prpcodes), $dimension, $filters)
                        : $service->buildFinancialYearDrilldown($from, $to, strtoupper(trim((string) $prptype)), $dimension, $filters);
                    return response()->json(['success' => true, 'data' => ['drilldown' => ['current' => $current, 'previous' => null, 'dimension' => $dimension]]]);
                }
                $includeDetails = (int) $this->get_value($request, 'include_details') === 1;
                $report = $sales
                    ? $service->buildFinancialYear($from, $to, $salesStrCodes, array_values($prpcodes), $includeDetails, $stage)
                    : $service->buildFinancialYear($from, $to, strtoupper(trim((string) $prptype)), $stage);
                $comparisons = [];
                if ((int) $this->get_value($request, 'include_comparisons') === 1) {
                    for ($offset = 1; $offset <= 2; $offset++) {
                        $previousStart = $start->modify('-' . $offset . ' years');
                        $previousEnd = $end->modify('-' . $offset . ' years');
                        $previousStage = \DateTimeImmutable::createFromFormat('!Ymd', (string) $stage)->modify('-' . $offset . ' years');
                        $connectFy($fyYearNo - $offset);
                        $comparison = $sales
                            ? $service->buildFinancialYear((int) $previousStart->format('Ymd'), (int) $previousEnd->format('Ymd'), $salesStrCodes, array_values($prpcodes), false, (int) $previousStage->format('Ymd'))
                            : $service->buildFinancialYear((int) $previousStart->format('Ymd'), (int) $previousEnd->format('Ymd'), strtoupper(trim((string) $prptype)), (int) $previousStage->format('Ymd'));
                        $comparisons[] = $comparison;
                    }
                }
                return response()->json(['success' => true, 'data' => ['report' => $report, 'comparisons' => $comparisons]]);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('FY dashboard report failed', ['report_type' => $reportType, 'user_id' => (int) $user->id, 'error' => $e->getMessage()]);
                return response()->json(['success' => false, 'message' => 'Unable to load financial-year report.'], 500);
            }
        }

        if ($reportType === 'beam_status') {
            try {
                $report = app(\App\Services\Dashboard\BeamStatusReportService::class)
                    ->build((int) $date, array_values($prpcodes), (int) $yearno);
                return response()->json(['success' => true, 'data' => ['report' => $report]]);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('beam_status report failed', [
                    'error' => $e->getMessage(), 'date' => $date,
                    'user_id' => (int) ($user->id ?? 0),
                ]);
                return response()->json(['success' => false,
                    'message' => 'Beam Status report failed; inspect Laravel beam_status report failed log.'], 500);
            }
        }

        // Read-only Beam Shortage report: reuse Owner authorization and the
        // financial-year/property connection already established above.
        if ($reportType === 'beam_shortage') {
            $rawFrom = trim((string) $this->get_value($request, 'from_date'));
            $rawTo = trim((string) $this->get_value($request, 'to_date'));
            $fromText = preg_replace('/[^0-9]/', '', $rawFrom);
            $toText = $rawTo !== ''
                ? preg_replace('/[^0-9]/', '', $rawTo)
                : preg_replace('/[^0-9]/', '', (string) $date);

            // Never turn malformed dates into a different date silently.
            $validYmd = static function ($text) {
                if (!preg_match('/^[0-9]{8}$/', $text)) return false;
                $dt = \DateTimeImmutable::createFromFormat('!Ymd', $text);
                return $dt !== false && $dt->format('Ymd') === $text;
            };
            if (!$validYmd($fromText) || !$validYmd($toText) || $fromText > $toText) {
                return response()->json([
                    'success' => false,
                    'message' => 'Valid from_date and to_date are required (YYYYMMDD or YYYY-MM-DD).',
                ], 422);
            }
            try {
                $report = app(\App\Services\Dashboard\BeamShortageReportService::class)
                    ->build((int) $fromText, (int) $toText, array_values($prpcodes), (int) $yearno);
                return response()->json(['success' => true, 'data' => ['report' => $report]]);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('beam_shortage report failed', [
                    'error' => $e->getMessage(),
                    'from_date' => $fromText,
                    'to_date' => $toText,
                    'user_id' => (int) ($user->id ?? 0),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Unable to load Beam Shortage report.',
                ], 500);
            }
        }

        if ($reportType === 'production_full') {
            $from = (int) preg_replace('/[^0-9]/', '', (string) $this->get_value($request, 'from_date'));
            $to = (int) preg_replace('/[^0-9]/', '', (string) $this->get_value($request, 'to_date'));
            $processRaw = trim((string) $this->get_value($request, 'process_uid'));
            if ($processRaw !== '' && !ctype_digit($processRaw)) {
                return response()->json(['success' => false, 'message' => 'Invalid process UID'], 422);
            }
            try {
                $report = app(\App\Services\Dashboard\ProductionFullReportService::class)
                    ->build($from, $to, $processRaw !== '' ? (int) $processRaw : null, $prpcodes,
                        $processRaw !== '' ? trim((string) $this->get_value($request, 'process_property')) : null);
                return response()->json(['success' => true, 'data' => ['report' => $report]]);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('production_full report failed', [
                    'error' => $e->getMessage(),
                    'from_date' => $from,
                    'to_date' => $to,
                    'user_id' => (int) ($user->id ?? 0),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Production report query failed. Check Laravel production_full report failed log entry.',
                ], 500);
            }
        }

        if ($isCardReport) {
            /** @var OwnerDashboardCardReportService $cardReport */
            $cardReport = app(OwnerDashboardCardReportService::class);

            $defaultLevel = $reportType === 'sales'
                ? 'categories'
                : ($reportType === 'payment' ? 'parties' : 'executives');

            $reportLevel = strtolower(trim(
                (string) $this->get_value($request, 'report_level')
            ));

            /*
             * React drill-down screens use the shorter `level` key. Keep
             * `report_level` as a backward-compatible alias so both contracts
             * remain valid without adding another route.
             */
            if ($reportLevel === '') {
                $reportLevel = strtolower(trim(
                    (string) $this->get_value($request, 'level')
                ));
            }

            if ($reportLevel === '') {
                $reportLevel = $defaultLevel;
            }

            /*
             * Owner Dashboard: any executive filter the client asks for (the
             * user already passed the card permission check).
             * My View: always forced to the logged-in users.saleexeid, even
             * when the client omits executive_code.
             */
            $effectiveExecutiveCode = $isMyView
                ? $loggedInExecutiveCode
                : $this->get_value($request, 'executive_code');

            $filters = [
                'category_code' => $this->get_value($request, 'category_code'),
                'category_name' => $this->get_value($request, 'category_name'),
                'executive_code' => $effectiveExecutiveCode,
                'executive_name' => $this->get_value($request, 'executive_name'),
                'party_code' => $this->get_value($request, 'party_code'),
                'party_name' => $this->get_value($request, 'party_name'),
                /* Payment drill-down identity: PrpCode + Party, then UId + SrNo. */
                'prp_code' => trim((string) $this->get_value($request, 'prp_code')) !== ''
                    ? $this->get_value($request, 'prp_code')
                    : $this->get_value($request, 'prpcode'),
                'payment_srno' => trim((string) $this->get_value($request, 'payment_srno')) !== ''
                    ? $this->get_value($request, 'payment_srno')
                    : $this->get_value($request, 'srno'),
                'design_code' => $this->get_value($request, 'design_code'),
                'design_name' => $this->get_value($request, 'design_name'),
                'document_uid' => $this->get_value($request, 'document_uid'),
                'document_no' => $this->get_value($request, 'document_no'),
                'expected_amount' => $this->get_value($request, 'expected_amount'),
                'expected_qty' => $this->get_value($request, 'expected_qty'),
                'expected_generated_at' => $this->get_value($request, 'expected_generated_at'),
            ];

            try {
                $report = $cardReport->build(
                    $reportType,
                    $reportLevel,
                    (int) $date,
                    (int) $monthStart,
                    (string) $strcode,
                    (string) $ldb,
                    $filters,
                    array_values($prpcodes),
                    strtoupper(trim((string) $prptype)),
                    $salesStrCodes
                );

                return json_encode([
                    'success' => true,
                    'date' => $date,
                    'data' => [
                        'report' => $report,
                        'resolved_context' => [
                            'report_type' => $reportType,
                            'yearno' => $yearno,
                            'requested_yearno' => $requestedYearNo,
                            'date_driven_year' => true,
                            'database' => DB::Connection()->getDatabaseName(),
                            'strcode' => $strcode,
                            'sales_strcodes' => $salesStrCodes,
                            'prpcodes' => array_values($prpcodes),
                        ],
                    ],
                ]);
            } catch (\Throwable $e) {
                Logger::info([
                    'report_type' => $reportType,
                    'report_level' => $reportLevel,
                    'message' => $e->getMessage(),
                ], __FUNCTION__ . '-owner-card-report-error');

                return json_encode([
                    'success' => false,
                    'date' => $date,
                    'message' => 'Unable to load dashboard card report.',
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // return $this->getOutstandingData($date, $monthStart);

        // Keep the existing response keys. Do not execute or return data from
        // cards that the authenticated user has not been granted.
        // A card the user may not see is never null: it is an empty card with
        // the same shape and permitted=false, so no client can crash on it.
        // No business data is queried or returned for it.
        $cardData = [
            'sales' => $canSales
                ? $this->getSalesData($date, $monthStart, $salesStrCodes, array_values($prpcodes))
                : $this->emptyCard('sales', (int) $date, (int) $monthStart),
            'production' => $canProduction
                ? $this->getProductionData($date, $monthStart, $prptype)
                : $this->emptyCard('production', (int) $date, (int) $monthStart),
            'collection' => $canCollection
                ? $this->getCollectionData($date, $monthStart, $ldb, $prptype, array_values($prpcodes))
                : $this->emptyCard('collection', (int) $date, (int) $monthStart),
            'payment' => $canPayment
                ? $this->getPaymentData($date, $prptype, array_values($prpcodes))
                : $this->emptyCard('payment', (int) $date, (int) $monthStart),
            'outstanding' => $canOutstanding
                ? $this->getOutstandingData($prpcodes, $prptype, $salesStrCodes, (int) $date)
                : $this->emptyCard('outstanding', (int) $date, (int) $monthStart),
        ];
        foreach (['sales' => $canSales, 'production' => $canProduction, 'collection' => $canCollection,
                  'payment' => $canPayment, 'outstanding' => $canOutstanding] as $cardKey => $allowed) {
            if ($allowed && is_array($cardData[$cardKey])) {
                $cardData[$cardKey]['permitted'] = true;
            }
        }
        if (intval($this->get_value($request, 'testing')) === 1 && $canSales) {
            $cardData['sales_testing'] = $this->getSalesTestingData($date, $monthStart, $strcode);
        }
        $response = ['success' => true, 'date' => $date, 'data' => $cardData];

        /*
         * Tells the UI (and anyone debugging) WHY a card is null: a card that
         * is null because permission was removed should be hidden, not shown
         * as "could not be displayed".
         */
        $response['permissions'] = [
            'is_super_admin' => $isSuperAdmin,
            'is_director' => $isDirector,
            'registry_ready' => $registryReady,
            'cards' => [
                'sales' => $canSales,
                'production' => $canProduction,
                'collection' => $canCollection,
                'payment' => $canPayment,
                'outstanding' => $canOutstanding,
            ],
        ];

        // TEMPORARY read-only diagnostic: written to storage/logs on every
        // Owner Dashboard load. Remove once the permission issue is fixed.
        if (true) {
            $response['permissions']['user_flags'] = [
                'user_id' => $userId,
                'is_superadmin' => $user->is_superadmin ?? null,
                'super_admin_value' => $this->super_admin_value ?? null,
                'is_director' => $user->is_director ?? null,
            ];
            $response['permissions']['explain'] = $access->explain($userId, [
                'dashboard',
                'dashboard.sales_detail',
                'dashboard.production_detail',
                'dashboard.collection_detail',
                'dashboard.payment_detail',
                'dashboard.outstanding_detail',
            ]);
            $response['permissions']['computed_grants'] = array_intersect_key(
                $dashboardGrants,
                array_flip([
                    'dashboard',
                    'dashboard.sales_detail',
                    'dashboard.production_detail',
                    'dashboard.collection_detail',
                    'dashboard.payment_detail',
                    'dashboard.outstanding_detail',
                ])
            );

            \Illuminate\Support\Facades\Log::info(
                'OWNER_DASHBOARD_PERM_DEBUG ' . json_encode($response['permissions'])
            );

            // Keep the API response small: only expose details when asked.
            if (intval($this->get_value($request, 'debug_perm')) !== 1) {
                unset(
                    $response['permissions']['user_flags'],
                    $response['permissions']['explain'],
                    $response['permissions']['computed_grants']
                );
            }
        }

        return json_encode($response);
        //echo json_encode($response);
    }

    /**
     * SALES SECTION
     * 
     * JSON Shape:
     * {
     *   "total": { "today": 1900000, "mtd": 15200000 },
     *   "daily_trend": [
     *     { "day": "1", "amount": 450000 },
     *     ...30 items for the month
     *   ],
     *   "by_category": [
     *     { "name": "Linen Shirting", "today": 510000, "mtd": 11300000, "trend": "up" },
     *     ...
     *   ]
     * }
     * 
     * REPLACE WITH:
     *   SELECT item_group, SUM(amount) as today FROM sales_invoices 
     *   WHERE bill_date = '$date' GROUP BY item_group
     *   
     *   SELECT item_group, SUM(amount) as mtd FROM sales_invoices 
     *   WHERE bill_date BETWEEN '$monthStart' AND '$date' GROUP BY item_group
     */
    private function getSalesData($date, $monthStart, $strcode, array $prpcodes = [])
    {
        /** @var DashboardSalesCardService $salesCard */
        $salesCard = app(DashboardSalesCardService::class);

        return $salesCard->build(
            (int) $date,
            (int) $monthStart,
            $strcode,
            $prpcodes
        );
    }

	private function getSalesTestingData($date, $monthStart, $strcode)
    {
        //$today      = (int) date('Ymd');
        // $monthStart = (int) date('Ym01');
        // $monthEnd   = (int) date('Ymt');
    
    	Logger::info($date."|".$monthStart."|".$strcode, __FUNCTION__.'-owner-sales');

        // Total Sales
        $total = DB::table('FAMSali')
            ->selectRaw("
                SUM(CASE WHEN BillDate = ?
                         THEN NetAmt ELSE 0 END) AS today,
    
                SUM(CASE WHEN BillDate BETWEEN ? AND ?
                         THEN NetAmt ELSE 0 END) AS mtd
            ", [$date, $monthStart, $date])
        ->whereraw("StrCode = '".$strcode."'")
            ->first();

        // Daily Trend
        $dailyTrend = DB::table('FAMSali')
            ->selectRaw("
                RIGHT(CAST(BillDate AS VARCHAR(8)),2) AS day,
                SUM(NetAmt) AS amount
            ")
            ->whereBetween('BillDate', [$monthStart, $date])
            // ->where('StrCode','012')
        	->whereraw("StrCode = '".$strcode."'")
            ->groupByRaw("RIGHT(CAST(BillDate AS VARCHAR(8)),2)")
            ->orderBy('day')
            ->get()
            ->map(function ($row) {
                return [
                    'day'    => ltrim($row->day, '0'),
                    'amount' => (float) $row->amount
                ];
            });

        // Item / Category Wise
    
    	/*
        $byCategory = DB::table('FAMSali as H')
            ->join('FamSaliD1 as D', 'H.UID', '=', 'D.UID')

            ->join("FAMItem as I", function ($join) {
                $join->on('I.ItmCode', '=', 'D.ItmCode')
                    ->on('I.prpcode', '=', 'H.prpcode')
                    ->on('I.strcode', '=', 'D.StrCode');
            })

            ->join("DAPDesign as dsn", function ($join) {
                $join->on('dsn.prpcode', '=', 'H.prpcode')                    
                    ->on('dsn.dsncode', '=', 'D.dsncode');
            })

            ->join("FAMAcc as par", function ($join) {
                $join->on('par.prpcode', '=', 'H.prpcode')                    
                    ->on('par.acccode', '=', 'H.parcode');
            })

                // // Outer Apply
                // Outer APPLY (
                // select 
                // CASE
                // WHEN ISNULL(so.sexe,'') <> ''
                // THEN so.sexe
                // ELSE gs.sexe
                // END as sexe
                // from
                // famsalid1 as sid1
                // left join famsali as si on si.uid = sid1.uid
                // left join famsald1 as sld1 on sld1.uid = sid1.suid and sld1.srno = sid1.ssrno  
                // left join famsod1 as sod1 on sod1.uid = sld1.souid and sod1.srno = sld1.sosrno 
                // left join famso as so on so.uid = sod1.uid 			
                // left join FAMAcc as party on party.PrpCode = si.PrpCode AND party.AccCode = si.ParCode			
                // LEFT JOIN GENSEXE as gs ON gs.PrpCode = party.PrpCode AND gs.SExe = party.SExe AND gs.Status <> 'P'			
                // WHERE 
                // si.PrpCode = H.PrpCode and sid1.uid=D.uid and sid1.srno=D.srno --AND si.ParCode = H.ParCode			
                // ) SexeData
                // // Outer Apply

            ->join("GENSEXE as gsnm", function ($join) {
                $join->on('gsnm.PrpCode', '=', 'H.PrpCode')
                    ->on('gsnm.SExe', '=', 'SexeData.sexe')
                    ->on('gsnm.Status', '<>', DB::raw("'P'"));
            })

            ->selectRaw("
                I.ItmName AS name, isnull(dsn.DsnName,'') as dsnname, isnull(par.AccName,'') as parname,
                        SexeData.sexe as sexe, gsnm.lngname as sexename,

                SUM(CASE WHEN H.BillDate = ?
                         THEN D.D1netAmt ELSE 0 END) AS today,

                         SUM(CASE WHEN H.BillDate = ?
                         THEN D.qty ELSE 0 END) AS todayqty,

                SUM(CASE WHEN H.BillDate BETWEEN ? AND ?
                         THEN D.d1netAmt ELSE 0 END) AS mtd,

                         SUM(CASE WHEN H.BillDate BETWEEN ? AND ?
                         THEN D.qty ELSE 0 END) AS mtdqty

            ", [$date, $date, $monthStart, $date, $monthStart, $date])
            // ->where('D.StrCode','012')
            ->whereraw("D.StrCode = '".$strcode."'")
            ->groupBy('I.ItmName', 'dsn.DsnName', 'par.AccName', 'SexeData.sexe', 'gsnm.lngname')
            ->orderByDesc('mtd')
            ->limit(10)

        //;

        //Logger::info($byCategory->toRawSql(), __FUNCTION__.'-owner-sales');

        //$byCategory = $byCategory

            ->get()
            ->map(function ($row) {

                return [
                    'name'  => $row->name,

                    'dsnname'  => $row->dsnname,
                    'parname'  => $row->parname,
                    'sexe'     => $row->sexe,
                    'sexename' => $row->sexename,

                    'today' => (float) $row->today,
                    'mtd'   => (float) $row->mtd,
                    'todayqty' => (float) $row->todayqty,
                    'mtdqty'   => (float) $row->mtdqty,
                    'trend' => $row->today > 0 ? 'up' : 'down'
                ];
            });
        */    
    
    	$byCategoryqry = "SELECT 	
    							I.ItmName AS name, isnull(dsn.DsnName,'') as dsnname, isnull(par.AccName,'') as parname,
    							SexeData.sexe as sexe, gsnm.lngname as sexename,
    							SUM(CASE WHEN H.BillDate = ? THEN D.D1netAmt ELSE 0 END) AS today,
    							SUM(CASE WHEN H.BillDate = ? THEN D.Qty ELSE 0 END) AS todayqty,
    							SUM(CASE WHEN H.BillDate BETWEEN ? AND ? THEN D.D1netAmt ELSE 0 END) AS mtd,
    							SUM(CASE WHEN H.BillDate BETWEEN ? AND ? THEN D.Qty ELSE 0 END) AS mtdqty 
						FROM 
							FAMSali H
							INNER JOIN FamSaliD1 D ON H.UID = D.UID
							INNER JOIN FAMItem I ON I.ItmCode = D.ItmCode AND I.PrpCode = H.PrpCode AND I.StrCode = D.StrCode
							LEFT JOIN DAPDesign dsn ON dsn.prpcode = H.prpcode and dsn.dsncode = D.DsnCode
							LEFT JOIN FAMAcc par ON par.prpcode = H.prpcode and par.acccode = H.parcode 	
							Outer APPLY (
								select 
									CASE
                						WHEN ISNULL(so.sexe,'') <> ''
                        						THEN so.sexe
                						ELSE gs.sexe
            						END as sexe
								from
									famsalid1 as sid1
									left join famsali as si on si.uid = sid1.uid
									left join famsald1 as sld1 on sld1.uid = sid1.suid and sld1.srno = sid1.ssrno  
									left join famsod1 as sod1 on sod1.uid = sld1.souid and sod1.srno = sld1.sosrno 
									left join famso as so on so.uid = sod1.uid 			
									left join FAMAcc as party on party.PrpCode = si.PrpCode AND party.AccCode = si.ParCode			
									LEFT JOIN GENSEXE as gs ON gs.PrpCode = party.PrpCode AND gs.SExe = party.SExe AND gs.Status <> 'P'			
								WHERE 
									si.PrpCode = H.PrpCode and sid1.uid=D.uid and sid1.srno=D.srno 
							) SexeData
							LEFT JOIN GENSEXE as gsnm ON gsnm.PrpCode = H.PrpCode AND gsnm.SExe = SexeData.sexe AND gsnm.Status <> 'P'			
						WHERE 
							D.StrCode = '".$strcode."'	
						GROUP BY 
							I.ItmName, dsn.DsnName, par.AccName , SexeData.sexe, gsnm.lngname
						ORDER BY 	
							mtd DESC";
    		
    	$byCategorydata = DB::select($byCategoryqry, [$date, $date, $monthStart, $date, $monthStart, $date]);
    
    	$byCategory = collect($byCategorydata)                
                ->map(function ($row) {

                	return [
                    	'name'  => $row->name,

                    	'dsnname'  => $row->dsnname,
                    	'parname'  => $row->parname,
                    	'sexe'     => $row->sexe,
                    	'sexename' => $row->sexename,

                    	'today' => (float) $row->today,
                    	'mtd'   => (float) $row->mtd,
                    	'todayqty' => (float) $row->todayqty,
                    	'mtdqty'   => (float) $row->mtdqty,
                    	'trend' => $row->today > 0 ? 'up' : 'down'
                	];
            	});
        		//->take(10); //->values()
                //->toArray(); //->get()->limit(10);

        return [
            'total' => [
                'today' => (float) $total->today,
                'mtd'   => (float) $total->mtd,
            ],

            'daily_trend' => $dailyTrend->values()->toArray(),

            // 'by_category' => $byCategory->values()->toArray(),
        	'by_category' => $byCategory->toArray(),
        ];

        // return [
        //     'total' => [
        //         'today' => 1900000,   // ₹19L today
        //         'mtd'   => 15200000,  // ₹1.52Cr MTD
        //     ],
        //     'daily_trend' => [
        //         ['day'=>'1','amount'=>420000],['day'=>'2','amount'=>380000],
        //         ['day'=>'3','amount'=>510000],['day'=>'4','amount'=>290000],
        //         ['day'=>'5','amount'=>650000],['day'=>'6','amount'=>480000],
        //         ['day'=>'7','amount'=>390000],['day'=>'8','amount'=>520000],
        //         ['day'=>'9','amount'=>430000],['day'=>'10','amount'=>580000],
        //         ['day'=>'11','amount'=>340000],['day'=>'12','amount'=>460000],
        //         ['day'=>'13','amount'=>570000],['day'=>'14','amount'=>390000],
        //         ['day'=>'15','amount'=>610000],['day'=>'16','amount'=>450000],
        //         ['day'=>'17','amount'=>380000],['day'=>'18','amount'=>490000],
        //         ['day'=>'19','amount'=>520000],['day'=>'20','amount'=>350000],
        //         ['day'=>'21','amount'=>630000],['day'=>'22','amount'=>470000],
        //         ['day'=>'23','amount'=>410000],['day'=>'24','amount'=>540000],
        //         ['day'=>'25','amount'=>360000],['day'=>'26','amount'=>480000],
        //         ['day'=>'27','amount'=>550000],['day'=>'28','amount'=>420000],
        //         ['day'=>'29','amount'=>390000],['day'=>'30','amount'=>510000],
        //     ],
        //     'by_category' => [
        //         ['name'=>'Linen Shirting',  'today'=>510000,  'mtd'=>1130000, 'trend'=>'up'],
        //         ['name'=>'Sportswear',      'today'=>320000,  'mtd'=>480000,  'trend'=>'up'],
        //         ['name'=>'Linen Suiting',   'today'=>210000,  'mtd'=>180000,  'trend'=>'down'],
        //         ['name'=>'Denim Fabric',    'today'=>170000,  'mtd'=>170000,  'trend'=>'up'],
        //         ['name'=>'Cotton Prints',   'today'=>1910000, 'mtd'=>2680000, 'trend'=>'up'],
        //         ['name'=>'Rayon/Poly',      'today'=>1730000, 'mtd'=>4400000, 'trend'=>'up'],
        //         ['name'=>'Tussar Silk',     'today'=>1430000, 'mtd'=>1320000, 'trend'=>'down'],
        //     ]
        // ];
    }

    /**
     * PRODUCTION SECTION
     * 
     * JSON Shape:
     * {
     *   "total": { "today_meters": 7591000, "mtd_meters": 6918300 },
     *   "daily_trend": [ { "day": "1", "meters": 250000 }, ... ],
     *   "by_machine": [
     *     { "machine": "M/W Rapier", "target": 42000, "today": 52100, "achievement": "up" },
     *     ...
     *   ]
     * }
     * 
     * REPLACE WITH:
     *   SELECT machine_group, SUM(qty_meters) FROM production_entries 
     *   WHERE prod_date = '$date' GROUP BY machine_group
     */
//   	private function getProductionData($date, $monthStart)
// 	{
//     $total = DB::table('GryProcessC as C')
//         ->join('GryProcess as P', 'P.UID', '=', 'C.UID')
//         ->selectRaw("
//             SUM(CASE WHEN P.VouDate = ?
//                      THEN C.Qty ELSE 0 END) AS today_meters,

//             SUM(CASE WHEN P.VouDate BETWEEN ? AND ?
//                      THEN C.Qty ELSE 0 END) AS mtd_meters
//         ", [$date, $monthStart, $date])
//         ->first();

//     $dailyTrend = DB::table('GryProcessC as C')
//         ->join('GryProcess as P', 'P.UID', '=', 'C.UID')
//         ->selectRaw("
//             RIGHT(CAST(P.VouDate AS VARCHAR(8)),2) AS day,
//             SUM(C.Qty) AS meters
//         ")
//         ->whereBetween('P.VouDate', [$monthStart, $date])
//         ->groupByRaw("RIGHT(CAST(P.VouDate AS VARCHAR(8)),2)")
//         ->orderBy('day')
//         ->get()
//         ->map(function ($row) {
//             return [
//                 'day'    => ltrim($row->day, '0'),
//                 'meters' => (float)$row->meters
//             ];
//         });

//     $machineWise = DB::table('GryProcessC as C')
//         ->join('GryProcess as P', 'P.UID', '=', 'C.UID')

//         ->join('DapMach as M', function ($join) {
//             $join->on('M.PrpCode', '=', 'P.PrpCode')
//                  ->on('M.MacCode', '=', 'P.MacCode');
//         })

//         ->join('DAPMGRP as MG', function ($join) {
//             $join->on('MG.PrpCode', '=', 'M.PrpCode')
//                  ->on('MG.MacGrp', '=', 'M.MacGrp');
//         })

//         ->selectRaw("
//             P.PrpCode + '-' + MG.MGrpName AS machinegrp,

//             SUM(
//                 CASE
//                     WHEN P.VouDate = ?
//                     THEN C.Qty
//                     ELSE 0
//                 END
//             ) AS today,

//             SUM(
//                 CASE
//                     WHEN P.VouDate BETWEEN ? AND ?
//                     THEN C.Qty
//                     ELSE 0
//                 END
//             ) AS mtd,
            
//             P.PrpCode as prpcode 
//         ", [$date, $monthStart, $date])

//         ->groupBy(
//             'P.PrpCode',
//             'M.MacGrp',
//             'MG.MGrpName'
//         )

//         ->orderByDesc('mtd')
//         ->get()

//         ->map(function ($row) {

//             return [
//                 'machine' => $row->machinegrp,
//                 'target'   => (float)$row->today,
//                 'today'     => (float)$row->mtd,
//                 'achievement' => 'up',
//             	'prpcode' => $row->prpcode
//             ];

//         });

//     return [
//         'total' => [
//             'today_meters' => (float)($total->today_meters ?? 0),
//             'mtd_meters'   => (float)($total->mtd_meters ?? 0),
//         ],

//         'daily_trend' => $dailyTrend->values()->toArray(),

//         'by_machine' => $machineWise->values()->toArray(),
//     ];
// }

	private function getProductionData($date, $monthStart, $prptype = 'S')
	{
    /** @var DashboardProductionCardService $productionCard */
    $productionCard = app(
        DashboardProductionCardService::class
    );

    return $productionCard->build(
        (int) $date,
        (int) $monthStart,
        strtoupper(trim((string) $prptype))
    );
}

    /**
     * PAYMENT TO PAY SECTION — Owner / Director view
     *
     * Purpose:
     * - Show only payment rows already entered in FAMPay/FAMPayD1 that are
     *   still waiting to clear.
     * - FAMPay is the voucher/header table.
     * - FAMPayD1.AccCode is the party account.
     * - FAMPayD1.Amount is the party payment amount.
     * - FAMPayD1.ClrDate = 0/NULL means "To Pay" / not yet cleared.
     *
     * IMPORTANT:
     * - This is intentionally independent from Collection logic.
     * - Do not use FAMPay.TotAmt for party totals because one payment voucher
     *   can contain multiple FAMPayD1 party rows.
     * - FAMPayD2 is reserved for the next drill-down layer (against bills),
     *   linked by UId + SrNo. It is not required to calculate this card total.
     * - The selected dashboard date is treated as an AS-OF date using
     *   FAMPay.EDate <= selected date. ClrDate decides pending/cleared status.
     */
    private function getPaymentData(
        $date,
        $prptype = 'S',
        array $prpcodes = []
    )
    {
        $date = (int) $date;

        $prpcodes = array_values(array_unique(array_filter(array_map(
            static fn ($value) => trim((string) $value),
            $prpcodes
        ), static fn ($value) => $value !== '')));

        if (count($prpcodes) === 0) {
            return [
                'as_on_date' => $date,
                'total' => [
                    'to_pay' => 0.0,
                    'pending_count' => 0,
                    'party_count' => 0,
                ],
                'by_party' => [],
                'diagnostics' => [
                    'payment_query_count' => 0,
                    'source_row_count' => 0,
                    'filters' => [
                        'prptype' => strtoupper(trim((string) $prptype)),
                        'prpcodes' => [],
                        'clrdate' => '0_OR_NULL',
                        'entry_date_lte' => $date,
                        'creditor_mheads' => PaymentDashboardRules::configuredMHeads($prpcodes),
                    ],
                ],
            ];
        }

        $prpPlaceholders = implode(',', array_fill(0, count($prpcodes), '?'));

        // Centralized creditor-account scope. No property/MHead rule is hardcoded
        // in this controller; PaymentDashboardRules is the single source of truth.
        $creditorBindings = [];
        $creditorCondition = PaymentDashboardRules::creditorSqlCondition(
            'P.PrpCode',
            'A.MHead',
            $prpcodes,
            $creditorBindings
        );

        /*
         * One grouped query only. The party is FAMPayD1.AccCode, while the
         * payment book/account remains FAMPay.AccCode and is deliberately not
         * used for grouping.
         */
        $rows = DB::select(
            "
            SELECT
                P.PrpCode,
                D.AccCode AS PartyCode,
                ISNULL(A.AccName, '') AS PartyName,
                CAST(SUM(ISNULL(D.Amount, 0)) AS decimal(18, 2)) AS ToPay,
                COUNT_BIG(*) AS PendingCount
            FROM FAMPay AS P
            INNER JOIN FAMPayD1 AS D
                ON D.UId = P.UId
            LEFT JOIN FAMAcc AS A
                ON A.PrpCode = P.PrpCode
               AND A.AccCode = D.AccCode
            WHERE P.PrpCode IN ({$prpPlaceholders})
              AND P.EDate <= ?
              AND (ISNULL(D.ClrDate, 0) = 0)
              AND ISNULL(D.Amount, 0) > 0
              AND {$creditorCondition}
            GROUP BY
                P.PrpCode,
                D.AccCode,
                ISNULL(A.AccName, '')
            HAVING SUM(ISNULL(D.Amount, 0)) > 0
            ORDER BY
                SUM(ISNULL(D.Amount, 0)) DESC,
                ISNULL(A.AccName, ''),
                D.AccCode
            ",
            array_merge($prpcodes, [$date], $creditorBindings)
        );

        $toPay = 0.0;
        $pendingCount = 0;
        $partyKeys = [];
        $byParty = [];

        foreach ($rows as $row) {
            $prpCode = trim((string) ($row->PrpCode ?? ''));
            $partyCode = trim((string) ($row->PartyCode ?? ''));
            $partyName = trim((string) ($row->PartyName ?? ''));
            $amount = round((float) ($row->ToPay ?? 0), 2);
            $count = (int) ($row->PendingCount ?? 0);

            $toPay = round($toPay + $amount, 2);
            $pendingCount += $count;
            $partyKeys[$prpCode . '|' . $partyCode] = true;

            $byParty[] = [
                'prpcode' => $prpCode,
                'party_code' => $partyCode,
                'party_name' => $partyName !== '' ? $partyName : $partyCode,
                'to_pay' => $amount,
                'pending_count' => $count,
            ];
        }

        return [
            'as_on_date' => $date,
            'total' => [
                'to_pay' => round($toPay, 2),
                'pending_count' => $pendingCount,
                'party_count' => count($partyKeys),
            ],
            'by_party' => $byParty,
            'diagnostics' => [
                'payment_query_count' => 1,
                'source_row_count' => count($rows),
                'filters' => [
                    'prptype' => strtoupper(trim((string) $prptype)),
                    'prpcodes' => $prpcodes,
                    'clrdate' => '0_OR_NULL',
                    'entry_date_lte' => $date,
                    'creditor_mheads' => PaymentDashboardRules::configuredMHeads($prpcodes),
                ],
            ],
        ];
    }

    /**
     * PAYMENT COLLECTION SECTION — Sales Exec wise
     * 
     * JSON Shape:
     * {
     *   "total": { "today": 960000, "mtd": 12330000 },
     *   "daily_trend": [ { "day":"1","amount":300000 }, ... ],
     *   "by_exec": [
     *     {
     *       "exec_id": 1,
     *       "name": "Karan Patel",
     *       "avatar_color": "#4CAF50",
     *       "today": 210000,
     *       "mtd":   870000
     *     }, ...
     *   ]
     * }
     * 
     * REPLACE WITH:
     *   SELECT se.id, se.name, SUM(pr.amount) as today
     *   FROM payment_receipts pr JOIN sales_executives se ON pr.sales_exec_id=se.id
     *   WHERE pr.receipt_date='$date' GROUP BY se.id
     */
    private function getCollectionData(
        $date,
        $monthStart,
        $ldb,
        $prptype = 'S',
        array $prpcodes = []
    )
    {
        $date = (int) $date;
        $monthStart = (int) $monthStart;

        /*
         * PAYMENT COLLECTION CUSTOMER SCOPE
         * ---------------------------------
         * S => MHead 6  + ParType CUS
         * K => MHead 15 + ParType CUS
         *
         * The receipt party FAMAcc row is authoritative for eligibility.
         */
        $collectionMHeads = $this->dashboardOutstandingMHeads((string) $prptype);
        $collectionParTypes = self::OUTSTANDING_PAR_TYPES;
        $prpcodes = array_values(array_unique(array_filter(array_map(
            static fn ($value) => trim((string) $value),
            $prpcodes
        ), static fn ($value) => $value !== '')));

        if (count($prpcodes) === 0 || count($collectionMHeads) === 0 || count($collectionParTypes) === 0) {
            return [
                'period' => $this->dashboardCoveragePeriod($monthStart, $date, 0, 'Collection'),
                'total' => ['today' => 0.0, 'mtd' => 0.0],
                'daily_trend' => [],
                'by_exec' => [],
                'diagnostics' => [
                    'collection_query_count' => 0,
                    'source_row_count' => 0,
                    'includes_unassigned' => true,
                    'filters' => [
                        'mheads' => $collectionMHeads,
                        'par_types' => $collectionParTypes,
                        'prpcodes' => $prpcodes,
                    ],
                ],
            ];
        }

        $prpPlaceholders = implode(',', array_fill(0, count($prpcodes), '?'));
        $mheadPlaceholders = implode(',', array_fill(0, count($collectionMHeads), '?'));
        $parTypePlaceholders = implode(',', array_fill(0, count($collectionParTypes), '?'));

        /*
         * PERFORMANCE FIX
         * ---------------
         * The old implementation executed the same expensive CollectionData
         * CTE three times:
         *   1. Total
         *   2. Daily trend
         *   3. Executive breakdown
         *
         * This implementation executes the transaction chain only once,
         * grouped by LastDate and executive. Totals, trend and executive cards
         * are then derived in PHP.
         *
         * It also avoids the invalid:
         *
         *     WITH CollectionData (...) WITH ExecutiveCollection (...)
         *
         * syntax. Multiple SQL Server CTEs must be comma-separated inside one
         * WITH clause, or the second result must be derived without another
         * WITH keyword.
         */

        $rows = DB::select(
            "
            ;WITH CollectionData AS
            (
                -----------------------------------------------------------
                -- Current-year invoice adjustments
                -----------------------------------------------------------
                SELECT DISTINCT
                    R2.UID,
                    R2.SrNo,
                    R2.SubSr,
                    R1.LastDate,
                    CASE
                        WHEN NULLIF(LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), SO.SExe), ''))), '') IS NOT NULL
                         AND LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), SO.SExe), ''))) <> '0'
                            THEN SO.SExe
                        ELSE A.SExe
                    END AS SExe,
                    ISNULL(R2.SetAmt, 0) AS Amount

                FROM FamRcpD2 AS R2

                INNER JOIN FamRcpD1 AS R1
                    ON R1.UID = R2.UID
                   AND R1.SrNo = R2.SrNo

                INNER JOIN FamRcp AS R
                    ON R.UID = R1.UID

                INNER JOIN FamAcc AS A
                    ON A.AccCode = R1.AccCode
                   AND A.PrpCode = R.PrpCode

                INNER JOIN FamSaliD1 AS SD
                    ON SD.UID = R2.SUID

                INNER JOIN FamSalD1 AS D1
                    ON D1.UID = SD.SUID
                   AND D1.SrNo = SD.SSrNo

                INNER JOIN FamSO AS SO
                    ON SO.UID = D1.SOUID

                WHERE R2.TType = 1
                  AND R2.SUID <> -1
                  AND R.PrpCode IN ({$prpPlaceholders})
                  AND A.MHead IN ({$mheadPlaceholders})
                  AND A.ParType IN ({$parTypePlaceholders})
                  AND R1.LastDate BETWEEN ? AND ?

                UNION ALL

                -----------------------------------------------------------
                -- Opening outstanding adjustments
                -----------------------------------------------------------
                SELECT DISTINCT
                    R2.UID,
                    R2.SrNo,
                    R2.SubSr,
                    R1.LastDate,
                    CASE
                        WHEN NULLIF(LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), SO.SExe), ''))), '') IS NOT NULL
                         AND LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), SO.SExe), ''))) <> '0'
                            THEN SO.SExe
                        ELSE A.SExe
                    END AS SExe,
                    ISNULL(R2.SetAmt, 0) AS Amount

                FROM FamRcpD2 AS R2

                INNER JOIN FamRcpD1 AS R1
                    ON R1.UID = R2.UID
                   AND R1.SrNo = R2.SrNo

                INNER JOIN FamRcp AS R
                    ON R.UID = R1.UID

                INNER JOIN FamAcc AS A
                    ON A.AccCode = R1.AccCode
                   AND A.PrpCode = R.PrpCode

                INNER JOIN FamAccOD AS OD
                    ON OD.AccCode = R1.AccCode
                   AND OD.SrNo = R2.SSrNo
                   AND OD.PrpCode = R.PrpCode

                LEFT JOIN {$ldb}FamSali AS LS
                    ON LS.ParCode = OD.AccCode
                   AND LS.PrpCode = OD.PrpCode
                   AND LS.BillNo = OD.BillNo
                   AND LS.BillDate = OD.BillDate

                LEFT JOIN {$ldb}FamSaliD1 AS LSD1
                    ON LSD1.UID = LS.UID

                LEFT JOIN {$ldb}FamSalD1 AS LS1
                    ON LS1.UID = LSD1.SUID
                   AND LS1.SrNo = LSD1.SSrNo

                LEFT JOIN {$ldb}FamSO AS SO
                    ON SO.UID = LS1.SOUID

                WHERE R2.TType = 1
                  AND R2.SUID = -1
                  AND R.PrpCode IN ({$prpPlaceholders})
                  AND A.MHead IN ({$mheadPlaceholders})
                  AND A.ParType IN ({$parTypePlaceholders})
                  AND R1.LastDate BETWEEN ? AND ?

                UNION ALL

                -----------------------------------------------------------
                -- Remaining / non-sales adjustment amount
                -----------------------------------------------------------
                SELECT DISTINCT
                    R1.UID,
                    R1.SrNo,
                    0 AS SubSr,
                    R1.LastDate,
                    A.SExe,

                    (
                        ISNULL(R1.Amount, 0)
                        -
                        ISNULL(
                            (
                                SELECT SUM(ISNULL(X.SetAmt, 0))
                                FROM FamRcpD2 AS X
                                WHERE X.UID = R1.UID
                                  AND X.SrNo = R1.SrNo
                                  AND X.TType = 1
                            ),
                            0
                        )
                    ) AS Amount

                FROM FamRcpD1 AS R1

                INNER JOIN FamRcp AS R
                    ON R.UID = R1.UID

                INNER JOIN FamAcc AS A
                    ON A.AccCode = R1.AccCode
                   AND A.PrpCode = R.PrpCode

                WHERE R.PrpCode IN ({$prpPlaceholders})
                  AND A.MHead IN ({$mheadPlaceholders})
                  AND A.ParType IN ({$parTypePlaceholders})
                  AND R1.LastDate BETWEEN ? AND ?
                  AND
                    (
                        ISNULL(R1.Amount, 0)
                        -
                        ISNULL(
                            (
                                SELECT SUM(ISNULL(X.SetAmt, 0))
                                FROM FamRcpD2 AS X
                                WHERE X.UID = R1.UID
                                  AND X.SrNo = R1.SrNo
                                  AND X.TType = 1
                            ),
                            0
                        )
                    ) > 0
            )

            SELECT
                C.LastDate,

                CASE
                    WHEN NULLIF(
                        LTRIM(
                            RTRIM(
                                ISNULL(
                                    CONVERT(varchar(50), C.SExe),
                                    ''
                                )
                            )
                        ),
                        ''
                    ) IS NULL
                    OR LTRIM(
                        RTRIM(
                            ISNULL(
                                CONVERT(varchar(50), C.SExe),
                                ''
                            )
                        )
                    ) = '0'
                    THEN '0'

                    ELSE LTRIM(
                        RTRIM(
                            CONVERT(varchar(50), C.SExe)
                        )
                    )
                END AS SExe,

                CAST(
                    SUM(ISNULL(C.Amount, 0))
                    AS decimal(18, 2)
                ) AS Amount

            FROM CollectionData AS C

            GROUP BY
                C.LastDate,
                CASE
                    WHEN NULLIF(
                        LTRIM(
                            RTRIM(
                                ISNULL(
                                    CONVERT(varchar(50), C.SExe),
                                    ''
                                )
                            )
                        ),
                        ''
                    ) IS NULL
                    OR LTRIM(
                        RTRIM(
                            ISNULL(
                                CONVERT(varchar(50), C.SExe),
                                ''
                            )
                        )
                    ) = '0'
                    THEN '0'

                    ELSE LTRIM(
                        RTRIM(
                            CONVERT(varchar(50), C.SExe)
                        )
                    )
                END

            HAVING SUM(ISNULL(C.Amount, 0)) <> 0

            ORDER BY
                C.LastDate,
                SExe
            ",
            array_merge(
                $prpcodes, $collectionMHeads, $collectionParTypes, [$monthStart, $date],
                $prpcodes, $collectionMHeads, $collectionParTypes, [$monthStart, $date],
                $prpcodes, $collectionMHeads, $collectionParTypes, [$monthStart, $date]
            )
        );

        $todayTotal = 0.0;
        $mtdTotal = 0.0;
        $dailyAmounts = [];
        $executiveAmounts = [];

        foreach ($rows as $row) {
            $lastDate = (int) ($row->LastDate ?? 0);
            $execCode = trim((string) ($row->SExe ?? '0'));
            $amount = round((float) ($row->Amount ?? 0), 2);

            if ($execCode === '') {
                $execCode = '0';
            }

            $mtdTotal = round($mtdTotal + $amount, 2);

            if ($lastDate === $date) {
                $todayTotal = round($todayTotal + $amount, 2);
            }

            if (!isset($dailyAmounts[$lastDate])) {
                $dailyAmounts[$lastDate] = 0.0;
            }

            $dailyAmounts[$lastDate] = round(
                $dailyAmounts[$lastDate] + $amount,
                2
            );

            if (!isset($executiveAmounts[$execCode])) {
                $executiveAmounts[$execCode] = [
                    'today' => 0.0,
                    'mtd' => 0.0,
                ];
            }

            if ($lastDate === $date) {
                $executiveAmounts[$execCode]['today'] = round(
                    $executiveAmounts[$execCode]['today'] + $amount,
                    2
                );
            }

            $executiveAmounts[$execCode]['mtd'] = round(
                $executiveAmounts[$execCode]['mtd'] + $amount,
                2
            );
        }

        /*
         * Resolve names with one small master query. Do not join GenSExe into
         * the transaction aggregation because the same SExe exists under each
         * property and would multiply the financial values.
         */
        $execCodes = array_values(
    		array_filter(
        		array_map(
            		static fn ($code) => trim((string) $code),
            		array_keys($executiveAmounts)
        		),
        		static fn ($code) => $code !== '' && $code !== '0'
    		)
		);

        $executiveNames = [];

        if (count($execCodes) > 0) {
            $nameRows = DB::table('GenSExe')
    			->select(['SExe', 'LngName', 'PrpCode'])
    			->whereIn('SExe', $execCodes)
    			->orderBy('PrpCode')
    			->get();

            foreach ($nameRows as $nameRow) {
                $code = trim((string) ($nameRow->SExe ?? ''));
                $name = trim((string) ($nameRow->LngName ?? ''));

                if (
                    $code !== ''
                    && $name !== ''
                    && !isset($executiveNames[$code])
                ) {
                    $executiveNames[$code] = $name;
                }
            }
        }

        ksort($dailyAmounts);

        $dailyTrend = [];

        foreach ($dailyAmounts as $lastDate => $amount) {
            $dailyTrend[] = [
                'day' => (string) ((int) substr(
                    str_pad((string) $lastDate, 8, '0', STR_PAD_LEFT),
                    -2
                )),
                'amount' => round((float) $amount, 2),
            ];
        }

        $byExecRows = [];

        foreach ($executiveAmounts as $execCode => $amounts) {
            $byExecRows[] = [
                'exec_id' => $execCode,
                'name' => $execCode === '0'
                    ? 'UNASSIGNED'
                    : (
                        $executiveNames[$execCode]
                        ?? ('EXECUTIVE ' . $execCode)
                    ),
                'today' => round((float) $amounts['today'], 2),
                'mtd' => round((float) $amounts['mtd'], 2),
                'is_unassigned' => $execCode === '0',
            ];
        }

        usort(
            $byExecRows,
            static function (array $a, array $b): int {
                $amountCompare =
                    ((float) $b['mtd']) <=> ((float) $a['mtd']);

                if ($amountCompare !== 0) {
                    return $amountCompare;
                }

                return strcmp(
                    (string) $a['name'],
                    (string) $b['name']
                );
            }
        );

        $colors = [
            '#4CAF50',
            '#2196F3',
            '#E91E63',
            '#FF9800',
            '#9C27B0',
            '#009688',
            '#795548',
            '#3F51B5'
        ];

        $byExec = [];

        foreach ($byExecRows as $index => $row) {
            $row['avatar_color'] =
                $colors[$index % count($colors)];

            $byExec[] = $row;
        }

        $latestCollectionDate = count($dailyAmounts) > 0
            ? (int) max(array_keys($dailyAmounts))
            : 0;

        return [
            'period' => $this->dashboardCoveragePeriod(
                $monthStart,
                $date,
                $latestCollectionDate,
                'Collection'
            ),

            'total' => [
                'today' => round($todayTotal, 2),
                'mtd' => round($mtdTotal, 2),
            ],

            'daily_trend' => $dailyTrend,

            'by_exec' => $byExec,

            'diagnostics' => [
                'collection_query_count' => 1,
                'source_row_count' => count($rows),
                'includes_unassigned' => true,
                'filters' => [
                    'mheads' => $collectionMHeads,
                    'par_types' => $collectionParTypes,
                    'prpcodes' => $prpcodes,
                    'executive_attribution' => 'SO.SExe when nonblank/nonzero, otherwise FAMAcc.SExe',
                ],
            ],
        ];
    }

    /**
     * Empty, same-shape card for a card the user is not permitted to see.
     * Contains no business data; permitted=false tells the UI to hide it.
     */
    private function emptyCard(string $card, int $date, int $monthStart): array
    {
        $base = [
            'permitted' => false,
            'period' => $this->dashboardCoveragePeriod($monthStart, $date, 0, ucfirst($card)),
        ];

        switch ($card) {
            case 'sales':
                return $base + [
                    'total' => ['today' => 0.0, 'mtd' => 0.0, 'today_amount' => 0.0, 'mtd_amount' => 0.0],
                    'daily_trend' => [],
                    'dimensions' => ['category' => [], 'executive' => [], 'design' => [], 'party' => []],
                    'default_dimension' => 'category',
                    'by_category' => [],
                    'by_exec' => [],
                    'by_executive' => [],
                    'by_design' => [],
                    'by_party' => [],
                ];
            case 'production':
                return $base + [
                    'total' => ['today_meters' => 0.0, 'mtd_meters' => 0.0],
                    'daily_trend' => [],
                    'by_machine' => [],
                    'by_category' => [],
                ];
            case 'collection':
                return $base + [
                    'total' => ['today' => 0.0, 'mtd' => 0.0],
                    'daily_trend' => [],
                    'by_exec' => [],
                ];
            case 'payment':
                return $base + [
                    'as_on_date' => $date,
                    'total' => ['to_pay' => 0.0, 'pending_count' => 0, 'party_count' => 0],
                    'by_party' => [],
                ];
            case 'outstanding':
            default:
                return $base + [
                    'total_due' => 0.0,
                    'by_exec' => [],
                ];
        }
    }

    private function dashboardCoveragePeriod(
        int $fromDate,
        int $requestedToDate,
        int $actualToDate,
        string $label
    ): array {
        $format = static function (int $ymd): string {
            if ($ymd <= 0) {
                return '';
            }

            $dt = \DateTimeImmutable::createFromFormat(
                '!Ymd',
                str_pad((string) $ymd, 8, '0', STR_PAD_LEFT)
            );

            return $dt ? $dt->format('d M Y') : '';
        };

        $pendingDays = 0;
        if ($actualToDate > 0 && $requestedToDate > $actualToDate) {
            $actual = \DateTimeImmutable::createFromFormat('!Ymd', (string) $actualToDate);
            $requested = \DateTimeImmutable::createFromFormat('!Ymd', (string) $requestedToDate);
            if ($actual && $requested) {
                $pendingDays = (int) $actual->diff($requested)->format('%a');
            }
        }

        $fromLabel = $format($fromDate);
        $toLabel = $format($actualToDate);

        return [
            'type' => 'transaction_period',
            'from_ymd' => $fromDate > 0 ? $fromDate : null,
            'requested_to_ymd' => $requestedToDate > 0 ? $requestedToDate : null,
            'actual_to_ymd' => $actualToDate > 0 ? $actualToDate : null,
            'pending_days' => $pendingDays,
            'is_current_through_requested_date' => $actualToDate > 0 && $actualToDate >= $requestedToDate,
            'display_label' => $actualToDate > 0
                ? $fromLabel . ' - ' . $toLabel
                : 'No ' . strtolower($label) . ' entered for selected period',
            'freshness_label' => $actualToDate > 0
                ? ($pendingDays > 0 ? $label . ' through ' . $toLabel : $label . ' current through ' . $toLabel)
                : 'No ' . strtolower($label) . ' data',
        ];
    }

    /**
     * OUTSTANDING SECTION — Sales Exec wise
     * 
     * JSON Shape:
     * {
     *   "total_due": 19000000,
     *   "by_exec": [
     *     {
     *       "exec_id": 1,
     *       "name": "Rohan Mehta",
     *       "avatar_color": "#2196F3",
     *       "outstanding": 4600000
     *     }, ...
     *   ]
     * }
     * 
     * REPLACE WITH:
     *   SELECT se.id, se.name, SUM(ol.outstanding_amount) as outstanding
     *   FROM outstanding_ledger ol JOIN sales_executives se ON ol.sales_exec_id=se.id
     *   GROUP BY se.id ORDER BY outstanding DESC
     */
    private function getOutstandingData($prpcodes, $prptype = 'S', array $salesStrCodes = [], int $asOnDate = 0)
{
    /*
     * OUTSTANDING BUSINESS RULES
     * --------------------------
     * 1. MHead must belong to OUTSTANDING_MHEADS.
     * 2. ParType must belong to OUTSTANDING_PAR_TYPES.
     * 3. Only properties belonging to the selected PrpType are included.
     * 4. Blank / zero SExe are grouped as UNASSIGNED.
     * 5. Positive and negative ClBal values are included.
     * 6. Only an executive's final net zero balance is removed.
     * 7. FamAcc is aggregated before executive-name lookup.
     */

    /*
     * Normalize selected PrpType properties.
     */
    $prpcodes = array_values(
        array_unique(
            array_filter(
                array_map(
                    static function ($code) {
                        return trim((string) $code);
                    },
                    (array) $prpcodes
                ),
                static function ($code) {
                    return $code !== '';
                }
            )
        )
    );

    /*
     * Safety:
     * Never allow an empty property list to accidentally become an
     * unrestricted FamAcc Outstanding query.
     */
    if (count($prpcodes) === 0) {
        return [
            'total_due' => 0.0,

            'by_exec' => [],

            'reconciliation' => [
                'direct_total' => 0.0,
                'list_total' => 0.0,
                'difference' => 0.0,
                'is_reconciled' => true,
                'includes_negative_balances' => true,
                'includes_unassigned' => true,

                'filters' => [
                    'mheads' => $this->dashboardOutstandingMHeads((string) $prptype),
                    'par_types' => self::OUTSTANDING_PAR_TYPES,
                    'prpcodes' => [],
                ],
            ],
        ];
    }

    /*
     * Central business-filter values.
     */
    $mheads = $this->dashboardOutstandingMHeads((string) $prptype);
    $parTypes = self::OUTSTANDING_PAR_TYPES;

    /*
     * KNITTING OUTSTANDING AS-ON FIX
     * -------------------------------
     * Sudamo stays on the existing FamAcc.ClBal path. Knitting must rebuild
     * outstanding as of the requested dashboard date because future receipt
     * allocations are already reflected in FAMSali.BalAmt.
     */
    if (strtoupper(trim((string) $prptype)) === 'K') {
        $service = new KnittingOutstandingAsOnService();
        $rows = $service->byExecutive($asOnDate, $prpcodes);

        $execCodes = array_column($rows, 'code');
        $nameMap = [];
        if (count($execCodes) > 0) {
            $nameRows = DB::table('GenSExe as G')
                ->selectRaw("LTRIM(RTRIM(CONVERT(varchar(50), G.SExe))) AS SExe, MAX(LTRIM(RTRIM(ISNULL(CONVERT(varchar(250), G.LngName), '')))) AS SExeName")
                ->whereIn(DB::raw("LTRIM(RTRIM(CONVERT(varchar(50), G.SExe)))"), $execCodes)
                ->whereIn('G.PrpCode', $prpcodes)
                ->groupBy(DB::raw("LTRIM(RTRIM(CONVERT(varchar(50), G.SExe)))"))
                ->get();
            foreach ($nameRows as $row) {
                $nameMap[trim((string) $row->SExe)] = trim((string) ($row->SExeName ?? ''));
            }
        }

        $colors = ['#4CAF50','#2196F3','#E91E63','#FF9800','#9C27B0','#009688','#795548','#3F51B5'];
        $byExec = [];
        foreach ($rows as $index => $row) {
            $execId = trim((string) ($row['code'] ?? '0')) ?: '0';
            $name = $execId === '0' ? 'UNASSIGNED' : ($nameMap[$execId] ?? ('EXECUTIVE ' . $execId));
            $byExec[] = [
                'exec_id' => $execId,
                'name' => $name,
                'avatar_color' => $colors[$index % count($colors)],
                'outstanding' => round((float) ($row['amount'] ?? 0), 2),
            ];
        }
        $totalDue = round(array_sum(array_map(static fn ($row) => (float) ($row['outstanding'] ?? 0), $byExec)), 2);

        return [
            'period' => [
                'type' => 'as_on_balance',
                'from_ymd' => null,
                'requested_to_ymd' => $asOnDate,
                'actual_to_ymd' => $asOnDate,
                'pending_days' => 0,
                'is_current_through_requested_date' => true,
                'display_label' => 'As on ' . $asOnDate,
                'freshness_label' => 'As-on outstanding',
            ],
            'total_due' => $totalDue,
            'by_exec' => $byExec,
            'reconciliation' => [
                'direct_total' => $totalDue,
                'list_total' => $totalDue,
                'difference' => 0.0,
                'is_reconciled' => true,
                'includes_negative_balances' => false,
                'includes_unassigned' => true,
                'filters' => [
                    'mheads' => $mheads,
                    'par_types' => $parTypes,
                    'prpcodes' => $prpcodes,
                    'as_on_date' => $asOnDate,
                    'source' => 'FAMSali.BalAmt + future FAMRcpD2 allocations where receipt FAMTrans.TranType=5 and TranDate > as-on date',
                ],
            ],
        ];
    }

    /*
     * Extra safety in case somebody accidentally empties a global filter.
     *
     * We do NOT want:
     *     MHead IN ()
     * or
     *     ParType IN ()
     *
     * and we definitely do not want to silently remove either condition.
     */
    if (count($mheads) === 0 || count($parTypes) === 0) {
        return [
            'total_due' => 0.0,

            'by_exec' => [],

            'reconciliation' => [
                'direct_total' => 0.0,
                'list_total' => 0.0,
                'difference' => 0.0,
                'is_reconciled' => true,
                'includes_negative_balances' => true,
                'includes_unassigned' => true,

                'filters' => [
                    'mheads' => $mheads,
                    'par_types' => $parTypes,
                    'prpcodes' => $prpcodes,
                ],
            ],
        ];
    }

    /*
     * Parameterized IN placeholders.
     *
     * Example:
     *   MHead IN (?)
     *   ParType IN (?)
     *   PrpCode IN (?, ?, ?, ...)
     *
     * No business-filter values are concatenated into SQL.
     */
    $mheadPlaceholders = implode(
        ',',
        array_fill(0, count($mheads), '?')
    );

    $parTypePlaceholders = implode(
        ',',
        array_fill(0, count($parTypes), '?')
    );

    $prpCodePlaceholders = implode(
        ',',
        array_fill(0, count($prpcodes), '?')
    );

    /*
     * Outstanding is account-level FamAcc.ClBal.
     * Store codes (2/5 for Knitting, 002/012 for Sudamo) are SALES scope only
     * and must not narrow Outstanding. Property scope remains PrpType-driven.
     */

    $sql = "
        ;WITH ExecutiveOutstanding AS
        (
            SELECT
                CASE
                    WHEN NULLIF(LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), A.SExe), ''))), '') IS NOT NULL
                     AND LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), A.SExe), ''))) <> '0'
                        THEN LTRIM(RTRIM(CONVERT(varchar(50), A.SExe)))
                    WHEN NULLIF(LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), HX.SExe), ''))), '') IS NOT NULL
                     AND LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), HX.SExe), ''))) <> '0'
                        THEN LTRIM(RTRIM(CONVERT(varchar(50), HX.SExe)))
                    ELSE '0'
                END AS SExe,

                CAST(
                    SUM(ISNULL(A.ClBal, 0))
                    AS decimal(18, 2)
                ) AS Outstanding

            FROM FamAcc AS A

            OUTER APPLY
            (
                SELECT TOP 1
                    SOH.SExe
                FROM FAMSO AS SOH
                WHERE SOH.PrpCode = A.PrpCode
                  AND LTRIM(RTRIM(CONVERT(varchar(100), SOH.ParCode)))
                      = LTRIM(RTRIM(CONVERT(varchar(100), A.AccCode)))
                  AND NULLIF(LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), SOH.SExe), ''))), '') IS NOT NULL
                  AND LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), SOH.SExe), ''))) <> '0'
                ORDER BY ISNULL(SOH.SODate, 0) DESC, SOH.UID DESC
            ) AS HX

            WHERE A.MHead IN ({$mheadPlaceholders})
              AND A.ParType IN ({$parTypePlaceholders})
              AND A.PrpCode IN ({$prpCodePlaceholders})
              AND EXISTS
              (
                  SELECT 1
                  FROM FAMSali AS OS
                  WHERE OS.UId > 0
                    AND OS.PrpCode = A.PrpCode
                    AND LTRIM(RTRIM(CONVERT(varchar(100), OS.ParCode)))
                        = LTRIM(RTRIM(CONVERT(varchar(100), A.AccCode)))
              )
            GROUP BY
                CASE
                    WHEN NULLIF(LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), A.SExe), ''))), '') IS NOT NULL
                     AND LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), A.SExe), ''))) <> '0'
                        THEN LTRIM(RTRIM(CONVERT(varchar(50), A.SExe)))
                    WHEN NULLIF(LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), HX.SExe), ''))), '') IS NOT NULL
                     AND LTRIM(RTRIM(ISNULL(CONVERT(varchar(50), HX.SExe), ''))) <> '0'
                        THEN LTRIM(RTRIM(CONVERT(varchar(50), HX.SExe)))
                    ELSE '0'
                END

            HAVING
                SUM(ISNULL(A.ClBal, 0)) <> 0
        )

        SELECT
            EO.SExe,

            CASE
                WHEN EO.SExe = '0'
                    THEN 'UNASSIGNED'

                ELSE COALESCE(
                    NM.SExeName,
                    'EXECUTIVE ' + EO.SExe
                )
            END AS SexeName,

            EO.Outstanding

        FROM ExecutiveOutstanding AS EO

        OUTER APPLY
        (
            SELECT TOP 1
                NULLIF(
                    LTRIM(
                        RTRIM(
                            ISNULL(
                                CONVERT(varchar(250), G.LngName),
                                ''
                            )
                        )
                    ),
                    ''
                ) AS SExeName

            FROM GenSExe AS G

            WHERE
                LTRIM(
                    RTRIM(
                        CONVERT(varchar(50), G.SExe)
                    )
                ) = EO.SExe

                AND G.PrpCode IN ({$prpCodePlaceholders})

            ORDER BY
                G.PrpCode
        ) AS NM

        ORDER BY
            EO.Outstanding DESC,
            SexeName ASC
    ";

    /*
     * Binding order must exactly match placeholder order:
     *
     * ExecutiveOutstanding:
     *   MHead
     *   ParType
     *   PrpCode
     *
     * OUTER APPLY:
     *   PrpCode
     */
    $bindings = array_merge(
        $mheads,
        $parTypes,
        $prpcodes,
        $prpcodes
    );

    $data = DB::select(
        $sql,
        $bindings
    );

    /*
     * Executive-wise list total.
     */
    $totalDue = round(
        (float) collect($data)->sum(
            static function ($row) {
                return (float) ($row->Outstanding ?? 0);
            }
        ),
        2
    );

    /*
     * DIRECT RECONCILIATION
     *
     * IMPORTANT:
     * Uses exactly the same:
     *
     *     MHead IN (...)
     *     ParType IN (...)
     *     PrpCode IN (...)
     *
     * rules as the executive aggregation.
     */
    $directTotalRow = DB::table('FamAcc as A')
        ->selectRaw(
            '
            CAST(
                SUM(ISNULL(A.ClBal, 0))
                AS decimal(18, 2)
            ) AS TotalDue
            '
        )
        ->whereIn(
            'A.MHead',
            $mheads
        )
        ->whereIn(
            'A.ParType',
            $parTypes
        )
        ->whereIn(
            'A.PrpCode',
            $prpcodes
        )
    	->whereExists(function ($query) {
            $query
                ->select(DB::raw(1))
                ->from('FAMSali as OS')
                ->where('OS.UId', '>', 0)
                ->whereColumn('OS.PrpCode', 'A.PrpCode')
                ->whereRaw(
                    "LTRIM(RTRIM(CONVERT(varchar(100), OS.ParCode))) = " .
                    "LTRIM(RTRIM(CONVERT(varchar(100), A.AccCode)))"
                );
        })
        ->first();

    $directTotal = round(
        (float) ($directTotalRow->TotalDue ?? 0),
        2
    );

    $difference = round(
        $directTotal - $totalDue,
        2
    );

    $colors = [
        '#4CAF50',
        '#2196F3',
        '#E91E63',
        '#FF9800',
        '#9C27B0',
        '#009688',
        '#795548',
        '#3F51B5'
    ];

    return [
        /*
         * FamAcc.ClBal is a live balance. There is no trustworthy transaction
         * cutoff date in this source, so do not pretend it represents the
         * selected dashboard date. The UI explicitly labels it as live.
         */
        'period' => [
            'type' => 'live_balance',
            'from_ymd' => null,
            'requested_to_ymd' => null,
            'actual_to_ymd' => null,
            'pending_days' => null,
            'is_current_through_requested_date' => null,
            'display_label' => 'Live current balance',
            'freshness_label' => 'Live current balance',
        ],

        'total_due' => $totalDue,

        'by_exec' => collect($data)
            ->values()
            ->map(
                function ($row, $index) use ($colors) {
                    $execId = trim(
                        (string) ($row->SExe ?? '0')
                    );

                    if ($execId === '') {
                        $execId = '0';
                    }

                    return [
                        'exec_id' => $execId,

                        'name' => trim(
                            (string) (
                                $row->SexeName
                                ?? 'UNASSIGNED'
                            )
                        ),

                        'avatar_color' =>
                            $colors[
                                $index % count($colors)
                            ],

                        'outstanding' => round(
                            (float) (
                                $row->Outstanding ?? 0
                            ),
                            2
                        ),

                        'is_unassigned' =>
                            $execId === '0',
                    ];
                }
            )
            ->toArray(),

        'reconciliation' => [
            'direct_total' => $directTotal,

            'list_total' => $totalDue,

            'difference' => $difference,

            'is_reconciled' =>
                abs($difference) <= 0.01,

            'includes_negative_balances' => true,

            'includes_unassigned' => true,

            /*
             * Keep these during testing.
             * They make it immediately visible what Outstanding
             * actually included.
             */
            'filters' => [
                'mheads' => $mheads,
                'par_types' => $parTypes,
                'prpcodes' => $prpcodes,
            ],
        ],
    ];
}
}

// $controller = new OwnerDashboardController();
// $controller->getDashboard();
