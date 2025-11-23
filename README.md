# VoetenChecken App

Monorepo containing the React Native mobile app and a Python backend server for foot condition and image quality analysis.

## Projects

- `ReactNativeFrontend/` – React Native app (Android/iOS)
- `PythonServer/` – Python HTTP server exposing ML models

## Quick Start

### 1. Python backend

```powershell
cd "PythonServer"

python -m venv .venv
.\.venv\Scripts\activate

pip install -r requirements.txt

python python_server.py
```

By default the server listens on `http://localhost:3000` (adjust if you have changed this in `python_server.py`).

### 2. React Native app

In another terminal:

```powershell
cd "ReactNativeFrontend"

npm install

# start Metro bundler
npm start

# in a second terminal, build & run on Android
npx react-native run-android
```

Make sure an Android emulator or device with USB debugging is connected. If the Python server runs on your Windows host at port 3000, you can forward the port to Android using:

```powershell
adb reverse tcp:3000 tcp:3000
```

### 3. Environment notes

- Node: see required version in `ReactNativeFrontend/package.json` under `engines`.
- Python: 3.10+ recommended and a virtual environment per the steps above.

For project‑specific details, see `ReactNativeFrontend/README.md` and `PythonServer/README.md`.
