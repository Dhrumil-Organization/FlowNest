
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { T } from '@/src/theme';
import { browseRecipes, deleteRecipe, getRecipe, loadRecipeGroups, saveRecipe } from './api';
import { emptyRecipe, Recipe, RecipeGroup, ChemicalRow } from './model';

type Props = { token: string; API: string; username?: string };
type Mode = 'view'|'add'|'modify';
const COLORS = { navy:'#102338', primary:'#1479C9', bg:'#F3F6FA', line:'#DCE4ED', muted:'#6B7788', green:'#16865B', red:'#C43D48', white:'#FFFFFF' };

export default function ProcessChemicalsScreen({ token, API, username }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [mode,setMode] = useState<Mode>('view');
  const [recipe,setRecipe] = useState<Recipe>(emptyRecipe());
  const [browseOpen,setBrowseOpen] = useState(false);
  const [browseRows,setBrowseRows] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const [search,setSearch] = useState('');
  const [expanded,setExpanded] = useState<Record<string,boolean>>({});
  const [busy,setBusy] = useState(false);

  const notify = (title:string,message:string) => Alert.alert(title,message);
  const loadBrowse = useCallback(async () => {
    setLoading(true);
    try {
      const data:any = await browseRecipes(API,token);
      setBrowseRows(Array.isArray(data)?data:(data?.rows||data?.recipes||[]));
      setBrowseOpen(true);
    } catch(e:any) { notify('Unable to load recipes',e?.response?.data?.message||e.message||'Please try again.'); }
    finally { setLoading(false); }
  },[API,token]);

  const pickRecipe = async (row:any, copy=false) => {
    const no = String(row.recipeNo ?? row.RecipeNo ?? row.code ?? row.Code ?? '');
    setLoading(true);
    try {
      const data:any = await getRecipe(API,token,no);
      const loaded = (data?.recipe || data?.header || data) as Recipe;
      setRecipe({...emptyRecipe(),...loaded,recipeNo:copy?'':String(loaded.recipeNo??no),groups:loaded.groups||loaded.recipeGroups||[]});
      setBrowseOpen(false);
      setMode(copy?'add':'view');
    } catch(e:any) { notify('Unable to open recipe',e?.response?.data?.message||e.message||'Please try again.'); }
    finally { setLoading(false); }
  };

  const startAdd = () => { setRecipe({...emptyRecipe(),preparedBy:username||''}); setMode('add'); };
  const startModify = () => { if(!recipe.recipeNo) return notify('Select a recipe','Browse and select a recipe before modifying.'); setMode('modify'); };
  const copyRecipe = () => loadBrowse();
  const update = (key:keyof Recipe,value:any) => setRecipe(p=>({...p,[key]:value}));
  const addChemical = (groupIndex:number) => {
    setRecipe(p=>({...p,groups:p.groups.map((g,i)=>i===groupIndex?{...g,rows:[...g.rows,{id:`new-${Date.now()}`,itemCode:'',itemName:'',make:'',model:'',uom:'',qty:0,cost:0}]}:g)}));
  };
  const removeChemical = (groupIndex:number,rowId:string) => setRecipe(p=>({...p,groups:p.groups.map((g,i)=>i===groupIndex?{...g,rows:g.rows.filter(r=>r.id!==rowId)}:g)}));
  const changeChemical = (groupIndex:number,rowId:string,key:keyof ChemicalRow,value:any) => setRecipe(p=>({...p,groups:p.groups.map((g,i)=>i===groupIndex?{...g,rows:g.rows.map(r=>r.id===rowId?{...r,[key]:value}:r)}:g)}));

  const save = async () => {
    if(!recipe.description.trim()) return notify('Required field','Please enter Recipe Description.');
    if(!recipe.processCode.trim()) return notify('Required field','Please select Process.');
    if(!recipe.itemCode.trim() || recipe.itemCode==='0') return notify('Required field','Please select Item.');
    if(busy) return;
    setBusy(true);
    try {
      await saveRecipe(API,token,recipe,mode==='add'?'add':'modify');
      notify('Success',mode==='add'?'Recipe created successfully.':'Recipe updated successfully.');
      setMode('view');
      await loadBrowse();
    } catch(e:any) { notify('Save failed',e?.response?.data?.message||e.message||'Please try again.'); }
    finally { setBusy(false); }
  };
  const remove = () => {
    if(!recipe.recipeNo) return notify('Select a recipe','Browse and select a recipe first.');
    Alert.alert('Delete Recipe',`Delete recipe ${recipe.recipeNo}? This action cannot be undone.`,[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{setBusy(true);try{await deleteRecipe(API,token,recipe.recipeNo);setRecipe(emptyRecipe());setMode('view');notify('Deleted','Recipe deleted successfully.');}catch(e:any){notify('Delete failed',e?.response?.data?.message||e.message||'Please try again.');}finally{setBusy(false);}}}
    ]);
  };

  const field = (label:string,key:keyof Recipe,placeholder='',widthFlex=1,editable=true) => (
    <View style={[styles.field,{flex:compact?undefined:widthFlex,width:compact?'100%':undefined}]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={String(recipe[key]??'')} onChangeText={v=>update(key,v)} editable={editable&&mode!=='view'} placeholder={placeholder} style={[styles.input,mode==='view'&&styles.readonly]} />
    </View>
  );
  const selectBrowse = (row:any) => pickRecipe(row,false);
  const filtered = browseRows.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  const actions = mode==='view'
    ? [{label:'Add',icon:'add-circle-outline',run:startAdd,color:COLORS.green},{label:'Modify',icon:'edit',run:startModify,color:COLORS.primary},{label:'Delete',icon:'delete-outline',run:remove,color:COLORS.red},{label:'Browse',icon:'search',run:loadBrowse,color:COLORS.navy},{label:'Copy Recipe',icon:'content-copy',run:copyRecipe,color:COLORS.primary}]
    : [{label:'Save',icon:'save',run:save,color:COLORS.green},{label:'Cancel',icon:'close',run:()=>{setMode('view');setRecipe(emptyRecipe())},color:COLORS.red},{label:'Browse',icon:'search',run:loadBrowse,color:COLORS.navy}];

  return <View style={styles.page}>
    <View style={styles.topbar}>
      <View style={{flex:1}}><Text style={styles.eyebrow}>PRODUCTION • MASTER DATA</Text><Text style={styles.heading}>Process Chemicals</Text><Text style={styles.subtitle}>Define and manage chemical recipes</Text></View>
      {loading&&<ActivityIndicator color={COLORS.primary}/>}
      <View style={styles.modeBadge}><View style={[styles.dot,{backgroundColor:mode==='view'?COLORS.green:'#D98B20'}]}/><Text style={styles.modeText}>{mode==='view'?'Viewing':mode==='add'?'New recipe':'Editing recipe'}</Text></View>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.cardHeader}><Icon name="description" size={20} color={COLORS.primary}/><Text style={styles.cardTitle}>Recipe Information</Text><Text style={styles.required}>* Required</Text></View>
        <View style={[styles.fieldsRow,compact&&{flexDirection:'column'}]}>
          {field('Recipe No.','recipeNo','Auto-generated',1,false)}
          {field('Date','date','DD/MM/YYYY',1,false)}
          {field('Description *','description','Enter recipe description',2)}
        </View>
        <View style={[styles.fieldsRow,compact&&{flexDirection:'column'}]}>
          {field('Process Code *','processCode','Select process',1)}
          {field('Process Name','processName','Process name',2,false)}
        </View>
        <View style={[styles.fieldsRow,compact&&{flexDirection:'column'}]}>
          {field('Item Code *','itemCode','Select item',1)}
          {field('Item Name','itemName','Item name',2,false)}
        </View>
        <View style={[styles.fieldsRow,compact&&{flexDirection:'column'}]}>
          {field('Location','location','Location',2)}
          {field('Page No.','pageNo','0',1)}
        </View>
        <View style={styles.inlineOption}><Text style={styles.label}>Recipe Groups</Text>
          <View style={styles.radioWrap}><Pressable onPress={()=>update('groupMode','all')} style={styles.radio}><View style={[styles.radioOuter,recipe.groupMode==='all'&&styles.radioActive]}>{recipe.groupMode==='all'&&<View style={styles.radioInner}/>}</View><Text>All</Text></Pressable>
          <Pressable onPress={()=>update('groupMode','selected')} style={styles.radio}><View style={[styles.radioOuter,recipe.groupMode==='selected'&&styles.radioActive]}>{recipe.groupMode==='selected'&&<View style={styles.radioInner}/>}</View><Text>Selected</Text></Pressable></View>
          <Pressable style={styles.loadGroups} onPress={async()=>{setLoading(true);try{const data:any=await loadRecipeGroups(API,token,recipe.processCode,recipe.itemCode);const groups=Array.isArray(data)?data:data?.groups||[];update('groups',groups);notify('Loaded',`${groups.length} recipe groups loaded.`);}catch(e:any){notify('Unable to load groups',e?.response?.data?.message||e.message||'Check API configuration.');}finally{setLoading(false)}}}><Icon name="playlist-add" size={21} color="#fff"/><Text style={styles.loadGroupsText}>Load Recipe Groups</Text></Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}><Icon name="science" size={20} color={COLORS.primary}/><Text style={styles.cardTitle}>Recipe Group Details</Text><Text style={styles.count}>{recipe.groups.length} groups</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{minWidth:compact?720:width-60}}>
            <View style={styles.tableHead}><Text style={[styles.th,{width:90}]}>Group Code</Text><Text style={[styles.th,{width:190}]}>Group Name</Text><Text style={[styles.th,{width:100}]}>Item Code</Text><Text style={[styles.th,{width:170}]}>Item Name</Text><Text style={[styles.th,{width:130}]}>Make</Text><Text style={[styles.th,{width:100}]}>Model</Text><Text style={[styles.th,{width:70}]}>UOM</Text><Text style={[styles.th,{width:90}]}>Qty</Text><Text style={[styles.th,{width:90}]}>Cost</Text></View>
            {recipe.groups.map((g,gi)=><View key={`${g.groupCode}-${gi}`} style={styles.groupBlock}>
              <Pressable onPress={()=>setExpanded(p=>({...p,[String(gi)]:!p[String(gi)]}))} style={styles.groupHead}><Icon name={expanded[String(gi)]===false?'chevron-right':'expand-more'} size={18} color={COLORS.primary}/><Text style={styles.groupCode}>{g.groupCode}</Text><Text style={styles.groupName}>{g.groupName}</Text><Text style={styles.calculation}>Calculation: {g.calculation||'—'}</Text><Text style={styles.groupQty}>{g.rows.reduce((s,r)=>s+Number(r.qty||0),0).toFixed(3)}</Text></Pressable>
              {expanded[String(gi)]!==false&&g.rows.map(row=><View key={row.id} style={styles.tableRow}>
                {(['itemCode','itemName','make','model','uom','qty','cost'] as (keyof ChemicalRow)[]).map((k,idx)=><TextInput key={k} value={String(row[k]??'')} editable={mode!=='view'} onChangeText={v=>changeChemical(gi,row.id,k,idx>=5?Number(v)||0:v)} style={[styles.cell,{width:[100,170,130,100,70,90,90][idx]}]} />)}
                {mode!=='view'&&<Pressable onPress={()=>removeChemical(gi,row.id)} style={styles.removeRow}><Icon name="delete-outline" color={COLORS.red} size={18}/></Pressable>}
              </View>)}
              {mode!=='view'&&<Pressable onPress={()=>addChemical(gi)} style={styles.addRow}><Icon name="add" color={COLORS.primary}/><Text style={styles.addRowText}>Add chemical</Text></Pressable>}
            </View>)}
            {recipe.groups.length===0&&<View style={styles.empty}><Icon name="science" size={30} color="#AAB7C5"/><Text style={styles.emptyText}>No recipe groups loaded</Text><Text style={styles.emptyHint}>Select Process and Item, then tap “Load Recipe Groups”.</Text></View>}
          </View>
        </ScrollView>
      </View>

      <View style={[styles.card,styles.footerCard]}>
        <View style={[styles.fieldsRow,compact&&{flexDirection:'column'}]}>
          {field('Prepared By','preparedBy','Prepared by',2,false)}
          {field('Status','status','Active',1)}
          {field('Recipe Status','recipeStatus','Pending',1,false)}
        </View>
        <View style={[styles.fieldsRow,compact&&{flexDirection:'column'}]}>
          {field('Approval Date','approvalDate','',1,false)}
          {field('Approved By','approvedBy','',2,false)}
        </View>
      </View>
    </ScrollView>
    <View style={styles.actionbar}>{actions.map(a=><Pressable key={a.label} onPress={a.run} style={[styles.action,{borderColor:a.color}]}><Icon name={a.icon as any} size={18} color={a.color}/><Text style={[styles.actionText,{color:a.color}]}>{a.label}</Text></Pressable>)}</View>

    <Modal visible={browseOpen} transparent animationType="fade" onRequestClose={()=>setBrowseOpen(false)}>
      <View style={styles.modalShade}><View style={[styles.modal,{width:compact?'96%':'82%',maxHeight:'88%'}]}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Browse Recipes</Text><Pressable onPress={()=>setBrowseOpen(false)}><Icon name="close" size={24} color={COLORS.muted}/></Pressable></View>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search recipe no., description, process or item…" style={styles.searchInput}/>
        <View style={styles.browseHead}><Text style={{width:70}}>Recipe No.</Text><Text style={{width:100}}>Date</Text><Text style={{flex:2}}>Description</Text><Text style={{flex:1}}>Process</Text><Text style={{flex:1}}>Item Name</Text></View>
        <FlatList data={filtered} keyExtractor={(r,i)=>String(r.recipeNo??r.RecipeNo??i)} renderItem={({item})=><Pressable onPress={()=>selectBrowse(item)} style={styles.browseRow}><Text style={{width:70}}>{item.recipeNo??item.RecipeNo}</Text><Text style={{width:100}}>{item.date??item.Date}</Text><Text style={{flex:2}} numberOfLines={1}>{item.description??item.Description}</Text><Text style={{flex:1}} numberOfLines={1}>{item.processName??item.ProcessName??item.process}</Text><Text style={{flex:1}} numberOfLines={1}>{item.itemName??item.ItemName}</Text><Pressable onPress={()=>pickRecipe(item,true)}><Icon name="content-copy" color={COLORS.primary}/></Pressable></Pressable>} ListEmptyComponent={<Text style={styles.emptyText}>No recipes found.</Text>}/>
        <View style={styles.modalFooter}><Pressable style={styles.modalBtn} onPress={()=>loadBrowse()}><Icon name="refresh" color={COLORS.primary}/><Text style={styles.modalBtnText}>Refresh</Text></Pressable><Pressable style={styles.modalBtn} onPress={()=>setBrowseOpen(false)}><Icon name="close" color={COLORS.red}/><Text style={[styles.modalBtnText,{color:COLORS.red}]}>Cancel</Text></Pressable></View>
      </View></View>
    </Modal>
  </View>;
}

