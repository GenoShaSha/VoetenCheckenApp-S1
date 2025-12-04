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


import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import ImageInputScreen from './src/ImageInputScreen';
import QualityReviewScreen from './src/QualityReviewScreen';
import ConditionResultScreen from './src/ConditionResultScreen';
import CameraScreen from './src/CameraScreen';
import AugmentedCameraScreen from './src/AugmentedCameraScreen';

export type RootStackParamList = {
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
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="ImageInput"
        screenOptions={{headerShown: false}}>
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