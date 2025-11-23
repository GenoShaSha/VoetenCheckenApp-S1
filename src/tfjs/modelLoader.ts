import * as tf from '@tensorflow/tfjs';
import * as base64js from 'base64-js';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import * as JPEGDecoder from 'jpeg-js';

let initialized = false;
let conditionModel: tf.LayersModel | null = null;
let iqaModel: tf.LayersModel | null = null;

export async function initTF() {
  if (initialized) {
    console.log('[TFJS] Already initialized, skipping');
    return;
  }
  console.log('[TFJS] Starting initialization...');

  try {
    console.log('[TFJS] Importing core TFJS...');
    await tf.ready();
    console.log('[TFJS] tf.ready() completed');

    // 🔧 Patch env().platform for React Native (isTypedArray + fetch)
    try {
      const env = (tf as any).env?.();
      if (env) {
        const platformName =
          typeof env.getPlatformName === 'function'
            ? env.getPlatformName()
            : 'react-native';

        const existingPlatform = env.platform || {};
        const patchedPlatform = {
          ...existingPlatform,
          // Ensure isTypedArray exists
          isTypedArray:
            existingPlatform.isTypedArray ||
            ((x: any) =>
              x != null &&
              (ArrayBuffer.isView(x) ||
                x instanceof ArrayBuffer ||
                x instanceof Float32Array ||
                x instanceof Uint8Array ||
                x instanceof Int32Array ||
                x instanceof Uint8ClampedArray)),
          // Ensure fetch exists, using React Native global fetch
          fetch:
            existingPlatform.fetch ||
            ((input: any, init?: any) => {
              if (typeof fetch !== 'function') {
                throw new Error(
                  '[TFJS] global fetch is not available in this environment'
                );
              }
              return (fetch as any)(input, init);
            }),
        };

        console.log('[TFJS] Patching env().platform for React Native');
        env.setPlatform(platformName, patchedPlatform);
      } else {
        console.warn('[TFJS] tf.env() not available; skipping platform patch');
      }
    } catch (patchErr) {
      console.warn('[TFJS] Failed to patch env().platform:', patchErr);
    }

    // Backend selection (unchanged)
    console.log('[TFJS] Attempting to set rn-webgl backend...');
    try {
      await tf.setBackend('rn-webgl');
      await tf.ready();
      console.log('[TFJS] Successfully set backend to rn-webgl');
    } catch (e) {
      console.warn('[TFJS] rn-webgl not available, falling back to cpu:', e);
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('[TFJS] Successfully set backend to cpu');
    }

    console.log('[TFJS] Initialization complete');
    initialized = true;
  } catch (e) {
    console.error('[TFJS] Initialization failed:', e);
    throw e;
  }
}

/**
 * ----- MODEL ASSETS -----
 * Paths are relative to this file: src/tfjs/modelLoader.ts
 * Project root has: /my_tfjs_models/condition_model and /my_tfjs_models/iqa_model
 *
 * IMPORTANT: update shard filenames below to match your actual files
 * (they are usually named like group1-shard1of3.bin, group1-shard2of3.bin, etc.)
 */

// CONDITION MODEL ASSETS
// Metro returns numeric resource IDs for these require() calls; we cast
// them to the types expected by bundleResourceIO/loadLayersModel.
const conditionModelJson = require('../../my_tfjs_models/condition_model/model.json') as unknown as tf.io.ModelJSON;
const conditionModelWeights = [
  require('../../my_tfjs_models/condition_model/group1-shard1of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard2of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard3of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard4of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard5of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard6of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard7of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard8of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard9of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard10of11.bin') as number,
  require('../../my_tfjs_models/condition_model/group1-shard11of11.bin') as number,
];

// IQA MODEL ASSETS
const iqaModelJson = require('../../my_tfjs_models/iqa_model/model.json') as unknown as tf.io.ModelJSON;
const iqaModelWeights = [
  require('../../my_tfjs_models/iqa_model/group1-shard1of5.bin') as number,
  require('../../my_tfjs_models/iqa_model/group1-shard2of5.bin') as number,
  require('../../my_tfjs_models/iqa_model/group1-shard3of5.bin') as number,
  require('../../my_tfjs_models/iqa_model/group1-shard4of5.bin') as number,
  require('../../my_tfjs_models/iqa_model/group1-shard5of5.bin') as number,
];

