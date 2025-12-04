import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import type {CameraPermissionRequestResult} from 'react-native-vision-camera';

import {initTF} from './tfjs/modelLoader';

const conditionLabels = require('../my_tfjs_models/condition_labels.json');
const iqaLabels = require('../my_tfjs_models/iqa_labels.json');

type ImageResult = {
  uri: string;
  base64: string;
};

export default function VisionCameraScreen() {
  const cameraRef = useRef<Camera | null>(null);
const device = useCameraDevice('back');

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [captured, setCaptured] = useState<ImageResult | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


useEffect(() => {
  (async () => {
    const rawStatus = await Camera.requestCameraPermission();

    // Normalize to string safely
    const status = String(rawStatus) as string;

    const granted = status === 'authorized';
    setHasPermission(granted);

    if (!granted) {
      setError(
        'Camera permission denied. Please enable it in Settings > Apps > VoetProj > Permissions.',
      );
    }
  })();
}, []);

  const takePicture = async () => {
    if (!cameraRef.current) {
      return;
    }
    setError(null);
    setAnalysis(null);
    setCaptured(null);
    setLoading(true);

    try {
 const photo = await cameraRef.current.takePhoto();

      const uri = `file://${photo.path}`;
      // Vision Camera does not give base64 directly; in a real app
      // you’d read the file and convert to base64 here.
      // For now we just send the file path placeholder.
      await initTF();

      // TODO: replace this with real base64 from file
      setError(
        'VisionCamera capture is working. Next step: read photo.path and convert to base64 before sending to backend.',
      );
      setCaptured({uri, base64: ''});
      setLoading(false);
    } catch (e: any) {
      console.error('[VISION] capture error', e);
      setError(String(e?.message ?? e));
      setLoading(false);
    }
  };

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>
          Camera permission is denied. Please enable it in Settings.
        </Text>
      </View>
    );
  }

  if (!device || hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
      />

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.shutter} onPress={takePicture}>
          <Text style={styles.shutterText}>Capture</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.bottomPanel}>
        {loading && <ActivityIndicator style={styles.loading} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {captured?.uri && (
          <View style={styles.previewContainer}>
            <Image source={{uri: captured.uri}} style={styles.preview} />
          </View>
        )}

        {analysis && (
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
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  camera: {flex: 1},
  overlay: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  shutterText: {color: '#fff', fontWeight: '600', fontSize: 16},
  bottomPanel: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fafafa',
  },
  loading: {marginVertical: 8},
  previewContainer: {alignItems: 'center', marginBottom: 12},
  preview: {width: 220, height: 220, borderRadius: 12, backgroundColor: '#eee'},
  analysis: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  subtitle: {fontWeight: '600', marginBottom: 8},
  error: {
    color: 'crimson',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
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