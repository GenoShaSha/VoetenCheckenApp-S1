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

// Try to import launchImageLibrary; guard so app still compiles if package not installed yet
let launchImageLibrary: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  launchImageLibrary = require('react-native-image-picker').launchImageLibrary;
} catch (e) {
  // package may not be installed; we'll show a helpful message in UI
}

type ImageResult = {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
};

export default function ImagePickerScreen() {
  const [image, setImage] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestAndroidPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      // Android 13+ uses READ_MEDIA_IMAGES; older versions use READ_EXTERNAL_STORAGE
      const sdk = Number(Platform.Version) || 0;
      const perm = sdk >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ?? 'android.permission.READ_MEDIA_IMAGES'
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      // If already granted, return true
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
    setError(null);
    setAnalysis(null);
    const hasPermission = await requestAndroidPermission();
    if (!hasPermission) {
      setError('Permission denied');
      return;
    }

    if (!launchImageLibrary) {
      setError(
        "Package 'react-native-image-picker' is not installed. Run 'npm install react-native-image-picker' and rebuild the app.",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1});
      // response can be {didCancel, errorCode, assets}
      if (res?.didCancel) {
        setLoading(false);
        return;
      }
      if (res?.errorCode) {
        setError(res.errorMessage || 'Image picker error');
        setLoading(false);
        return;
      }
      const asset = res?.assets?.[0];
      if (!asset) {
        setError('No image selected');
        setLoading(false);
        return;
      }
      const picked: ImageResult = {
        uri: asset.uri,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        type: asset.type,
      };
      setImage(picked);

      // Placeholder analyze function
      const details = await analyzeImagePlaceholder(picked);
      setAnalysis(details);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Choose a picture</Text>
        <TouchableOpacity style={styles.button} onPress={pickImage} activeOpacity={0.8}>
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
          <Text style={styles.subtitle}>Analysis result (placeholder)</Text>
          <Text style={styles.analysisText}>{JSON.stringify(analysis, null, 2)}</Text>
        </View>
      ) : null}

      {!launchImageLibrary ? (
        <View style={styles.hint}>
          <Text>
            Note: To enable real gallery selection, install the native package:
          </Text>
          <Text style={styles.command}>npm install react-native-image-picker</Text>
          <Text>Then rebuild the app (Android: `npx react-native run-android`).</Text>
        </View>
      ) : null}
    </ScrollView>
    </View>
  );
}

async function analyzeImagePlaceholder(img: ImageResult) {
  // Simulate a small delay as if running an analysis model locally
  await new Promise<void>((res) => setTimeout(() => res(), 700));
  // Return placeholder metadata / analysis
  return {
    fileName: img.fileName ?? null,
    uri: img.uri ?? null,
    fileSize: img.fileSize ?? null,
    labels: ['placeholder-object', 'example-label'],
    confidence: [0.92, 0.58],
    note: 'This is a placeholder for local AI model results',
  };
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fafafa'},
  content: {padding: 20, alignItems: 'center'},
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
  previewCard: {width: '100%', padding: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2},
  preview: {width: 280, height: 280, borderRadius: 10, backgroundColor: '#eee'},
  meta: {marginTop: 8, color: '#374151'},
  analysis: {marginTop: 18, padding: 12, backgroundColor: '#fff', borderRadius: 10, width: '100%', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1},
  subtitle: {fontWeight: '600', marginBottom: 8},
  analysisText: {color: '#111827', fontSize: 13},
  error: {color: 'crimson', marginTop: 12},
  hint: {marginTop: 18, padding: 8, backgroundColor: '#fff3cd', borderRadius: 6},
  command: {fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 6},
});
