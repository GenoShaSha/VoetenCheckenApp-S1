# Frontend (React Native)

React Native mobile application for the VoetenChecken app. Provides an intuitive interface for capturing foot images, analyzing quality in real-time, and displaying condition results.

## Features

| Feature | Description |
|---------|-------------|
| **Augmented Camera** | Live quality indicators (blur, darkness, brightness) |
| **Gallery Selection** | Pick images from device gallery (JPG only) |
| **Voice Guidance** | TTS feedback during photo capture |
| **Flashlight Control** | Toggle torch for dark environments |
| **Onboarding Flow** | 6-page instructions shown on first launch |
| **Prediction History** | View past analyses on home screen |
| **Immersive Mode** | Fullscreen experience with hidden status bar |

```

## Prerequisites

- **Node.js** 18+
- **Android Studio** with SDK and emulator
- **Java JDK** 17
- **ADB** (included with Android Studio)

## Setup

```powershell
cd Frontend

# Install dependencies
npm install

# Start Metro bundler
npm start
```

In a separate terminal:

```powershell
cd Frontend

# Build and run on Android
npx react-native run-android
```

Make sure an Android emulator is running or a device is connected.

## Connect to the Python backend

The Python server runs on your Windows host at `http://localhost:3000`.

For Android devices/emulators:

```powershell
adb reverse tcp:3000 tcp:3000
```

Run this while a device/emulator is connected. After that, the app can use `http://localhost:3000` as the backend URL.

