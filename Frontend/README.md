## ReactNativeFrontend

React Native frontend for the VoetenChecken app. It lets users pick or capture a foot image, sends it to the Python backend, and displays condition and image‑quality feedback.

This app was bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli) and targets Android (iOS can be added later).

## Prerequisites

- Node (see required version in `package.json` under `engines`)
- Android SDK / emulator or a physical Android device with USB debugging enabled
- Python backend running from `PythonServer` (see `../PythonServer/README.md`)

## Install dependencies

From the `ReactNativeFrontend` folder:

```powershell
cd "ReactNativeFrontend"
npm install
```

## Start Metro bundler

```powershell
cd "ReactNativeFrontend"
npm start
```

Keep this terminal running; Metro serves the JavaScript bundle.

## Run the Android app

In another terminal, from `ReactNativeFrontend`:

```powershell
cd "ReactNativeFrontend"
npx react-native run-android
```

Make sure an Android emulator is running or a device is connected.

## Connect to the Python backend

The Python server runs on your Windows host at `http://localhost:3000`.

For Android emulators/devices to reach it, forward the port:

```powershell
adb reverse tcp:3000 tcp:3000
```

Run this while a device/emulator is connected. After that, the app can use `http://localhost:3000` as the backend URL.

## Image picking

The screen in `src/ImagePickerScreen.tsx` uses `react-native-image-picker` to open the gallery or camera.

If you ever reinstall dependencies from scratch, ensure the native module is installed:

```powershell
cd "ReactNativeFrontend"
npm install react-native-image-picker
```

Then rebuild the Android app with `npx react-native run-android`.

## Scripts

Useful `package.json` scripts:

- `npm run android` – alias for `react-native run-android`
- `npm run ios` – (future) run on iOS
- `npm test` – run Jest tests
- `npm run copy-models` – copies TensorFlow.js models from `my_tfjs_models` to the app bundle via `tools/copy-models.js`

## Troubleshooting

- If Android build fails with a Gradle or `react-native-image-picker` error, try:
	- `cd ReactNativeFrontend/android`
	- `.gradlew clean`
	- then rerun `npx react-native run-android` from `ReactNativeFrontend`.
- If the app cannot reach the backend, confirm:
	- Python server is running on port 3000.
	- `adb reverse tcp:3000 tcp:3000` has been executed.