const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:COLORS.bg},topbar:{backgroundColor:COLORS.white,paddingHorizontal:20,paddingVertical:16,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:COLORS.line},
 eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.2,color:COLORS.primary},heading:{fontSize:22,fontWeight:'800',color:COLORS.navy,marginTop:3},subtitle:{fontSize:12,color:COLORS.muted,marginTop:3},modeBadge:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:7,backgroundColor:'#F4F8FB',borderRadius:20},dot:{width:7,height:7,borderRadius:4,marginRight:7},modeText:{fontSize:11,fontWeight:'700',color:COLORS.navy},
 content:{padding:14,gap:12},card:{backgroundColor:COLORS.white,borderRadius:12,borderWidth:1,borderColor:COLORS.line,padding:14,shadowColor:'#12243A',shadowOpacity:.04,shadowRadius:5,elevation:1},cardHeader:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:14},cardTitle:{fontSize:15,fontWeight:'800',color:COLORS.navy},required:{marginLeft:'auto',fontSize:10,color:COLORS.muted},count:{marginLeft:'auto',fontSize:11,color:COLORS.muted},fieldsRow:{flexDirection:'row',gap:12,marginBottom:10},field:{minWidth:0},label:{fontSize:11,fontWeight:'700',color:'#34465A',marginBottom:5},input:{height:39,borderWidth:1,borderColor:'#D7E1EC',borderRadius:7,paddingHorizontal:10,fontSize:13,color:COLORS.navy,backgroundColor:'#fff'},readonly:{backgroundColor:'#F6F8FA',color:'#64758A'},inlineOption:{flexDirection:'row',alignItems:'center',gap:18,marginTop:4,flexWrap:'wrap'},radioWrap:{flexDirection:'row',gap:14},radio:{flexDirection:'row',alignItems:'center',gap:6},radioOuter:{width:16,height:16,borderRadius:8,borderWidth:1.5,borderColor:'#8B9AAF',alignItems:'center',justifyContent:'center'},radioActive:{borderColor:COLORS.primary},radioInner:{width:8,height:8,borderRadius:4,backgroundColor:COLORS.primary},loadGroups:{marginLeft:'auto',backgroundColor:COLORS.primary,borderRadius:8,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:7},loadGroupsText:{fontSize:12,fontWeight:'800',color:'#fff'},tableHead:{height:38,flexDirection:'row',alignItems:'center',backgroundColor:'#F0F4F8',borderBottomWidth:1,borderColor:COLORS.line},th:{fontSize:11,fontWeight:'800',color:'#40536A',paddingHorizontal:7},groupBlock:{borderBottomWidth:1,borderColor:COLORS.line},groupHead:{flexDirection:'row',alignItems:'center',paddingVertical:9,backgroundColor:'#F8FAFC',gap:8},groupCode:{width:75,fontWeight:'800',fontSize:11,color:COLORS.primary},groupName:{width:180,fontWeight:'700',fontSize:12,color:COLORS.navy},calculation:{flex:1,fontSize:11,color:COLORS.muted},groupQty:{width:80,textAlign:'right',fontWeight:'800',fontSize:11,color:COLORS.navy},tableRow:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:'#EEF2F6'},cell:{height:36,paddingHorizontal:6,borderRightWidth:1,borderColor:'#EDF1F5',fontSize:11,color:COLORS.navy},removeRow:{padding:8},addRow:{flexDirection:'row',alignItems:'center',gap:4,paddingVertical:7,paddingLeft:12},addRowText:{fontSize:11,color:COLORS.primary,fontWeight:'700'},empty:{padding:30,alignItems:'center',gap:8},emptyText:{textAlign:'center',color:COLORS.muted,fontSize:12,padding:10},emptyHint:{textAlign:'center',color:'#8997A8',fontSize:11},footerCard:{marginBottom:8},actionbar:{flexDirection:'row',flexWrap:'wrap',gap:8,padding:10,backgroundColor:'#fff',borderTopWidth:1,borderColor:COLORS.line},action:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderRadius:8,backgroundColor:'#fff'},actionText:{fontSize:12,fontWeight:'800'},modalShade:{flex:1,backgroundColor:'rgba(7,18,33,.55)',alignItems:'center',justifyContent:'center',padding:10},modal:{backgroundColor:'#fff',borderRadius:14,padding:14},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},modalTitle:{fontSize:17,fontWeight:'800',color:COLORS.navy},searchInput:{height:40,borderWidth:1,borderColor:COLORS.line,borderRadius:7,paddingHorizontal:10,marginBottom:10},browseHead:{flexDirection:'row',backgroundColor:'#EFF4F8',padding:9,fontSize:10},browseRow:{flexDirection:'row',alignItems:'center',padding:9,borderBottomWidth:1,borderColor:COLORS.line,gap:4},modalFooter:{flexDirection:'row',justifyContent:'flex-end',gap:10,paddingTop:12},modalBtn:{flexDirection:'row',alignItems:'center',gap:5,padding:8},modalBtnText:{fontSize:12,fontWeight:'700',color:COLORS.primary}
});
