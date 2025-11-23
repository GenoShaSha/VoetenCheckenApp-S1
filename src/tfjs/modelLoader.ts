import * as tf from '@tensorflow/tfjs';
import * as base64js from 'base64-js';
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

export async function loadConditionModel() {
  throw new Error(
    'loadConditionModel is now handled on the backend. Call the backend prediction API instead.'
  );
}

export async function loadIqaModel() {
  throw new Error(
    'loadIqaModel is now handled on the backend. Call the backend prediction API instead.'
  );
}

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
// On-device model inference has been moved to the backend server.
// This file now only provides TFJS init and image decoding.