import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import {initTF} from './tfjs/modelLoader';

const conditionLabels = require('../my_tfjs_models/condition_labels.json');
const iqaLabels = require('../my_tfjs_models/iqa_labels.json');

let launchCamera: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  launchCamera = require('react-native-image-picker').launchCamera;
} catch (e) {}

type ImageResult = {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
  base64?: string | null;
};

export default function CameraScreen() {
  const [image, setImage] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);



// const requestCameraPermission = async () => {
//   if (Platform.OS !== 'android') {
//     return true;
//   }

//   try {
//     const sdk = Number(Platform.Version) || 0;

//     const cameraPerm = PermissionsAndroid.PERMISSIONS.CAMERA;
//     const storagePerm =
//       sdk >= 33
//         ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
//         : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

//     // If storagePerm is missing for some reason, just request camera
//     if (!storagePerm) {
//       const camResult = await PermissionsAndroid.request(cameraPerm);
//       if (camResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
//         setError(
//           'Camera permission is permanently denied. Please enable it in Settings > Apps > VoetProj > Permissions.',
//         );
//       }
//       return camResult === PermissionsAndroid.RESULTS.GRANTED;
//     }

//     const alreadyCamera = await PermissionsAndroid.check(cameraPerm);
//     const alreadyStorage = await PermissionsAndroid.check(storagePerm);

//     if (alreadyCamera && alreadyStorage) {
//       return true;
//     }

//     const granted = await PermissionsAndroid.requestMultiple([
//       cameraPerm,
//       storagePerm,
//     ]);

//     console.log('[PERM] granted', granted); // temporary

//     const camResult = granted[cameraPerm];
//     const storResult = granted[storagePerm];

//     console.log('[PERM] camResult', camResult, 'storResult', storResult); //temp
//     if (camResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
//   setError(
//     'Camera permission is permanently denied. Please enable it in Settings > Apps > VoetProj > Permissions.',
//   );
// }

// const camOk = camResult === PermissionsAndroid.RESULTS.GRANTED;
// // allow even if storResult is denied
// return camOk;

//     // const camOk = camResult === PermissionsAndroid.RESULTS.GRANTED;
//     // const storOk = storResult === PermissionsAndroid.RESULTS.GRANTED;

//     // if (camResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
//     //   setError(
//     //     'Camera permission is permanently denied. Please enable it in Settings > Apps > VoetProj > Permissions.',
//     //   );
//     // }

//     // return camOk && storOk;
//   } catch (err) {
//     console.warn('[PERM] Permission error:', err);
//     setError('Unable to request camera permission. Please try again.');
//     return false;
//   }
// };

