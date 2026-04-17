/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import BackgroundFetch from 'react-native-background-fetch';

// Headless task for Android (runs even when app is terminated)
const HeadlessTask = async (event) => {
  const taskId = event.taskId;
  console.log('[BackgroundFetch HeadlessTask] start:', taskId);
  try {
    const { triggerManual } = require('./src/services/BackgroundScheduler');
    await triggerManual();
  } finally {
    BackgroundFetch.finish(taskId);
  }
};

BackgroundFetch.registerHeadlessTask(HeadlessTask);

AppRegistry.registerComponent(appName, () => App);