/**
 * Generic helper using bundleResourceIO so we don't hit network/fetch/file:// issues.
 */
async function loadModelFromBundle(
  jsonAsset: tf.io.ModelJSON,
  weightAssets: number[],
  name: string
) {
  console.log(`[MODEL_LOADER] Attempting to load ${name} from bundled assets...`);
  try {
    const handler = bundleResourceIO(jsonAsset, weightAssets);
    const model = await tf.loadLayersModel(handler);
    console.log(`[MODEL_LOADER] ${name} loaded successfully`);

    if (model && typeof model === 'object') {
      console.log(`[MODEL_LOADER] ${name} keys:`, Object.keys(model).slice(0, 10));
      if ((model as any).inputs) {
        console.log(`[MODEL_LOADER] ${name} inputs:`, (model as any).inputs);
      }
      if ((model as any).outputs) {
        console.log(`[MODEL_LOADER] ${name} outputs:`, (model as any).outputs);
      }
    }

    return model;
  } catch (e) {
    console.error(`[MODEL_LOADER] FAILED to load ${name} from bundle:`, e);
    if (e instanceof Error) {
      console.error(`[MODEL_LOADER] Error name: ${e.name}`);
      console.error(`[MODEL_LOADER] Error message: ${e.message}`);
      console.error(`[MODEL_LOADER] Error stack:`, e.stack);
    }
    if (typeof e === 'object' && e !== null) {
      console.error(
        `[MODEL_LOADER] Error object keys:`,
        Object.keys(e as Record<string, unknown>)
      );
      try {
        console.error(
          `[MODEL_LOADER] Full error object:`,
          JSON.stringify(e, null, 2)
        );
      } catch {
        // ignore stringify errors
      }
    }
    throw e;
  }
}

export async function loadConditionModel() {
  if (conditionModel) return conditionModel;
  conditionModel = await loadModelFromBundle(
    conditionModelJson,
    conditionModelWeights,
    'condition_model'
  );
  return conditionModel;
}

export async function loadIqaModel() {
  if (iqaModel) return iqaModel;
  iqaModel = await loadModelFromBundle(
    iqaModelJson,
    iqaModelWeights,
    'iqa_model'
  );
  return iqaModel;
}

/**
 * Decode base64/URI JPEG into a [H, W, 3] float32 tensor in [0, 1].
 */
export async function decodeImageToTensor(input: string | { base64: string }) {
  console.log('[DECODE] Starting image decode...');

  try {
    let u8: Uint8Array;

    if (typeof input === 'string') {
      console.log('[DECODE] Input is URI string, fetching...');
      const response = await fetch(input);
      const arrayBuffer = await response.arrayBuffer();
      u8 = new Uint8Array(arrayBuffer);
      console.log('[DECODE] Fetched image, size:', u8.length, 'bytes');
    } else if (input && (input as any).base64) {
      const b64 = (input as any).base64 as string;
      console.log('[DECODE] Input is base64, length:', b64.length);
      console.log('[DECODE] First 50 chars:', b64.substring(0, 50));

      const comma = b64.indexOf(',');
      const pure = comma >= 0 ? b64.substring(comma + 1) : b64;
      console.log('[DECODE] Pure base64 length:', pure.length);

      u8 = base64js.toByteArray(pure);
      console.log('[DECODE] Decoded to Uint8Array, size:', u8.length, 'bytes');
      console.log(
        '[DECODE] First 10 bytes (hex):',
        Array.from(u8.slice(0, 10))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ')
      );

      if (u8[0] !== 0xff || u8[1] !== 0xd8) {
        console.warn(
          '[DECODE] WARNING: Does not appear to be a valid JPEG (missing SOI marker)'
        );
        console.warn(
          '[DECODE] First two bytes:',
          u8[0].toString(16),
          u8[1].toString(16)
        );
      }
    } else {
      throw new Error('decodeImageToTensor: expected uri or base64 input');
    }

    console.log('[DECODE] Decoding JPEG using jpeg-js...');
    const decoded = JPEGDecoder.decode(u8);
    console.log(
      '[DECODE] JPEG decoded, width:',
      decoded.width,
      'height:',
      decoded.height
    );

    const width = decoded.width;
    const height = decoded.height;
    const pixels = decoded.data;

    const rgbArray = new Float32Array(width * height * 3);
    let idx = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      rgbArray[idx++] = pixels[i] / 255; // R
      rgbArray[idx++] = pixels[i + 1] / 255; // G
      rgbArray[idx++] = pixels[i + 2] / 255; // B
      // skip alpha
    }

    const tensor = tf.tensor3d(rgbArray, [height, width, 3]);
    console.log('[DECODE] Tensor created successfully, shape:', tensor.shape);
    return tensor;
  } catch (e) {
    console.error('[DECODE] Image decode failed:', e);
    if (e instanceof Error) {
      console.error('[DECODE] Error message:', e.message);
      console.error('[DECODE] Stack:', e.stack);
    }
    throw e;
  }
}

