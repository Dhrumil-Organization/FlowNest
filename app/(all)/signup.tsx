import {
 View,
 Text,
 TextInput,
 TouchableOpacity,
 Alert
} from 'react-native';

export default function Signup() {

 return (
  <View style={{padding:20}}>

   <Text style={{fontSize:28,fontWeight:'700'}}>
      Create Account
   </Text>

   <TextInput placeholder="Company Name" />
   <TextInput placeholder="Business Email" />
   <TextInput placeholder="Phone Number" />

   <TouchableOpacity
    onPress={() =>
      Alert.alert(
       "Coming Soon",
       "Online registration will be available shortly."
      )
    }
   >
     <Text>Submit</Text>
   </TouchableOpacity>

  </View>
 );
}