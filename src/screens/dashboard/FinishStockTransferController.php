<?php
namespace App\Http\Controllers\API\Utilities;

use App\Http\Controllers\API\BaseController;
use App\Helpers\DatabaseConnection;
use DateTimeImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Finish Stock Transfer: master lookup, read-only voucher suggestion,
 * and read-only carton-level available stock.
 * Save uses a single ERP transaction. Modify/Delete remain disabled.
 */
class FinishStockTransferController extends BaseController
{
    private function context(Request $request): array
    {
        abort_unless(Auth::check(), 401, 'Unauthenticated.');
        return $request->validate([
            'prpcode' => ['required', 'string', 'max:3'],
            'yearno' => ['required', 'integer', 'between:1,99'],
            'strcode' => ['nullable', 'string', 'max:3'],
        ]);
    }

    /** Resolve the ERP FY database through the standard Property + Year flow. */
    private function connection(array $context)
    {
        $user = Auth::user();
        abort_unless($user, 401, 'Unauthenticated.');

        $prpCode = strtoupper(trim((string) $context['prpcode']));
        $yearNo = (int) $context['yearno'];

        $property = DB::connection('master')->table('GENProp')
            ->whereRaw('UPPER(LTRIM(RTRIM(PrpCode))) = ?', [$prpCode])
            ->first(['PrpCode']);
        abort_unless($property, 422, 'Selected ERP property does not exist.');

        $connectionName = DatabaseConnection::collectDb($user, $prpCode, $yearNo);
        if (!is_string($connectionName) || trim($connectionName) === '') {
            abort(503, 'Unable to resolve ERP database for selected Property and Year.');
        }
        DatabaseConnection::setDbConnection($connectionName);
        return DB::connection($connectionName);
    }

    /**
     * Lightweight master endpoint. No full-table master reads.
     * GET /meta => empty lookup collections (backward-compatible shape)
     * GET /meta?kind=items&item_store=<selected store> => first 50 items
     * GET /meta?kind=merges|grades|shades => first 50 masters
     * GET /meta?kind=items&item_store=<selected store>&search=X&limit=100
     * No minimum search length; always cap records returned.
     */
    public function meta(Request $request)
    {
        $ctx = $this->context($request);
        $input = $request->validate([
            'kind' => ['nullable', 'in:items,merges,grades,shades'],
            'search' => ['nullable', 'string', 'max:100'],
            'item_store' => ['nullable', 'string', 'max:3'],
            'limit' => ['nullable', 'integer', 'between:1,200'],
        ]);
        $kind = $input['kind'] ?? null;
        if (!$kind) {
            return response()->json(['data' => [
                'items'=>[], 'merges'=>[], 'grades'=>[], 'shades'=>[],
                'stores'=>[], 'reasons'=>[], 'defaults'=>[],
            ]]);
        }
        $search = trim((string) ($input['search'] ?? ''));
        $limit = (int) ($input['limit'] ?? 50);
        if ($kind === 'items' && trim((string) ($input['item_store'] ?? '')) === '') {
            return response()->json(['message'=>'Store is required for Item search.'],422);
        }
        try {
            $db = $this->connection($ctx);
            $mapping = [
                'items' => ['FAMItem','ItmCode','ItmName'],
                'merges' => ['DAPMerge','MerCode','MerName'],
                'grades' => ['DAPGrade','GrdCode','GrdName'],
                'shades' => ['DAPShade','ShdCode','ShdName'],
            ];
            [$table,$code,$name] = $mapping[$kind];
            $query = $db->table($table)->where('PrpCode', strtoupper(trim($ctx['prpcode'])));
            if ($kind === 'items') {
                $query->where('StrCode', (string) $input['item_store']);
            }
            // An empty search returns the initial batch, including on focus.
            // One-character searches are valid. Escape SQL LIKE metacharacters.
            if ($search !== '') {
                $escaped = str_replace(['[','%','_'], ['[[]','[%]','[_]'], $search);
                $query->where(function ($q) use ($code,$name,$escaped) {
                    $q->where($name, 'like', $escaped.'%')
                      ->orWhere($name, 'like', '%'.$escaped.'%')
                      ->orWhereRaw('CONVERT(VARCHAR(40), ['.$code.']) LIKE ?', [$escaped.'%']);
                });
            }
            $columns = [$code,$name];
            if ($kind === 'items') {
                $columns[] = 'StrCode';
                $columns[] = 'Denier';
            }
            // TOP (limit + 1) detects whether another batch is available without
            // loading the full master or relying on OFFSET/FETCH (older SQL Server).
            $rows = $query->select($columns)->orderBy($name)->orderBy($code)
                ->limit($limit + 1)->get();
            $hasMore = $rows->count() > $limit;
            $results = $rows->take($limit)
                ->map(function ($row) use ($code,$name,$kind) {
                    $result = ['code'=>(string)$row->{$code},'name'=>trim((string)$row->{$name})];
                    if ($kind === 'items') {
                        $result['strcode'] = (string)$row->StrCode;
                        $result['denier'] = $row->Denier;
                    }
                    return $result;
                })->values();
            return response()->json(['data'=>['results'=>$results, 'has_more'=>$hasMore, 'limit'=>$limit]]);
        } catch (Throwable $e) {
            Log::error('FST search failed', ['kind'=>$kind,'prpcode'=>$ctx['prpcode'],
                'yearno'=>$ctx['yearno'],'error'=>$e->getMessage()]);
            return response()->json(['message'=>'ERP master search failed; see server logs.'],500);
        }
    }