const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const sdk = Number(Platform.Version) || 0;

    const cameraPerm = PermissionsAndroid.PERMISSIONS.CAMERA;
    const storagePerm =
      sdk >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    // Just ask for CAMERA first and decide only on that.
    const camResult = await PermissionsAndroid.request(cameraPerm);
    console.log('[PERM] single camResult', camResult);

    if (camResult === PermissionsAndroid.RESULTS.GRANTED) {
      // (Optional) ask storage, but ignore its result for now
      if (storagePerm) {
        const storResult = await PermissionsAndroid.request(storagePerm);
        console.log('[PERM] single storResult', storResult);
      }
      return true; // <- key: allow camera flow
    }

    if (camResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      setError(
        'Camera permission is permanently denied. Please enable it in Settings > Apps > VoetProj > Permissions.',
      );
    } else if (camResult === PermissionsAndroid.RESULTS.DENIED) {
      setError('Camera permission denied. Please allow it to take pictures.');
    }

    return false;
  } catch (err) {
    console.warn('[PERM] Permission error:', err);
    setError('Unable to request camera permission. Please try again.');
    return false;
  }
};

  const takePicture = async () => {
    console.log('[CAMERA] Capture initiated');
    setError(null);
    setAnalysis(null);
    setImage(null);

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.warn('[CAMERA] Permission denied');
      setError('Camera or storage permission denied');
      return;
    }

    if (!launchCamera) {
      console.error('[CAMERA] launchCamera not available');
      setError(
        "Package 'react-native-image-picker' is not installed. Run 'npm install react-native-image-picker' and rebuild the app.",
      );
      return;
    }

    setLoading(true);
    try {
      console.log('[CAMERA] Opening camera...');
      const res = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
        saveToPhotos: false,
      });

      if (res?.didCancel) {
        console.log('[CAMERA] User cancelled camera');
        setLoading(false);
        return;
      }

      if (res?.errorCode) {
        console.error('[CAMERA] Error:', res.errorCode, res.errorMessage);
        setError(res.errorMessage || 'Camera error');
        setLoading(false);
        return;
      }

      const asset = res?.assets?.[0];
      if (!asset) {
        console.error('[CAMERA] No asset returned');
        setError('No image captured');
        setLoading(false);
        return;
      }

      const captured: ImageResult = {
        uri: asset.uri,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        type: asset.type,
        base64: asset.base64 ?? null,
      };
      setImage(captured);

      console.log('[CAMERA] ========== STARTING INFERENCE PIPELINE (BACKEND) ==========');
      await initTF();

      if (!captured.base64) {
        throw new Error('No base64 data available for prediction');
      }

      const backendUrl = 'http://localhost:3000/predict';
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({imageBase64: captured.base64}),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Backend error ${response.status}: ${text}`);
      }

      const json = await response.json();
      const condScores = json.conditionScores || [];
      const iqaScores = json.iqaScores || [];

      const condTop = condScores
        .map((s: number, i: number) => ({
          label: conditionLabels[i] ?? String(i),
          score: s,
        }))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3);

      const iqaTop = iqaScores
        .map((s: number, i: number) => ({
          label: iqaLabels[i] ?? String(i),
          score: s,
        }))
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3);

      setAnalysis({condition: condTop, iqa: iqaTop});
      console.log('[CAMERA] ========== INFERENCE PIPELINE COMPLETE ==========');
    } catch (e: any) {
      console.error('[CAMERA] Pipeline error:', e);
      setError('Model inference failed: ' + String(e?.message ?? e));
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Take a picture</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={takePicture}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>Open camera</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator style={styles.loading} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {image?.uri ? (
          <View style={styles.previewContainer}>
            <Image source={{uri: image.uri}} style={styles.preview} />
            <Text style={styles.meta}>Name: {image.fileName ?? '—'}</Text>
            <Text style={styles.meta}>Type: {image.type ?? '—'}</Text>
            <Text style={styles.meta}>Size: {image.fileSize ?? '—'}</Text>
          </View>
        ) : null}

        {analysis ? (
          <View style={styles.analysis}>
            <Text style={styles.subtitle}>Analysis result</Text>

            {Array.isArray(analysis.condition) && (
              <View style={styles.resultSection}>
                <Text style={styles.resultTitle}>Condition</Text>
                {analysis.condition.map((item: any, idx: number) => (
                  <View key={`cond-${idx}`} style={styles.resultRow}>
                    <Text style={styles.resultLabel}>{item.label}</Text>
                    <Text style={styles.resultValue}>
                      {(item.score * 100).toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {Array.isArray(analysis.iqa) && (
              <View style={styles.resultSection}>
                <Text style={styles.resultTitle}>IQA</Text>
                {analysis.iqa.map((item: any, idx: number) => (
                  <View key={`iqa-${idx}`} style={styles.resultRow}>
                    <Text style={styles.resultLabel}>{item.label}</Text>
                    <Text style={styles.resultValue}>
                      {(item.score * 100).toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {!launchCamera && (
          <View style={styles.hint}>
            <Text>
              Note: To enable camera capture, install the native package:
            </Text>
            <Text style={styles.command}>
              npm install react-native-image-picker
            </Text>
            <Text>Then rebuild the app (Android: `npx react-native run-android`).</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fafafa'},
  content: {padding: 20, paddingBottom: 40, alignItems: 'center'},
  title: {fontSize: 22, fontWeight: '700', marginBottom: 16},
  button: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
  },
  buttonText: {color: '#fff', fontWeight: '600', fontSize: 16},
  loading: {marginVertical: 12},
  previewContainer: {marginTop: 18, alignItems: 'center', width: '100%'},
  preview: {width: 280, height: 280, borderRadius: 10, backgroundColor: '#eee'},
  meta: {marginTop: 8, color: '#374151'},
  analysis: {
    marginTop: 18,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  subtitle: {fontWeight: '600', marginBottom: 8},
  error: {color: 'crimson', marginTop: 12},
  hint: {marginTop: 18, padding: 8, backgroundColor: '#fff3cd', borderRadius: 6},
  command: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 6,
  },
  resultSection: {marginTop: 8},
  resultTitle: {fontSize: 16, fontWeight: '700', marginBottom: 6},
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  resultLabel: {color: '#374151'},
  resultValue: {color: '#111827', fontWeight: '600'},
});