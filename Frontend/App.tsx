// /**
//  * Sample React Native App
//  * https://github.com/facebook/react-native
//  *
//  * @format
//  */

// import React from 'react';
// import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import ImagePickerScreen from './src/ImagePickerScreen';
// // import ImagePickerScreen from './src/ImagePickerScreen_Testing';
// // import CameraScreen from './src/CameraScreen';

// function App() {
//   const isDarkMode = useColorScheme() === 'dark';

//   return (
//     <SafeAreaProvider>
//       <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
//       <View style={styles.container}>
//         {/* <CameraScreen/> */}
//         <ImagePickerScreen />
//       </View>
//     </SafeAreaProvider>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });

// export default App;


import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageInputScreen from './src/ImageInputScreen';
import QualityReviewScreen from './src/QualityReviewScreen';
import ConditionResultScreen from './src/ConditionResultScreen';
import CameraScreen from './src/CameraScreen';
import AugmentedCameraScreen from './src/AugmentedCameraScreen';
import InstructionsScreen from './src/InstructionsScreen';
import {View, ActivityIndicator, StyleSheet, Platform} from 'react-native';
import Immersive from 'react-native-immersive';

const FIRST_LAUNCH_KEY = '@voet_check_first_launch';

export type RootStackParamList = {
  Instructions: undefined;
  ImageInput: undefined;
  QualityReview: {
    imageUri?: string;
    errorMessage: string;
    iqaTop: {label: string; score: number}[];
    openCvMetrics?: any;
  };
  ConditionResult: {
    imageUri?: string;
    iqaTop: {label: string; score: number}[];
    openCvMetrics?: any;
    condTop: {label: string; score: number}[];
  };
  Camera: undefined;
  AugmentedCamera: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstLaunch();
    // Enable immersive fullscreen mode (hide status bar and navigation bar)
    if (Platform.OS === 'android') {
      Immersive.on();
      Immersive.setImmersive(true);
    }
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      if (hasLaunched === null) {
        // First time launching the app
        await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
        setIsFirstLaunch(true);
      } else {
        setIsFirstLaunch(false);
      }
    } catch (error) {
      // If error, default to showing instructions
      setIsFirstLaunch(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isFirstLaunch ? 'Instructions' : 'ImageInput'}
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="Instructions" component={InstructionsScreen} />
        <Stack.Screen name="ImageInput" component={ImageInputScreen} />
        <Stack.Screen name="QualityReview" component={QualityReviewScreen} />
        <Stack.Screen name="ConditionResult" component={ConditionResultScreen} />
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen
          name="AugmentedCamera"
          component={AugmentedCameraScreen}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
});