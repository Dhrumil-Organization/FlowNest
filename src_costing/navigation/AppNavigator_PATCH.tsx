// ============================================================
// PATCHES FOR src/navigation/AppNavigator.tsx
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Add these imports at the top:
// ──────────────────────────────────────────────────────────
import CostSheetDesignPickerScreen from '../screens/CostSheetDesignPickerScreen';
import CostSheetScreen from '../screens/CostSheetScreen';
import AuthQueueScreen from '../screens/AuthQueueScreen';
import AuthReviewScreen from '../screens/AuthReviewScreen';
import SettingsScreen from '../screens/SettingsScreen';

// ──────────────────────────────────────────────────────────
// 2) Add these Stack.Screen entries inside <Stack.Navigator>
//    (place them after your existing TatAnalytics screen):
// ──────────────────────────────────────────────────────────

      <Stack.Screen
        name="CostSheetDesignPicker"
        component={CostSheetDesignPickerScreen}
        options={{title: 'Add Costing'}}
      />
      <Stack.Screen
        name="CostSheet"
        component={CostSheetScreen}
        options={{title: 'Cost Sheet'}}
      />
      <Stack.Screen
        name="AuthQueue"
        component={AuthQueueScreen}
        options={{title: 'Cost Authorization'}}
      />
      <Stack.Screen
        name="AuthReview"
        component={AuthReviewScreen}
        options={{title: 'Review Cost Sheet'}}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
