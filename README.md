# VoetenChecken App

A mobile application for analyzing foot conditions and image quality using machine learning. The app captures or selects foot images and provides instant feedback on both image quality and potential foot conditions.

## Project Structure

```
VoetProj/
├── Frontend/           # React Native mobile app (Android/iOS)
├── PythonServer/       # Python Flask backend with ML models
└── README.md           # This file
```

## Features

- **Image Capture & Selection** - Take photos with augmented camera or select from gallery
- **Real-time Quality Feedback** - Live indicators for blur, darkness, and brightness
- **Foot Condition Analysis** - ML-powered classification of foot conditions
- **Voice Guidance** - Text-to-speech feedback during photo capture
- **Interactive Onboarding** - Step-by-step instructions for first-time users
- **Prediction History** - View past analyses on the home screen
- **Server-side Data Logging** - Images and predictions saved for review

## Quick Start

### Prerequisites

| Component | Version |
|-----------|---------|
| Node.js | 18+ |
| Python | 3.11 |
| Android Studio | Latest (with SDK & emulator) |
| ADB | Included with Android Studio |

### 1. Start the Python Backend

```powershell
cd PythonServer


# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the server
python python_server.py
```

By default the server listens on `http://localhost:3000` (adjust if you have changed this in `python_server.py`).

```powershell
# Create virtual environment (first time only)
python -m venv .venv
```


### 2. Start the React Native App

Open a new terminal:

```powershell
cd Frontend

# Install dependencies (first time only)
npm install

# Start Metro bundler
npm start
```

Open another terminal:

```powershell
cd Frontend

# Build and run on Android
npx react-native run-android
```

### 3. Connect App to Backend

For Android emulator/device to reach the local server:

```powershell
adb reverse tcp:3000 tcp:3000
```

