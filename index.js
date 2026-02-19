// index.js (or index.tsx) — MUST BE FIRST
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initAPI } from './common/API/dynamicAPI';

// await initAPI();
initAPI();
AppRegistry.registerComponent(appName, () => App);

// index.js (or index.tsx) — MUST BE FIRST
// import 'react-native-gesture-handler';
// import { AppRegistry } from 'react-native';
// import App from './App';
// import { name as appName } from './app.json';
// import { initAPI } from './common/API/dynamicAPI';

// // AppRegistry.registerComponent(appName, () => App);
// const bootstrap = async () => {
//   await initAPI(); // ✅ VERY IMPORTANT
//   AppRegistry.registerComponent(appName, () => App);
// };

// bootstrap();
