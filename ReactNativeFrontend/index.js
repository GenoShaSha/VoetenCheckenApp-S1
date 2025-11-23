/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// --- Buffer polyfill for libraries like jpeg-js ---
import { Buffer } from 'buffer';

// Only define it if it doesn't exist
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
// --- end Buffer polyfill ---


AppRegistry.registerComponent(appName, () => App);
