// FILE: app/new/settings.tsx
// Personal settings (theme + "My screens"). Opened from the header gear, the
// desktop sidebar and the Profile screen; pushed on top of the tabs like
// app/new/profile.tsx, so it has its own back header. No permission guard:
// it is every user's own page and changes nothing but their view.
import { SettingsScreen } from '@/src/screens/settings/SettingsScreen';

export default function SettingsRoute() {
  return <SettingsScreen />;
}
