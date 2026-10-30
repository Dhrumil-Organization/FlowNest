<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

class AppRegistryService
{
    protected $connection = 'master';

    /**
     * Areas that an OLDER client does not know yet (the phone app before its update has no Mill Hub module).
     * A full-snapshot sync WITHOUT such an area must not switch its resources off — otherwise every
     * Platform-Admin login on the old app made the Mill rights disappear (resources inactive → the role /
     * user rows are no longer shown in Permission Manager and no Mill right / Mills switch works).
     * A client that DOES send the area still syncs it normally (incl. removing retired children).
     */
    protected const KEEP_WHEN_ABSENT = ['mill'];

    public function isReady(): bool
    {
        try {
            $schema = Schema::connection($this->connection);
            foreach (['app_business_areas','app_resources','app_resource_actions','app_registry_sync_state','app_registry_sync_logs'] as $table) {
                if (!$schema->hasTable($table)) return false;
            }
            return true;
        } catch (\Throwable $e) { return false; }
    }

    public function status(): array
    {
        if (!$this->isReady()) return ['ready'=>false,'registry_hash'=>'','client_version'=>''];
        $row = DB::connection($this->connection)->table('app_registry_sync_state')->where('id',1)->first();
        return [
            'ready'=>true,
            'registry_hash'=>$row ? (string)$row->registry_hash : '',
            'client_version'=>$row ? (string)$row->client_version : '',
            'resource_count'=>$row ? (int)$row->resource_count : 0,
            'action_count'=>$row ? (int)$row->action_count : 0,
            'last_synced_at'=>$row ? $row->last_synced_at : null,
        ];
    }

