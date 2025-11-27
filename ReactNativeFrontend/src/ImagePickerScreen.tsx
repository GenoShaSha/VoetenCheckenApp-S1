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

import { initTF } from './tfjs/modelLoader';

const conditionLabels = require('../my_tfjs_models/condition_labels.json');
const iqaLabels = require('../my_tfjs_models/iqa_labels.json');
let launchImageLibrary: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  launchImageLibrary = require('react-native-image-picker').launchImageLibrary;
} catch (e) {
}

type ImageResult = {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
  base64?: string | null;
};

export default function ImagePickerScreen() {
  const [image, setImage] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCvMetrics, setOpenCvMetrics] = useState<{
    Sharpness_Laplacian?: number;
    Contrast_STD?: number;
    Brightness?: number;
    NoiseVariance?: number;
    Blockiness?: number;
  } | null>(null);

  const warnEmoji = '⚠️';

  const getMetricWarning = (key: string, value?: number) => {
    if (value == null) {
      return '';
    }

    switch (key) {
      case 'Sharpness_Laplacian':
        return value < 100 ? ` ${warnEmoji}` : '';
      case 'Contrast_STD':
        return value < 20 || value > 60 ? ` ${warnEmoji}` : '';
      case 'Brightness':
        return value < 80 || value > 180 ? ` ${warnEmoji}` : '';
      case 'NoiseVariance':
        return value > 20000 ? ` ${warnEmoji}` : '';
      case 'Blockiness':
        return value > 300 ? ` ${warnEmoji}` : '';
      default:
        return '';
    }
  };

  const requestAndroidPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const sdk = Number(Platform.Version) || 0;
      const perm =
        sdk >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ??
            'android.permission.READ_MEDIA_IMAGES'
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const already = await PermissionsAndroid.check(perm as any);
      if (already) return true;

      const granted = await PermissionsAndroid.request(perm as any, {
        title: 'Permission to access photos',
        message: 'We need access to your photos to choose a picture',
        buttonPositive: 'OK',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const pickImage = async () => {
    console.log('[PICK_IMAGE] Image picker initiated');
    setError(null);
    setAnalysis(null);
    setOpenCvMetrics(null);
    
    console.log('[PICK_IMAGE] Requesting Android permission...');
    const hasPermission = await requestAndroidPermission();
    if (!hasPermission) {
      console.warn('[PICK_IMAGE] Permission denied');
      setError('Permission denied');
      return;
    }
    console.log('[PICK_IMAGE] Permission granted');

    if (!launchImageLibrary) {
      console.error('[PICK_IMAGE] launchImageLibrary not available');
      setError(
        "Package 'react-native-image-picker' is not installed. Run 'npm install react-native-image-picker' and rebuild the app.",
      );
      return;
    }

    setLoading(true);
    try {
      console.log('[PICK_IMAGE] Opening image library...');
      const res = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
      });

      if (res?.didCancel) {
        console.log('[PICK_IMAGE] User cancelled image selection');
        setLoading(false);
        return;
      }
      if (res?.errorCode) {
        console.error('[PICK_IMAGE] Image picker error:', res.errorCode, res.errorMessage);
        setError(res.errorMessage || 'Image picker error');
        setLoading(false);
        return;
      }
      const asset = res?.assets?.[0];
      if (!asset) {
        console.error('[PICK_IMAGE] No asset returned');
        setError('No image selected');
        setLoading(false);
        return;
      }

      console.log('[PICK_IMAGE] Image selected:', {
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        type: asset.type,
        hasUri: !!asset.uri,
        hasBase64: !!asset.base64,
        base64Length: asset.base64?.length,
      });

      const picked: ImageResult = {
        uri: asset.uri,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        type: asset.type,
        base64: asset.base64 ?? null,
      };
      setImage(picked);

      try {
        console.log('[PICK_IMAGE] ========== STARTING INFERENCE PIPELINE (BACKEND) ==========');

        console.log('[PICK_IMAGE] Step 1: Initialize TFJS (for any local ops)...');
        await initTF();
        console.log('[PICK_IMAGE] Step 1: TFJS initialized');

        if (!picked.base64) {
          throw new Error('No base64 data available for prediction');
        }

        console.log('[PICK_IMAGE] Step 2: Sending image to backend...');
        const backendUrl = 'http://localhost:3000/predict';
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({imageBase64: picked.base64}),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Backend error ${response.status}: ${text}`);
        }

        const json = await response.json();
        const condScores = json.conditionScores || [];
        const iqaScores = json.iqaScores || [];
        const opencv = json.opencvMetrics || null;

        console.log('[PICK_IMAGE] Step 3: Backend response received');

        console.log('[PICK_IMAGE] Step 4: Process results...');
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

        console.log('[PICK_IMAGE] Step 4: Results processed');
        console.log('[PICK_IMAGE] Top condition results:', condTop);
        console.log('[PICK_IMAGE] Top IQA results:', iqaTop);
        console.log('[PICK_IMAGE] OpenCV metrics:', opencv);
        console.log('[PICK_IMAGE] ========== INFERENCE PIPELINE COMPLETE (BACKEND) ==========');
        setAnalysis({condition: condTop, iqa: iqaTop});
        setOpenCvMetrics(opencv);
      } catch (e: any) {
        console.error('[PICK_IMAGE] ========== INFERENCE PIPELINE FAILED ==========');
        console.error('Model inference error:', e);
        console.error('Error type:', typeof e);
        console.error('Error constructor:', e?.constructor?.name);

        try {
          console.log(
            'Error keys:',
            e && typeof e === 'object' ? Object.keys(e) : null,
          );
          if (e && (e as any).errors) {
            console.log('Nested bundler / TFJS errors:');
            (e as any).errors.forEach((err: any, idx: number) => {
              console.log(
                `[${idx}] message:`,
                err?.message,
                'type:',
                err?.type,
                'filename:',
                err?.filename,
                'line:',
                err?.lineNumber,
                'column:',
                err?.column,
              );
            });
          }
          if (e?.stack) {
            console.log('Error stack:\n', e.stack);
          }
        } catch (logErr) {
          console.log('Error while logging original error:', logErr);
        }

        setError('Model inference failed: ' + String(e?.message ?? e));
        setAnalysis(null);
      }
    } catch (e: any) {
      console.error('[PICK_IMAGE] pickImage outer error:', e);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Choose a picture</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={pickImage}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>Select from gallery</Text>
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

            {Array.isArray(analysis.iqa) ? (
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
            ) : null}

            {openCvMetrics ? (
              <View style={styles.resultSection}>
                <Text style={styles.resultTitle}>OpenCV Quality Metrics</Text>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Sharpness (Laplacian)</Text>
                  <Text style={styles.resultValue}>
                    {openCvMetrics.Sharpness_Laplacian?.toFixed(2) ?? '—'}
                    {getMetricWarning(
                      'Sharpness_Laplacian',
                      openCvMetrics.Sharpness_Laplacian,
                    )}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Contrast (STD)</Text>
                  <Text style={styles.resultValue}>
                    {openCvMetrics.Contrast_STD?.toFixed(2) ?? '—'}
                    {getMetricWarning('Contrast_STD', openCvMetrics.Contrast_STD)}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Brightness</Text>
                  <Text style={styles.resultValue}>
                    {openCvMetrics.Brightness?.toFixed(2) ?? '—'}
                    {getMetricWarning('Brightness', openCvMetrics.Brightness)}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Noise variance</Text>
                  <Text style={styles.resultValue}>
                    {openCvMetrics.NoiseVariance?.toFixed(2) ?? '—'}
                    {getMetricWarning(
                      'NoiseVariance',
                      openCvMetrics.NoiseVariance,
                    )}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Blockiness</Text>
                  <Text style={styles.resultValue}>
                    {openCvMetrics.Blockiness?.toFixed(2) ?? '—'}
                    {getMetricWarning('Blockiness', openCvMetrics.Blockiness)}
                  </Text>
                </View>
              </View>
            ) : null}

            {Array.isArray(analysis.condition) ? (
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
            ) : null}
          </View>
        ) : null}

        {!launchImageLibrary ? (
          <View style={styles.hint}>
            <Text>
              Note: To enable real gallery selection, install the native
              package:
            </Text>
            <Text style={styles.command}>
              npm install react-native-image-picker
            </Text>
            <Text>Then rebuild the app (Android: `npx react-native run-android`).</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// Placeholder analyzer removed — app now requires on-device TFJS inference.

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fafafa'},
  content: {padding: 20, paddingBottom: 40, alignItems: 'center'},
  title: {fontSize: 22, fontWeight: '700', marginBottom: 16},
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
  },
  buttonText: {color: '#fff', fontWeight: '600', fontSize: 16},
  loading: {marginVertical: 12},
  previewContainer: {marginTop: 18, alignItems: 'center', width: '100%'},
  previewCard: {
    width: '100%',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
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
  analysisText: {color: '#111827', fontSize: 13},
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