    /** Strict date conversion without PHP's permissive date rollover. */
    private function normalizeTransferDate($input): DateTimeImmutable
    {
        $raw = trim((string) $input);
        $formats = [
            '/^\d{8}$/' => ['Ymd', 'dmY'],
            '/^\d{4}-\d{2}-\d{2}$/' => ['Y-m-d'],
            '/^\d{2}-\d{2}-\d{4}$/' => ['d-m-Y'],
            '~^\d{2}/\d{2}/\d{4}$~' => ['d/m/Y'],
        ];
        foreach ($formats as $pattern => $candidates) {
            if (!preg_match($pattern, $raw)) {
                continue;
            }
            foreach ($candidates as $format) {
                $date = DateTimeImmutable::createFromFormat('!' . $format, $raw);
                if ($date && $date->format($format) === $raw) {
                    return $date;
                }
            }
            break;
        }
        abort(422, 'Invalid Transfer Date. Use DD-MM-YYYY, DDMMYYYY, YYYYMMDD, or YYYY-MM-DD.');
    }

    /**
     * GET /api/finish-stock-transfer/voucher-suggestion
     * Read only: no GENID reservation or increment. If voucher_no is provided,
     * check manual voucher availability in the selected property/FY/type/month.
     * The final Save method MUST revalidate with transactional locking.
     */
    public function voucherSuggestion(Request $request)
    {
        $ctx = $this->context($request);
        $values = $request->validate([
            'trantype' => ['required', 'in:83,93'],
            'trfdate' => ['required', 'string', 'max:20'],
            'suffix' => ['nullable', 'string', 'max:12', 'regex:/^[A-Za-z0-9_-]*$/'],
            'voucher_no' => ['sometimes', 'required', 'string', 'regex:/^[0-9]{1,5}$/'],
        ]);
        $prpcode = strtoupper(trim((string) $ctx['prpcode']));
        $trantype = (string) $values['trantype'];
        $date = $this->normalizeTransferDate($values['trfdate']);
        $suffix = isset($values['suffix']) ? trim($values['suffix']) : '';
        $isManual = array_key_exists('voucher_no', $values);
        $manualSequence = $isManual ? (int) $values['voucher_no'] : null;
        if ($isManual && $manualSequence < 1) {
            return response()->json([
                'message' => 'Voucher number must be between 00001 and 99999.',
                'code' => 'FST_VOUCHER_INVALID',
            ], 422);
        }
        $month = $date->format('m');
        // The ERP voucher prefix is the transfer month; the number is 5 digits.
        // Type 83 and 93 use separate GENID keys for each month.
        $key = 'POYTrf' . $trantype . $month;

        try {
            $erp = $this->connection($ctx);

            // GENID.CodeNo is the next number for this property/key.
            $counter = $erp->table('GENID')
                ->where('PrpCode', $prpcode)
                ->where('TblName', $key)
                ->first(['CodeNo']);
            $nextFromGenid = max(1, $counter ? (int) $counter->CodeNo : 1);

            // Read the latest saved transfer voucher as a safeguard against
            // an absent/stale counter. Fixed-width numbers sort lexically.
            $pattern = $month . '/[0-9][0-9][0-9][0-9][0-9]%';
            $lastSaved = $erp->table('POYTrf')
                ->where('PrpCode', $prpcode)
                ->where('TranType', (int) $trantype)
                ->where('TrfNo', 'like', $pattern)
                ->whereRaw('(LEN(RTRIM([TrfNo])) = 8 OR SUBSTRING([TrfNo], 9, 1) = ?)', ['/'])
                ->max('TrfNo');

            $lastSavedNumber = 0;
            if (is_string($lastSaved) &&
                preg_match('~^' . $month . '/([0-9]{5})(?:/[^/]*)?$~', trim($lastSaved), $m)) {
                $lastSavedNumber = (int) $m[1];
            }

            // Manual numbers are never allocated from GENID here. This is
            // only a read-only duplicate check, and does not reserve them.
            $sequence = $isManual ? $manualSequence : max($nextFromGenid, $lastSavedNumber + 1);
            if ($sequence > 99999) {
                return response()->json([
                    'message' => 'Five-digit voucher counter exhausted for this month.',
                    'code' => 'FST_VOUCHER_LIMIT',
                ], 409);
            }
            $voucherNumber = str_pad((string) $sequence, 5, '0', STR_PAD_LEFT);
            $number = $month . '/' . $voucherNumber;
            if ($suffix !== '') {
                $number .= '/' . $suffix;
            }
            // POYTrf does not have YearNo: selected ERP FY database provides
            // the year boundary. TranType keeps 83/93 voucher series separate.
            $existingVoucher = $erp->table('POYTrf')
                ->where('PrpCode', $prpcode)
                ->where('TranType', (int) $trantype)
                ->where('TrfNo', $number)
                ->exists();

            return response()->json(['data' => [
                'trantype' => $trantype,
                'trfdate' => $date->format('d-m-Y'),
                'trfdate_iso' => $date->format('Y-m-d'),
                'month' => $month,
                'counter_key' => $key,
                'voucher_prefix' => $month,
                'voucher_no' => $voucherNumber,
                'trfno' => $number,
                'suffix' => $suffix,
                'sequence' => $sequence,
                'genid_next' => $nextFromGenid,
                'last_saved_sequence' => $lastSavedNumber,
                'counter_out_of_sync' => $nextFromGenid < ($lastSavedNumber + 1),
                'is_manual' => $isManual,
                'available' => !$existingVoucher,
                'already_exists' => $existingVoucher,
                'provisional' => true,
            ]]);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('FST voucher suggestion failed', [
                'prpcode' => $prpcode, 'yearno' => $ctx['yearno'],
                'trantype' => $trantype, 'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Voucher suggestion is unavailable. Check ERP connection and server logs.',
                'code' => 'FST_VOUCHER_SUGGESTION_FAILED',
            ], 500);
        }
    }