/**
 * CONDITION MODEL INFERENCE
 */
export async function runConditionInference(imgTensor: tf.Tensor3D) {
  console.log('[INFERENCE_COND] Starting condition inference...');
  console.log('[INFERENCE_COND] Input tensor shape:', imgTensor.shape);

  try {
    console.log('[INFERENCE_COND] Loading condition model...');
    const model = await loadConditionModel();
    console.log('[INFERENCE_COND] Model loaded');

    // imgTensor is already [0,1]; just resize + add batch
    console.log('[INFERENCE_COND] Preprocessing: resizing to 300x300...');
    const input = tf
      .image
      .resizeBilinear(imgTensor as any, [300, 300])
      .expandDims(0);
    console.log('[INFERENCE_COND] Input tensor prepared, shape:', input.shape);

    console.log('[INFERENCE_COND] Running model.predict()...');
    const out = model.predict(input) as tf.Tensor;
    console.log('[INFERENCE_COND] Prediction complete, output shape:', out.shape);

    console.log('[INFERENCE_COND] Extracting output data...');
    const data = await out.data();
    console.log('[INFERENCE_COND] Output data extracted, length:', data.length);

    const result = Array.from(data);
    console.log(
      '[INFERENCE_COND] Inference complete, returning',
      result.length,
      'scores'
    );
    return result;
  } catch (e) {
    console.error('[INFERENCE_COND] Condition inference failed:', e);
    if (e instanceof Error) {
      console.error('[INFERENCE_COND] Error message:', e.message);
      console.error('[INFERENCE_COND] Stack:', e.stack);
    }
    throw e;
  }
}

/**
 * IQA MODEL INFERENCE
 */
export async function runIqaInference(imgTensor: tf.Tensor3D) {
  console.log('[INFERENCE_IQA] Starting IQA inference...');
  console.log('[INFERENCE_IQA] Input tensor shape:', imgTensor.shape);

  try {
    console.log('[INFERENCE_IQA] Loading IQA model...');
    const model = await loadIqaModel();
    console.log('[INFERENCE_IQA] Model loaded');

    console.log('[INFERENCE_IQA] Preprocessing: resizing to 224x224...');
    const input = tf
      .image
      .resizeBilinear(imgTensor as any, [224, 224])
      .expandDims(0);
    console.log('[INFERENCE_IQA] Input tensor prepared, shape:', input.shape);

    console.log('[INFERENCE_IQA] Running model.predict()...');
    const out = model.predict(input) as tf.Tensor;
    console.log('[INFERENCE_IQA] Prediction complete, output shape:', out.shape);

    console.log('[INFERENCE_IQA] Extracting output data...');
    const data = await out.data();
    console.log('[INFERENCE_IQA] Output data extracted, length:', data.length);

    const result = Array.from(data);
    console.log(
      '[INFERENCE_IQA] Inference complete, returning',
      result.length,
      'scores'
    );
    return result;
  } catch (e) {
    console.error('[INFERENCE_IQA] IQA inference failed:', e);
    if (e instanceof Error) {
      console.error('[INFERENCE_IQA] Error message:', e.message);
      console.error('[INFERENCE_IQA] Stack:', e.stack);
    }
    throw e;
  }
}