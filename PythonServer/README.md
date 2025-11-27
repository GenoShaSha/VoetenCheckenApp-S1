# PythonServer

Backend server for the VoetenChecken app. It loads Keras models to classify foot conditions and image quality and exposes HTTP endpoints for the React Native app.

## Prerequisites

- Python 3.10+ installed
- (Recommended) virtual environment

## Setup

```powershell
cd "PythonServer"

python -m venv .venv

.\.venv\Scripts\activate

# Only install it when running for the first time
pip install -r requirements.txt
```

(Adjust to match the actual imports in `python_server.py` IF needed.)

## Run the server

```powershell
cd "PythonServer"
.\.venv\Scripts\activate
python python_server.py
```

The server will start on `http://localhost:3000` unless configured otherwise in `python_server.py`.

## Using from the app

- Ensure the server is running before starting the React Native app.
- If using an Android emulator, forward the port so the device can reach your Windows host:

```powershell
adb reverse tcp:3000 tcp:3000
```

The React Native app should then be able to send requests to `http://localhost:3000`.