    private function unavailable()
    {
        return response()->json([
            'message' => 'Stock posting is not enabled until ERP stock locking, voucher allocation, and permission checks are integrated.',
            'code' => 'FST_STOCK_POSTING_NOT_READY',
        ], 501);
    }

    public function index(Request $r) { $this->context($r); return $this->unavailable(); }
    /**
     * Read-only, carton-level available stock for the selected source store.
     * Supported source families follow the Rayons stock report: purchase (3),
     * packing (8), and transfers (83/93). No stock balances are changed here.
     * Other ERP inward transaction families are intentionally not invented.
     */
    public function stock(Request $request)
    {
        $ctx = $this->context($request);
        $input = $request->validate([
            'trantype' => ['required', 'in:83,93'],
            'itmcode' => ['required', 'string', 'max:20'],
            'mercode' => ['nullable', 'string', 'max:20'],
            'grdcode' => ['nullable', 'string', 'max:20'],
            'shdcode' => ['nullable', 'string', 'max:20'],
            'limit' => ['nullable', 'integer', 'between:1,1000'],
        ]);
        $store = trim((string) ($ctx['strcode'] ?? ''));
        if ($store === '') {
            return response()->json(['message' => 'Source Store is required.'], 422);
        }
        $prp = strtoupper(trim((string) $ctx['prpcode']));
        $item = trim((string) $input['itmcode']);
        $limit = (int) ($input['limit'] ?? 500);

        try {
            $db = $this->connection($ctx);
            // Confirm the selected item belongs to the selected property/store.
            $exists = $db->table('FAMItem')->where('PrpCode', $prp)
                ->where('StrCode', $store)->where('ItmCode', $item)->exists();
            if (!$exists) {
                return response()->json(['message' => 'Item does not belong to the selected source store.'], 422);
            }

            $filters = function ($q, $header) use ($prp, $store, $item, $input) {
                $q->where($header.'.PrpCode', $prp)
                  ->where($header.'.StrCode', $store)
                  ->where($header.'.ItmCode', $item);
                foreach (['mercode' => 'MerCode', 'grdcode' => 'GrdCode', 'shdcode' => 'ShdCode'] as $key => $column) {
                    if (isset($input[$key]) && trim((string) $input[$key]) !== '') {
                        $q->where($header.'.'.$column, $input[$key]);
                    }
                }
                return $q;
            };

            // Purchase inward cartons (TranType 3).
            $purchase = $db->table('FAMPurD2 as d')
                ->join('FAMPurD1 as h', function ($j) {
                    $j->on('h.UId', '=', 'd.UId')->on('h.SrNo', '=', 'd.SrNo');
                })
                ->join('FAMPur as p', 'p.UId', '=', 'h.UId');
            // FAMPurD1 has StrCode/Item/Merge/Grade/Shade, but NO PrpCode.
            // PrpCode belongs to the purchase header FAMPur.
            $purchase->where('p.PrpCode', $prp)
                ->where('h.StrCode', $store)
                ->where('h.ItmCode', $item);
            foreach (['mercode' => 'MerCode', 'grdcode' => 'GrdCode', 'shdcode' => 'ShdCode'] as $key => $column) {
                if (isset($input[$key]) && trim((string) $input[$key]) !== '') {
                    $purchase->where('h.'.$column, $input[$key]);
                }
            }
            $purchase->where('d.BalQty', '>', 0)
                ->selectRaw('3 AS trantype, d.UId AS prouid, d.SrNo AS prosrno, d.SubSr AS prosubsr, d.CartNo AS cartno, d.QtyWt AS qty, d.BalQty AS balqty, d.Chees AS chees');

            // Packed yarn cartons (TranType 8). SubSr is zero in the stock report.
            $packing = $db->table('POYProdD1 as d')
                ->join('POYProd as h', 'h.UId', '=', 'd.UId');
            $filters($packing, 'h');
            // EntType is on POYProd (h), not POYProdD1 (d).
            $packing->where('d.BalWt', '>', 0)->where('d.NetWt', '>', 0)
                ->where(function ($q) {
                    $q->whereNull('h.EntType')->orWhere('h.EntType', '<>', 'R');
                })
                ->selectRaw('8 AS trantype, d.UId AS prouid, d.SrNo AS prosrno, 0 AS prosubsr, d.CartNo AS cartno, d.NetWt AS qty, d.BalWt AS balqty, d.Chees AS chees');

            // Transfer inward cartons (83 and 93), destination identity in POYTrf.
            $transfer = $db->table('POYTrfD1 as d')
                ->join('POYTrf as h', 'h.UId', '=', 'd.UId');
            $filters($transfer, 'h');
            $transfer->whereIn('h.TranType', [83, 93])->where('d.BalQty', '>', 0)
                ->where(function ($q) {
                    $q->where('h.TranType', '<>', 83)
                      ->orWhereNull('d.JobType')->orWhere('d.JobType', '<>', 2);
                })
                ->selectRaw('h.TranType AS trantype, d.UId AS prouid, d.SrNo AS prosrno, 0 AS prosubsr, d.CartNo AS cartno, d.Qty AS qty, d.BalQty AS balqty, d.Chees AS chees');

            // UNION ALL keeps original source references; the outer cap prevents
            // unbounded JSON and AG Grid rendering. No writes or table locks.
            $union = $purchase->unionAll($packing)->unionAll($transfer);
            $rows = $db->query()->fromSub($union, 's')
                ->orderBy('trantype')->orderBy('prouid')->orderBy('prosrno')
                ->orderBy('prosubsr')->limit($limit + 1)->get();
            $truncated = $rows->count() > $limit;
            $rows = $rows->take($limit)->map(function ($r) {
                return [
                    'key' => implode('|', [$r->trantype, $r->prouid, $r->prosrno, $r->prosubsr, $r->cartno]),
                    'trantype' => (int) $r->trantype,
                    'prouid' => (string) $r->prouid,
                    'prosrno' => (string) $r->prosrno,
                    'prosubsr' => (string) $r->prosubsr,
                    'cartno' => (string) $r->cartno,
                    'qty' => (float) $r->qty,
                    'balqty' => (float) $r->balqty,
                    'chees' => (float) $r->chees,
                    'tranname' => [3 => 'Purchase', 8 => 'Packing', 83 => 'Sample To Finish', 93 => 'POY To Finish'][(int) $r->trantype] ?? 'Transfer',
                ];
            })->values();
            return response()->json(['data' => [
                'rows' => $rows,
                'truncated' => $truncated,
                'limit' => $limit,
                'supported_source_types' => [3, 8, 83, 93],
            ]]);
        } catch (Throwable $e) {
            Log::error('FST available stock lookup failed', [
                'prpcode' => $prp, 'yearno' => $ctx['yearno'],
                'strcode' => $store, 'itmcode' => $item,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Available stock lookup failed; check Laravel logs for the SQL error.',
                'code' => 'FST_STOCK_LOOKUP_FAILED',
            ], 500);
        }
    }
    public function show(Request $r, string $uid) { $this->context($r); return $this->unavailable(); }
    /** Reuse the exact existing /api/checkrights authority, server-side. */
    private function assertCanAdd(Request $request): void
    {
        $user = Auth::user();
        abort_unless($user, 401, 'Unauthenticated.');
        // Only the authenticated user can be checked; no user_id from POST.
        $rightsRequest = Request::create('/api/checkrights', 'GET', [
            'permission' => 'Finish Stock Transfer',
            'user_id' => $user->id,
            'txntype' => 'finish_stock_transfer',
        ]);
        $rightsRequest->headers->replace($request->headers->all());
        $rightsRequest->setUserResolver(function () use ($user) { return $user; });
        $controller = app(\App\Http\Controllers\API\AccountController::class);
        $response = $controller->checkrights($rightsRequest);
        $body = is_object($response) && method_exists($response, 'getData')
            ? $response->getData(true) : (is_array($response) ? $response : []);
        abort_unless(($body['success'] ?? false) === true, 403,
            'Unable to verify Finish Stock Transfer Add permission.');
        $rows = $body['response']['module_rights'] ?? [];
        $allowed = false;
        foreach (is_array($rows) ? $rows : [] as $row) {
            if (strtolower((string) ($row['txntype'] ?? '')) === 'finish_stock_transfer'
                && (string) ($row['add'] ?? '') === '1') {
                $allowed = true;
            }
        }
        abort_unless($allowed, 403, 'You do not have Add permission for Finish Stock Transfer.');
    }