    public function sync(array $payload, $userId = null, $clientVersion = null): array
    {
        if (!$this->isReady()) throw new InvalidArgumentException('App access V2 tables are not installed.');
        $areas = isset($payload['areas']) && is_array($payload['areas']) ? $payload['areas'] : [];
        if (!$areas) throw new InvalidArgumentException('Registry payload must contain areas.');

        $hash = strtolower(trim((string)($payload['registry_hash'] ?? '')));
        if ($hash === '') $hash = hash('sha256', json_encode($areas));
        $version = (string)($clientVersion ?: ($payload['client_version'] ?? ''));
        $fullSnapshot = !array_key_exists('full_snapshot',$payload) || (bool)$payload['full_snapshot'];
        $stats=['areas_received'=>0,'resources_received'=>0,'actions_received'=>0,'inserted_count'=>0,'updated_count'=>0,'deactivated_count'=>0];
        $seenAreaIds=[]; $seenPaths=[]; $seenActions=[];
        $db=DB::connection($this->connection);

        // protected areas missing from this payload (see KEEP_WHEN_ABSENT)
        $sentKeys=[];
        foreach ($areas as $a) { if (is_array($a)) $sentKeys[$this->cleanKey($a['key'] ?? '')]=true; }
        $keepAreas=array_values(array_filter(self::KEEP_WHEN_ABSENT, function ($k) use ($sentKeys) { return !isset($sentKeys[$k]); }));

        $db->transaction(function() use ($db,$areas,$hash,$version,$fullSnapshot,$userId,$keepAreas,&$stats,&$seenAreaIds,&$seenPaths,&$seenActions) {
            foreach (array_values($areas) as $areaIndex=>$area) {
                if (!is_array($area)) continue;
                $key=$this->cleanKey($area['key'] ?? ''); if ($key==='') continue;
                $row=$db->table('app_business_areas')->where('area_key',$key)->first();
                $values=[
                    'area_name'=>(string)($area['name'] ?? $key),
                    'description'=>$area['description'] ?? null,
                    'icon'=>$area['icon'] ?? null,
                    'display_order'=>(int)($area['displayOrder'] ?? $area['display_order'] ?? $areaIndex),
                    'is_active'=>1,'registry_hash'=>$hash,'updated_at'=>now(),
                ];
                if ($row) { $db->table('app_business_areas')->where('id',$row->id)->update($values); $areaId=(int)$row->id; $stats['updated_count']++; }
                else { $values['area_key']=$key; $values['created_at']=now(); $areaId=(int)$db->table('app_business_areas')->insertGetId($values); $stats['inserted_count']++; }
                $seenAreaIds[$areaId]=true; $stats['areas_received']++;
                $this->syncResources($areaId,null,'',$area['resources'] ?? [],$version,$stats,$seenPaths,$seenActions);
            }

            if ($fullSnapshot) {
                if ($seenAreaIds) {
                    $q=$db->table('app_business_areas')->whereNotIn('id',array_keys($seenAreaIds))->where('is_active',1);
                    if ($keepAreas) $q->whereNotIn('area_key',$keepAreas);
                    $stats['deactivated_count'] += $q->update(['is_active'=>0,'updated_at'=>now()]);
                }
                if ($seenPaths) {
                    $q=$db->table('app_resources')->whereNotIn('resource_path',array_keys($seenPaths))->where('is_active',1);
                    foreach ($keepAreas as $k) {
                        $q->where('resource_path','<>',$k)->where('resource_path','not like',$k.'.%');
                    }
                    $stats['deactivated_count'] += $q->update(['is_active'=>0,'updated_at'=>now()]);
                }
                if ($keepAreas) $stats['kept_areas']=$keepAreas;
                foreach ($seenActions as $resourceId=>$keys) {
                    $q=$db->table('app_resource_actions')->where('resource_id',$resourceId)->where('is_active',1);
                    if ($keys) $q->whereNotIn('action_key',array_keys($keys));
                    $stats['deactivated_count'] += $q->update(['is_active'=>0,'updated_at'=>now()]);
                }
            }

            $resourceCount=$db->table('app_resources')->where('is_active',1)->count();
            $actionCount=$db->table('app_resource_actions')->where('is_active',1)->count();
            $state=[
                'registry_hash'=>$hash,'client_version'=>$version,'resource_count'=>$resourceCount,'action_count'=>$actionCount,
                'last_synced_by'=>$userId,'last_synced_at'=>now(),'updated_at'=>now(),
            ];
            if ($db->table('app_registry_sync_state')->where('id',1)->exists()) $db->table('app_registry_sync_state')->where('id',1)->update($state);
            else { $state['id']=1; $db->table('app_registry_sync_state')->insert($state); }
            $db->table('app_registry_sync_logs')->insert([
                'user_id'=>$userId,'client_version'=>$version,'registry_hash'=>$hash,'full_snapshot'=>$fullSnapshot?1:0,
                'stats_json'=>json_encode($stats),'created_at'=>now(),
            ]);
        },3);

        AppAccessResolver::bumpCacheVersion();
        return array_merge($stats,['registry_hash'=>$hash,'client_version'=>$version]);
    }

    protected function syncResources($areaId,$parentId,$parentPath,$resources,$version,array &$stats,array &$seenPaths,array &$seenActions): void
    {
        if (!is_array($resources)) return;
        $db=DB::connection($this->connection);
        foreach (array_values($resources) as $index=>$resource) {
            if (!is_array($resource)) continue;
            $key=$this->cleanKey($resource['key'] ?? ''); if ($key==='') continue;
            $path=$parentPath===''?$key:$parentPath.'.'.$key;
            $existing=$db->table('app_resources')->where('resource_path',$path)->first();
            $values=[
                'area_id'=>$areaId,'parent_id'=>$parentId,'resource_key'=>$key,'resource_name'=>(string)($resource['name'] ?? $key),
                'resource_type'=>(string)($resource['type'] ?? 'resource'),'description'=>$resource['description'] ?? null,
                'display_order'=>(int)($resource['displayOrder'] ?? $resource['display_order'] ?? $index),'is_active'=>1,
                'last_seen_version'=>$version,'updated_at'=>now(),
            ];
            if ($existing) { $db->table('app_resources')->where('id',$existing->id)->update($values); $id=(int)$existing->id; $stats['updated_count']++; }
            else { $values['resource_path']=$path; $values['first_seen_version']=$version; $values['created_at']=now(); $id=(int)$db->table('app_resources')->insertGetId($values); $stats['inserted_count']++; }
            $seenPaths[$path]=true; $stats['resources_received']++; $seenActions[$id]=$seenActions[$id] ?? [];
            $this->syncActions($id,$resource['actions'] ?? [],$version,$stats,$seenActions[$id]);
            $this->syncResources($areaId,$id,$path,$resource['children'] ?? [],$version,$stats,$seenPaths,$seenActions);
        }
    }

