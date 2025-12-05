# PythonServer

Flask backend server for the VoetenChecken app. Provides ML-powered image quality assessment (IQA) and foot condition classification via REST API.

## Features

- **Image Quality Assessment (IQA)** - Detects blur, darkness, bad angles, and whether image shows a foot
- **Condition Classification** - Identifies foot conditions using EfficientNetB3
- **OpenCV Metrics** - Additional quality metrics (sharpness, contrast, brightness, noise)
- **Data Logging** - Saves all images and predictions to `data/` folder

## Project Structure

```
PythonServer/
├── python_server.py                 # Main Flask server
├── requirements.txt                 # Python dependencies
├── foot_quality_best.keras          # IQA model
├── foot_quality_label_encoder.pkl   # IQA label encoder
├── improved_models/
│   └── condition_classifier_*.keras # Condition model
├── condition_label_binarizer.pkl    # Condition label binarizer
├── data/                            # Saved predictions (auto-created)
│   └── YYYYMMDD_HHMMSS_*/
│       ├── image.jpg
│       └── prediction.json
└── VoetencheckenApp.ipynb           # Model training notebook
```

## Prerequisites

- Python 3.10 or higher
- pip (Python package manager)

## Setup

```powershell
cd PythonServer

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Server

```powershell
cd PythonServer
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

The app can then access the API at `http://localhost:3000/predict`

## Dependencies

| Package | Purpose |
|---------|---------|
| Flask | HTTP server |
| TensorFlow | ML model inference |
| Pillow | Image processing |
| OpenCV | Quality metrics |
| NumPy | Array operations |
| scikit-learn | Label encoding |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Model loading error | Ensure `.keras` files exist in correct paths |
| Port 3000 in use | Change port in `python_server.py` or kill existing process |
| CUDA errors | TensorFlow will fall back to CPU if GPU unavailable |
| Import errors | Ensure virtual environment is activated |

## License

This project is for educational purposes.