    private function erpDefault($db, string $prpcode, int $number): string
    {
        $row = $db->table('GENDefaults')->where('PrpCode', $prpcode)
            ->where('DNo', $number)->first(['DValue']);
        $code = $row ? trim((string) $row->DValue) : '';
        abort_unless($code !== '', 422, 'ERP Store default '.$number.' is missing for selected Property.');
        return $code;
    }

    private function nextErpUid($db, string $counterKey, string $table, int $base): string
    {
        // GENID PK (PrpCode,TblName). Empty PrpCode is the legacy global UID series.
        $row = $db->table('GENID')->where('PrpCode', '')
            ->where('TblName', $counterKey)->lockForUpdate()->first(['CodeNo']);
        $next = $row ? (int) $row->CodeNo : $base;
        // Legacy integrations may advance records without synchronising GENID.
        $highest = (int) $db->table($table)->max('UId');
        $next = max($next, $highest + 1, $base);
        abort_unless($next > 0 && $next < 999999999999, 409, 'ERP UID allocation exhausted.');
        if ($row) {
            $db->table('GENID')->where('PrpCode', '')->where('TblName', $counterKey)
                ->update(['CodeNo' => (string) ($next + 1)]);
        } else {
            $db->table('GENID')->insert([
                'PrpCode' => '', 'TblName' => $counterKey, 'CodeNo' => (string) ($next + 1),
            ]);
        }
        return (string) $next;
    }

