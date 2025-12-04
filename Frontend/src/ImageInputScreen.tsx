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
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';
import {initTF} from './tfjs/modelLoader';
import RNFS from 'react-native-fs';
import {Camera} from 'react-native-vision-camera';
import type {CameraPermissionStatus} from 'react-native-vision-camera';
import {runAnalysisPipeline} from './analysisPipeline';
let launchImageLibrary: any = null;
let launchCamera: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  launchImageLibrary = require('react-native-image-picker').launchImageLibrary;
} catch (e) {}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  launchCamera = require('react-native-image-picker').launchCamera;
} catch (e) {}


type Props = NativeStackScreenProps<RootStackParamList, 'ImageInput'>;

type ImageResult = {
  uri?: string;
  fileName?: string;
  fileSize?: number;
  type?: string;
  base64?: string | null;
};

// Helper to read a local file (e.g. from VisionCamera) into base64
const readFileToBase64 = async (uri: string): Promise<string> => {
  // VisionCamera gives e.g. file:///data/user/0/...  RNFS expects paths without scheme
  const path = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
  const base64 = await RNFS.readFile(path, 'base64');
  return base64;
};

export default function ImageInputScreen({navigation}: Props) {
  const [image, setImage] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

//   const requestCameraPermission = async () => {
//     if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
//       return true;
//     }

//     const status = (await Camera.requestCameraPermission()) as CameraPermissionStatus;

//     if (status === 'denied' || status === 'restricted') {
//       setError(
//         'Camera permission is denied. Please enable it in Settings > Apps > VoetProj > Permissions.',
//       );
//       return false;
//     }

//     return status === 'granted';
//   };

const requestCameraPermission = async () => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return true;
  }

  const status = (await Camera.requestCameraPermission()) as CameraPermissionStatus;

  if (status === 'denied' || status === 'restricted') {
    setError(
      'Camera permission is denied. Please enable it in Settings > Apps > VoetProj > Permissions.',
    );
    return false;
  }

  return status === 'granted';
};

  const pickImage = async () => {
    setError(null);
    setImage(null);

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
      const res = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
      });

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
        base64: asset.base64 ?? null,
      };
      setImage(picked);

      // Start pipeline
      await runPipeline(picked);
    } catch (e: any) {
      setError(String(e?.message || e));
      setLoading(false);
    }
  };

  const takePicture = async () => {
    setError(null);
    setImage(null);

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      return;
    }

    if (!launchCamera) {
      setError(
        "Package 'react-native-image-picker' is not installed. Run 'npm install react-native-image-picker' and rebuild the app.",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
        saveToPhotos: false,
      });

      if (res?.didCancel) {
        setLoading(false);
        return;
      }
      if (res?.errorCode) {
        setError(res.errorMessage || 'Camera error');
        setLoading(false);
        return;
      }

      const asset = res?.assets?.[0];
      if (!asset) {
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

      await runPipeline(captured);
    } catch (e: any) {
      setError(String(e?.message || e));
      setLoading(false);
    }
  };

  const runPipeline = async (picked: ImageResult) => {
    try {
      await initTF();
      if (!picked.base64) {
        throw new Error('No base64 data available for prediction');
      }

      await runAnalysisPipeline({
        navigation: navigation as any,
        imageUri: picked.uri,
        base64: picked.base64,
      });
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      setError('Model inference failed: ' + String(e?.message ?? e));
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>Voet Check</Text>
        <TouchableOpacity
          style={styles.instructionsButton}
          onPress={() => navigation.navigate('Instructions')}
          activeOpacity={0.7}>
          <Text style={styles.instructionsIcon}>📖</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Foot Image Analysis</Text>
            <Text style={styles.headerSubtitle}>
              Select a clear picture of the foot to analyze quality and
              condition.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={pickImage}
              activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Select from gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('AugmentedCamera')}
              activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Use camera</Text>
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator style={styles.loading} />}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {image?.uri ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Selected image</Text>
              <Image source={{uri: image.uri}} style={styles.preview} />
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // reuse your existing styles (copy from your current file)
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  navbar: {
    height: 56,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.4)',
  },
  navbarTitle: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  instructionsButton: {
    padding: 8,
  },
  instructionsIcon: {
    fontSize: 22,
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#0b1120',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 14,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#f9fafb',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#15803d',
  },
  loading: {
    marginVertical: 12,
  },
  card: {
    marginTop: 14,
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 10,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#111827',
    marginBottom: 12,
  },
  error: {
    color: '#f97373',
    marginTop: 10,
    fontSize: 13,
  },
});