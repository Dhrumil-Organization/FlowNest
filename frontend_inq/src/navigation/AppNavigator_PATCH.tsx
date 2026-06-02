// ============================================================
// ADD TO YOUR EXISTING src/navigation/AppNavigator.tsx
// ============================================================

// 1) Import at top:
import InquiryNotesScreen from '../screens/InquiryNotesScreen';

// 2) Add this Stack.Screen inside your <Stack.Navigator>:
<Stack.Screen
  name="InquiryNotes"
  component={InquiryNotesScreen}
  options={{title: 'Notes'}}
/>