    /** Verify the exact original carton and return the authoritative balance/metadata. */
    private function getLockedSource($db, string $prp, string $store, string $item, array $f, array $line)
    {
        $tran = (int) $line['trantype'];
        $uid = (string) $line['prouid'];
        $sr = (int) $line['prosrno'];
        $sub = (int) $line['prosubsr'];
        if ($tran === 3) {
            $q = $db->table('FAMPurD2 as d')
                ->join('FAMPurD1 as h', function ($j) {
                    $j->on('h.UId', '=', 'd.UId')->on('h.SrNo', '=', 'd.SrNo');
                })->join('FAMPur as p', 'p.UId', '=', 'h.UId')
                ->where('p.PrpCode', $prp)->where('h.StrCode', $store)
                ->where('h.ItmCode', $item)
                ->where('d.UId', $uid)->where('d.SrNo', $sr)->where('d.SubSr', $sub)
                ->selectRaw('d.CartNo as cartno, d.BalQty as balance, d.Chees as chees,
                    COALESCE(d.ProdType,\'\') as prodtype, COALESCE(d.GrsWt,0) as grsqty,
                    p.InwDate as source_date, h.MerCode as mercode, h.GrdCode as grdcode, h.ShdCode as shdcode');
        } elseif ($tran === 8) {
            abort_unless($sub === 0, 422, 'Packing carton sub-number must be zero.');
            $q = $db->table('POYProdD1 as d')->join('POYProd as h', 'h.UId', '=', 'd.UId')
                ->where('h.PrpCode', $prp)->where('h.StrCode', $store)
                ->where('h.ItmCode', $item)
                ->where('d.UId', $uid)->where('d.SrNo', $sr)
                ->where(function ($q) { $q->whereNull('h.EntType')->orWhere('h.EntType', '<>', 'R'); })
                ->selectRaw('d.CartNo as cartno, d.BalWt as balance, d.Chees as chees,
                    h.ProdType as prodtype, d.GrossWt as grsqty,
                    h.PDate as source_date, h.MerCode as mercode, h.GrdCode as grdcode, h.ShdCode as shdcode');
        } else {
            abort_unless($sub === 0, 422, 'Transfer carton sub-number must be zero.');
            $q = $db->table('POYTrfD1 as d')->join('POYTrf as h', 'h.UId', '=', 'd.UId')
                ->where('h.PrpCode', $prp)->where('h.StrCode', $store)
                ->where('h.ItmCode', $item)->where('h.TranType', $tran)
                ->where('d.UId', $uid)->where('d.SrNo', $sr)
                ->where(function ($q) use ($tran) {
                    if ($tran === 83) $q->where('d.JobType', '<>', 2);
                })
                ->selectRaw('d.CartNo as cartno, d.BalQty as balance, d.Chees as chees,
                    d.ProdType as prodtype, d.GrsQty as grsqty,
                    h.TrfDate as source_date, h.MerCode as mercode, h.GrdCode as grdcode, h.ShdCode as shdcode');
        }
        foreach (['from_merge' => 'mercode', 'from_grade' => 'grdcode', 'from_shade' => 'shdcode'] as $key => $col) {
            if (isset($f[$key]) && (string) $f[$key] !== '') {
                $column = ['mercode' => 'MerCode', 'grdcode' => 'GrdCode', 'shdcode' => 'ShdCode'][$col];
                $q->where('h.'.$column, $f[$key]);
            }
        }
        $row = $q->lockForUpdate()->first();
        abort_unless($row && trim((string) $row->cartno) === trim((string) $line['cartno']), 409,
            'The selected carton is no longer available in the chosen source. Reload Stock.');
        return $row;
    }

    /** Take a complete available carton; never trust client balance alone. */
    private function deductSource($db, array $line, $source, float $quantity): void
    {
        $tran = (int) $line['trantype'];
        $uid = (string) $line['prouid'];
        $sr = (int) $line['prosrno'];
        $sub = (int) $line['prosubsr'];
        if ($tran === 3) {
            $d2 = $db->table('FAMPurD2')->where('UId', $uid)->where('SrNo', $sr)->where('SubSr', $sub);
            $n = $d2->where('BalQty', '>=', $quantity)->update([
                'BalQty' => DB::raw('BalQty - '.number_format($quantity, 3, '.', '')),
                'TrfMtr' => DB::raw('TrfMtr + '.number_format($quantity, 3, '.', '')),
            ]);
            abort_unless($n === 1, 409, 'Purchase carton balance changed. Reload Stock.');
            // Maintain the purchase D1 summary as well as carton-level D2.
            $d1 = $db->table('FAMPurD1')->where('UId', $uid)->where('SrNo', $sr);
            $n = $d1->where('BQty', '>=', $quantity)->update([
                'BQty' => DB::raw('BQty - '.number_format($quantity, 3, '.', '')),
                'BQtyPcs' => DB::raw('CASE WHEN BQtyPcs > 0 THEN BQtyPcs - 1 ELSE BQtyPcs END'),
            ]);
            abort_unless($n === 1, 409, 'Purchase D1 summary is inconsistent with carton stock. Transaction rolled back.');
        } elseif ($tran === 8) {
            $n = $db->table('POYProdD1')->where('UId', $uid)->where('SrNo', $sr)
                ->where('BalWt', '>=', $quantity)->update([
                    'BalWt' => DB::raw('BalWt - '.number_format($quantity, 3, '.', '')),
                    'Issued' => 1,
                    'BalChees' => 0,
                ]);
            abort_unless($n === 1, 409, 'Packing carton balance changed. Reload Stock.');
        } else {
            $n = $db->table('POYTrfD1')->where('UId', $uid)->where('SrNo', $sr)
                ->where('BalQty', '>=', $quantity)->update([
                    'BalQty' => DB::raw('BalQty - '.number_format($quantity, 3, '.', '')),
                ]);
            abort_unless($n === 1, 409, 'Transfer carton balance changed. Reload Stock.');
        }
    }

    /** POST /api/finish-stock-transfer. Existing Modify/Delete intentionally remain disabled. */
    public function store(Request $request)
    {
        $ctx = $this->context($request);
        $this->assertCanAdd($request);
        $input = $request->validate([
            'trantype' => ['required', 'in:83,93'],
            'trfdate' => ['required', 'string', 'max:20'],
            'trfno' => ['required', 'string', 'regex:/^[0-9]{2}\/[0-9]{5}$/'],
            'from_store' => ['required', 'string', 'max:3'],
            'from_item' => ['required', 'integer', 'min:1'],
            'to_store' => ['nullable', 'string', 'max:3'],
            'to_item' => ['nullable', 'integer', 'min:1'],
            'to_merge' => ['nullable', 'integer', 'min:0'],
            'to_grade' => ['nullable', 'integer', 'min:0'],
            'to_shade' => ['nullable', 'integer', 'min:0'],
            'from_merge' => ['nullable', 'integer', 'min:0'],
            'from_grade' => ['nullable', 'integer', 'min:0'],
            'from_shade' => ['nullable', 'integer', 'min:0'],
            'reason' => ['required', 'string', 'max:3'],
            'remark' => ['nullable', 'string', 'max:50'],
            'lines' => ['required', 'array', 'min:1', 'max:500'],
            'lines.*.trantype' => ['required', 'integer', 'in:3,8,83,93'],
            'lines.*.prouid' => ['required', 'numeric'],
            'lines.*.prosrno' => ['required', 'integer', 'min:1'],
            'lines.*.prosubsr' => ['required', 'integer', 'min:0'],
            'lines.*.cartno' => ['required', 'string', 'max:20'],
            'lines.*.qty' => ['required', 'numeric', 'gt:0'],
        ]);
        $prp = strtoupper(trim((string) $ctx['prpcode']));
        $date = $this->normalizeTransferDate($input['trfdate']);
        $month = $date->format('m');
        $number = trim((string) $input['trfno']);
        abort_unless(substr($number, 0, 2) === $month, 422,
            'Voucher prefix must match the Transfer Date month.');
        $sequence = (int) substr($number, 3);
        abort_unless($sequence > 0, 422, 'Voucher number must be greater than zero.');
        $transferType = (int) $input['trantype'];
        $fromStore = trim((string) $input['from_store']);
        $db = $this->connection($ctx);
        $posted = null;
        try {
            $posted = $db->transaction(function () use ($db, $prp, $date, $input, $ctx,
                $month, $number, $sequence, $transferType, $fromStore) {
                // Transaction-scoped SQL Server application lock serialises all
                // web Save operations in this voucher series. Combined with
                // locked source rows and GENID PK locks, it prevents duplicate
                // web posts and simultaneous consumption of the same carton.
                $resource = sprintf('FST:%s:%s:%s:%s', $prp, $ctx['yearno'], $transferType, $month);
                $appLock = $db->selectOne(
                    'DECLARE @result int; EXEC @result = sp_getapplock '
                    . "@Resource = ?, @LockMode = 'Exclusive', "
                    . "@LockOwner = 'Transaction', @LockTimeout = 8000; "
                    . 'SELECT @result AS lock_result', [$resource]
                );
                abort_unless($appLock && (int) $appLock->lock_result >= 0, 409,
                    'Another Finish Stock Transfer is being saved. Please retry.');
                // ERP Default 28 = POY / 186 = Sample / 34 = Finished.
                $expectedFrom = $this->erpDefault($db, $prp, $transferType === 83 ? 186 : 28);
                $finishStore = $this->erpDefault($db, $prp, 34);
                abort_unless($fromStore === $expectedFrom, 422, 'Source Store does not match ERP transaction type default.');
                abort_unless(empty($input['to_store']) || trim((string) $input['to_store']) === $finishStore,
                    422, 'Destination must be the ERP Finished Store.');
                $fromItem = (string) $input['from_item'];
                $toItem = (string) ($transferType === 83 ? $input['from_item'] : ($input['to_item'] ?? ''));
                abort_unless(ctype_digit($toItem) && (int) $toItem > 0, 422, 'Destination Item is required.');
                abort_unless($db->table('FAMItem')->where('PrpCode', $prp)
                    ->where('StrCode', $fromStore)->where('ItmCode', $fromItem)->exists(),
                    422, 'Source Item does not exist in selected Store.');
                $destination = $db->table('FAMItem')->where('PrpCode', $prp)
                    ->where('StrCode', $finishStore)->where('ItmCode', $toItem)->first(['Denier']);
                abort_unless($destination, 422, 'Destination Item does not exist in ERP Finished Store.');
                $reasonValid = $db->table('GENReason')->where('RsnCode', $input['reason'])
                    ->where('SubMCode', 'DAP')->where('Status', '<>', 'P')->exists();
                abort_unless($reasonValid, 422, 'Selected Reason is invalid or inactive.');
                // SQL Server UPDLOCK/HOLDLOCK on POYTrf prevents the same voucher
                // from being inserted concurrently, even though the legacy table
                // does not have a dedicated voucher unique index.
                $already = $db->table('POYTrf')->where('PrpCode', $prp)
                    ->where('TranType', $transferType)->where('TrfNo', $number)
                    ->lockForUpdate()->exists();
                abort_unless(!$already, 409, 'Voucher already exists. Change the number and retry.');
                // Validate/lock all original stock rows before consuming a UID.
                $details = [];
                $seen = [];
                $sum = 0.0;
                foreach ($input['lines'] as $line) {
                    $ident = implode('|', [$line['trantype'], $line['prouid'], $line['prosrno'], $line['prosubsr']]);
                    abort_unless(!isset($seen[$ident]), 422, 'Duplicate source carton in selected rows.');
                    $seen[$ident] = true;
                    $source = $this->getLockedSource($db, $prp, $fromStore, $fromItem, $input, $line);
                    $sourceDate = (int) ($source->source_date ?? 0);
                    abort_unless($sourceDate === 0 || $sourceDate <= (int) $date->format('Ymd'), 409,
                        'The selected carton was received after the Transfer Date.');
                    $available = round((float) $source->balance, 3);
                    $qty = round((float) $line['qty'], 3);
                    abort_unless($available > 0 && abs($available - $qty) < 0.0005, 409,
                        'Carton balance changed since Load Stock. Reload and reselect cartons.');
                    $details[] = ['line' => $line, 'source' => $source, 'qty' => $qty];
                    $sum += $qty;
                }
                // Calculate final destination selection. Type 83 follows legacy
                // form: source and finished item identity matches. 93 can convert.
                $mer = (int) ($transferType === 83 ? ($input['from_merge'] ?? 0) : ($input['to_merge'] ?? $input['from_merge'] ?? 0));
                $grd = (int) ($transferType === 83 ? ($input['from_grade'] ?? 0) : ($input['to_grade'] ?? $input['from_grade'] ?? 0));
                $shd = (int) ($transferType === 83 ? ($input['from_shade'] ?? 0) : ($input['to_shade'] ?? $input['from_shade'] ?? 0));
                // When source attributes were not explicitly picked, preserve
                // them from the authoritative stock row rather than invent 0.
                if ($mer === 0 && $details) $mer = (int) $details[0]['source']->mercode;
                if ($grd === 0 && $details) $grd = (int) $details[0]['source']->grdcode;
                if ($shd === 0 && $details) $shd = (int) $details[0]['source']->shdcode;
                abort_unless($sum > 0, 422, 'No positive stock selected.');
                $uidBase = (int) ($db->table('GENDefaults')->where('PrpCode', $prp)
                    ->where('DNo', 55)->value('DValue') ?? 0);
                abort_unless($uidBase > 0, 409, 'GENDefaults UID base (55) is missing.');
                $newUid = $this->nextErpUid($db, 'POYTRANSFERUID', 'POYTrf', $uidBase);
                $famiUid = $this->nextErpUid($db, 'FAMITRANSUID', 'FAMITrans', 1);
                // Advance the exact property/type/month counter. Manual numbers
                // may never move GENID backwards.
                $voucherKey = 'POYTrf'.$transferType.$month;
                $counterRow = $db->table('GENID')->where('PrpCode', $prp)
                    ->where('TblName', $voucherKey)->lockForUpdate()->first(['CodeNo']);
                $nextVoucher = max($counterRow ? (int) $counterRow->CodeNo : 1, $sequence + 1);
                if ($counterRow) {
                    $db->table('GENID')->where('PrpCode', $prp)->where('TblName', $voucherKey)
                        ->update(['CodeNo' => (string) $nextVoucher]);
                } else {
                    $db->table('GENID')->insert(['PrpCode' => $prp, 'TblName' => $voucherKey,
                        'CodeNo' => (string) $nextVoucher]);
                }
                $today = (int) date('Ymd');
                $time = (float) date('H.i');
                $usr = substr((string) (Auth::user()->name ?? Auth::id()), 0, 10);
                $db->table('POYTrf')->insert([
                    'UId' => $newUid, 'PrpCode' => $prp, 'TranType' => $transferType,
                    'TrfNo' => $number, 'TrfDate' => (int) $date->format('Ymd'),
                    'StrCode' => $finishStore, 'ItmCode' => (int) $toItem,
                    'MerCode' => $mer, 'GrdCode' => $grd, 'ShdCode' => $shd,
                    'Denier' => substr(trim((string) $destination->Denier), 0, 20),
                    'RsnCode' => $input['reason'], 'Remark' => trim((string) ($input['remark'] ?? '')),
                    'UsrCode' => $usr, 'LastDate' => $today, 'LastTime' => $time,
                ]);
                foreach ($details as $i => $d) {
                    $line = $d['line'];
                    $source = $d['source'];
                    $qty = $d['qty'];
                    $this->deductSource($db, $line, $source, $qty);
                    $db->table('POYTrfD1')->insert([
                        'UId' => $newUid, 'SrNo' => $i + 1,
                        'TranType' => (int) $line['trantype'],
                        'ProUId' => $line['prouid'], 'ProSrNo' => (int) $line['prosrno'],
                        'ProSubSr' => (int) $line['prosubsr'],
                        'CartNo' => trim((string) $line['cartno']),
                        'Chees' => (int) $source->chees,
                        'Qty' => $qty, 'BalQty' => $qty,
                        'ProdType' => substr((string) ($source->prodtype ?? ''), 0, 3),
                        'GrsQty' => round((float) ($source->grsqty ?? 0), 3),
                        'JobType' => 0,
                        'Wt' => 0,
                    ]);
                }
                // Legacy FrmTransfer.vb explicitly writes FAMITrans for type 83.
                // We apply the same destination inward summary for type 93.
                // GrdCode/ShdCode are intentionally swapped to preserve VB
                // GetOtherQry() legacy mapping used by existing reports.
                $db->table('FAMITrans')->insert([
                    'UId' => $famiUid, 'PrpCode' => $prp, 'StrCode' => $finishStore,
                    'TDate' => (int) $date->format('Ymd'),
                    'TranType' => $transferType, 'TUId' => $newUid,
                    'ItmCode' => (int) $toItem,
                    'MerCode' => $mer, 'GrdCode' => $shd, 'ShdCode' => $grd,
                    'Denier' => substr(trim((string) $destination->Denier), 0, 20),
                    'Qty' => round($sum, 3), 'QtyPcs' => count($details),
                    'TSrNo' => 1, 'VouchNo' => $number,
                    'Remark' => trim((string) ($input['remark'] ?? '')),
                ]);
                return ['uid' => $newUid, 'trfno' => $number,
                    'trantype' => $transferType, 'quantity' => round($sum, 3),
                    'cartons' => count($details), 'fami_uid' => $famiUid];
            }, 1);
            return response()->json(['message' => 'Transfer saved successfully.', 'data' => $posted], 201);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('FST Save rolled back', [
                'property' => $prp, 'yearno' => $ctx['yearno'],
                'trantype' => $transferType, 'voucher' => $number,
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'code' => 'FST_SAVE_FAILED',
                'message' => 'Save failed and was rolled back. See Laravel logs.',
            ], 500);
        }
    }

    public function update(Request $r, string $uid) { $this->context($r); return $this->unavailable(); }
    public function destroy(Request $r, string $uid) { $this->context($r); return $this->unavailable(); }
}
