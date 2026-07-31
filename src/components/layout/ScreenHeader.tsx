import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';
/** Context header only. The global application header is rendered once by the tab shell. */
export function ScreenHeader({brand,title,right}:{brand?:string;title:string;right?:React.ReactNode}){
 return <View style={s.row}><View style={{flex:1}}>{!!brand&&<Text style={s.brand}>{brand}</Text>}<Text style={s.title}>{title}</Text></View>{right}</View>;
}
const s=StyleSheet.create({row:{paddingHorizontal:16,paddingVertical:14,backgroundColor:T.surface,borderBottomWidth:1,borderBottomColor:T.border,flexDirection:'row',alignItems:'center'},brand:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:T.muted},title:{fontSize:18,fontWeight:'900',color:T.ink,marginTop:2}});