    protected function syncActions($resourceId,$actions,$version,array &$stats,array &$seen): void
    {
        if (!is_array($actions)) return;
        $db=DB::connection($this->connection);
        foreach (array_values($actions) as $index=>$action) {
            if (is_string($action)) $action=['key'=>$action,'name'=>ucwords(str_replace('_',' ',$action))];
            if (!is_array($action)) continue;
            $key=$this->cleanKey($action['key'] ?? ''); if ($key==='') continue;
            $existing=$db->table('app_resource_actions')->where('resource_id',$resourceId)->where('action_key',$key)->first();
            $values=[
                'action_name'=>(string)($action['name'] ?? ucwords(str_replace('_',' ',$key))),
                'description'=>$action['description'] ?? null,'is_dangerous'=>!empty($action['dangerous'])?1:0,
                'display_order'=>(int)($action['displayOrder'] ?? $action['display_order'] ?? $index),'is_active'=>1,
                'last_seen_version'=>$version,'updated_at'=>now(),
            ];
            if ($existing) { $db->table('app_resource_actions')->where('id',$existing->id)->update($values); $stats['updated_count']++; }
            else { $values['resource_id']=$resourceId; $values['action_key']=$key; $values['first_seen_version']=$version; $values['created_at']=now(); $db->table('app_resource_actions')->insert($values); $stats['inserted_count']++; }
            $seen[$key]=true; $stats['actions_received']++;
        }
    }

    public function tree(): array
    {
        if (!$this->isReady()) return [];
        $db=DB::connection($this->connection);
        $areas=$db->table('app_business_areas')->where('is_active',1)->orderBy('display_order')->orderBy('area_name')->get();
        $resources=$db->table('app_resources')->where('is_active',1)->orderBy('display_order')->orderBy('resource_name')->get();
        $actions=$db->table('app_resource_actions')->where('is_active',1)->orderBy('display_order')->orderBy('action_name')->get()->groupBy('resource_id');
        $byParent=[]; foreach($resources as $r){$k=$r->parent_id===null?'area:'.$r->area_id:'parent:'.$r->parent_id;$byParent[$k][]=$r;}
        $out=[]; foreach($areas as $a)$out[]=['key'=>$a->area_key,'name'=>$a->area_name,'description'=>$a->description,'icon'=>$a->icon,'display_order'=>(int)$a->display_order,'resources'=>$this->nodes($byParent['area:'.$a->id]??[],$byParent,$actions)];
        return $out;
    }

    protected function nodes($rows,$byParent,$actions): array
    {
        $out=[]; foreach($rows as $r){$aa=[];foreach(($actions[$r->id]??[]) as $a)$aa[]=['key'=>$a->action_key,'name'=>$a->action_name,'dangerous'=>(bool)$a->is_dangerous,'display_order'=>(int)$a->display_order];$out[]=['id'=>(int)$r->id,'key'=>$r->resource_key,'path'=>$r->resource_path,'name'=>$r->resource_name,'type'=>$r->resource_type,'description'=>$r->description,'display_order'=>(int)$r->display_order,'actions'=>$aa,'children'=>$this->nodes($byParent['parent:'.$r->id]??[],$byParent,$actions)];}return $out;
    }

    protected function cleanKey($value): string { $key=strtolower(trim((string)$value));$key=preg_replace('/[^a-z0-9_]+/','_',$key);return trim($key,'_'); }
}
