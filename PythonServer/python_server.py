import base64
import io
import os
import json
from datetime import datetime

from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
from tensorflow import keras
from tensorflow.keras.applications.efficientnet import preprocess_input
import pickle
import cv2

# ----------------------
# Paths (relative to project root)
# ----------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data folder for saving images and predictions
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# Image quality (IQA) model and encoder
IQA_MODEL_PATH = os.path.join(BASE_DIR, 'foot_quality_best.keras')
IQA_ENCODER_PATH = os.path.join(BASE_DIR, 'foot_quality_label_encoder.pkl')

# Condition classifier model and label binarizer
COND_MODEL_PATH = os.path.join(BASE_DIR, './improved_models/condition_classifier_efficientnetb3_latest_improved.keras')
COND_BINARIZER_PATH = os.path.join(BASE_DIR, 'condition_label_binarizer.pkl')

IQA_IMG_SIZE = (224, 224)
COND_IMG_SIZE = (300, 300)

# ----------------------
# Load models and label mappers
# ----------------------
print('[PYTHON_SERVER] Loading Keras models and label encoders...')

try:
    iqa_model = keras.models.load_model(IQA_MODEL_PATH)
except Exception as e:
    raise RuntimeError(f'Could not load IQA model from {IQA_MODEL_PATH}: {e}')

try:
    with open(IQA_ENCODER_PATH, 'rb') as f:
        iqa_encoder = pickle.load(f)
    iqa_class_names = iqa_encoder.classes_.tolist()
except Exception as e:
    raise RuntimeError(f'Could not load IQA label encoder from {IQA_ENCODER_PATH}: {e}')

try:
    cond_model = keras.models.load_model(COND_MODEL_PATH)
except Exception as e:
    raise RuntimeError(f'Could not load condition model from {COND_MODEL_PATH}: {e}')

try:
    with open(COND_BINARIZER_PATH, 'rb') as f:
        cond_binarizer = pickle.load(f)
    cond_class_names = cond_binarizer.classes_.tolist()
except Exception as e:
    raise RuntimeError(f'Could not load condition label binarizer from {COND_BINARIZER_PATH}: {e}')

print('[PYTHON_SERVER] Models and encoders loaded successfully.')

# ----------------------
# Image decoding & preprocessing
# ----------------------

def decode_base64_image(image_base64: str) -> Image.Image:
    """Decode a base64 string to a PIL Image in RGB mode."""
    try:
        raw = base64.b64decode(image_base64)
        img = Image.open(io.BytesIO(raw)).convert('RGB')
        return img
    except Exception as e:
        raise ValueError(f'Invalid base64 image data: {e}')


def preprocess_for_iqa(img: Image.Image) -> np.ndarray:
    img_resized = img.resize(IQA_IMG_SIZE)
    arr = np.array(img_resized, dtype=np.float32)
    arr = preprocess_input(arr)
    return np.expand_dims(arr, axis=0)


def preprocess_for_condition(img: Image.Image) -> np.ndarray:
    img_resized = img.resize(COND_IMG_SIZE)
    arr = np.array(img_resized, dtype=np.float32)
    arr = preprocess_input(arr)
    return np.expand_dims(arr, axis=0)


def compute_opencv_metrics_from_pil(img: Image.Image) -> dict:
    arr = np.array(img)
    img_bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    contrast = float(np.std(gray))
    brightness = float(np.mean(gray))

    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    noise = float(np.var(gray - blurred))

    def blockiness_score(gray_img):
        h, w = gray_img.shape
        vertical_diff = np.sum(np.abs(gray_img[:, 1:] - gray_img[:, :-1]))
        horizontal_diff = np.sum(np.abs(gray_img[1:, :] - gray_img[:-1, :]))
        return float((vertical_diff + horizontal_diff) / (h * w))

    blockiness = blockiness_score(gray)

    return {
        'Sharpness_Laplacian': float(sharpness),
        'Contrast_STD': contrast,
        'Brightness': brightness,
        'NoiseVariance': noise,
        'Blockiness': blockiness,
    }


def save_prediction_data(img: Image.Image, iqa_probs: np.ndarray, cond_probs: np.ndarray, opencv_metrics: dict):
    """Save the image and prediction results to the data folder."""
    try:
        # Generate unique ID based on timestamp
        timestamp = datetime.now()
        prediction_id = timestamp.strftime('%Y%m%d_%H%M%S_%f')
        
        # Create subfolder for this prediction
        prediction_dir = os.path.join(DATA_DIR, prediction_id)
        os.makedirs(prediction_dir, exist_ok=True)
        
        # Save the image
        image_path = os.path.join(prediction_dir, 'image.jpg')
        img.save(image_path, 'JPEG', quality=95)
        
        # Build labeled predictions
        iqa_predictions = [
            {'label': iqa_class_names[i], 'score': float(iqa_probs[i])}
            for i in range(len(iqa_probs))
        ]
        iqa_predictions.sort(key=lambda x: x['score'], reverse=True)
        
        cond_predictions = [
            {'label': cond_class_names[i], 'score': float(cond_probs[i])}
            for i in range(len(cond_probs))
        ]
        cond_predictions.sort(key=lambda x: x['score'], reverse=True)
        
        # Build prediction data
        prediction_data = {
            'id': prediction_id,
            'timestamp': timestamp.isoformat(),
            'image_file': 'image.jpg',
            'iqa_predictions': iqa_predictions,
            'iqa_top_label': iqa_predictions[0]['label'] if iqa_predictions else None,
            'iqa_top_score': iqa_predictions[0]['score'] if iqa_predictions else None,
            'condition_predictions': cond_predictions,
            'condition_top_label': cond_predictions[0]['label'] if cond_predictions else None,
            'condition_top_score': cond_predictions[0]['score'] if cond_predictions else None,
            'opencv_metrics': opencv_metrics,
        }
        
        # Save prediction JSON
        json_path = os.path.join(prediction_dir, 'prediction.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(prediction_data, f, indent=2, ensure_ascii=False)
        
        print(f'[PYTHON_SERVER] Saved prediction data to: {prediction_dir}')
        return prediction_id
        
    except Exception as e:
        print(f'[PYTHON_SERVER] Warning: Failed to save prediction data: {e}')
        return None


# ----------------------
# Flask app
# ----------------------

app = Flask(__name__)


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True, silent=False)
    except Exception:
        return jsonify({'error': 'Invalid JSON body'}), 400

    if not isinstance(data, dict) or 'imageBase64' not in data:
        return jsonify({'error': 'imageBase64 field is required'}), 400

    image_base64 = data.get('imageBase64')
    if not isinstance(image_base64, str) or not image_base64:
        return jsonify({'error': 'imageBase64 must be a non-empty base64 string'}), 400

    try:
        img = decode_base64_image(image_base64)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    # IQA prediction
    iqa_input = preprocess_for_iqa(img)
    iqa_probs = iqa_model.predict(iqa_input, verbose=0)[0]

    # Condition prediction
    cond_input = preprocess_for_condition(img)
    cond_probs = cond_model.predict(cond_input, verbose=0)[0]

    opencv_metrics = compute_opencv_metrics_from_pil(img)

    # Save image and predictions to data folder
    save_prediction_data(img, iqa_probs, cond_probs, opencv_metrics)

    return jsonify({
        'conditionScores': [float(x) for x in cond_probs],
        'iqaScores': [float(x) for x in iqa_probs],
        'opencvMetrics': opencv_metrics,
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '3000'))
    print(f'[PYTHON_SERVER] Listening on http://localhost:{port}')
    app.run(host='localhost', port=port, debug=False)
