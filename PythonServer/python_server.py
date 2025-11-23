import base64
import io
import os

from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
from tensorflow import keras
from tensorflow.keras.applications.efficientnet import preprocess_input
import pickle

# ----------------------
# Paths (relative to project root)
# ----------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Image quality (IQA) model and encoder
IQA_MODEL_PATH = os.path.join(BASE_DIR, 'foot_quality_best.keras')
IQA_ENCODER_PATH = os.path.join(BASE_DIR, 'foot_quality_label_encoder.pkl')

# Condition classifier model and label binarizer
COND_MODEL_PATH = os.path.join(BASE_DIR, 'condition_classifier_efficientnetb3.keras')
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

    # Return raw scores as plain lists (React Native maps them to labels)
    return jsonify({
        'conditionScores': [float(x) for x in cond_probs],
        'iqaScores': [float(x) for x in iqa_probs],
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '3000'))
    print(f'[PYTHON_SERVER] Listening on http://localhost:{port}')
    app.run(host='localhost', port=port, debug=False)
