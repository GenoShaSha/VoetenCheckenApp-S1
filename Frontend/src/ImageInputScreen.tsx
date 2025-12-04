import React, {useState, useCallback} from 'react';
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
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {RootStackParamList} from '../App';
import {initTF} from './tfjs/modelLoader';
import RNFS from 'react-native-fs';
import {Camera} from 'react-native-vision-camera';
import type {CameraPermissionStatus} from 'react-native-vision-camera';
import {runAnalysisPipeline} from './analysisPipeline';
import {
  loadHistory,
  clearHistory,
  formatDate,
  PredictionHistoryItem,
} from './historyStorage';
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
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);

  // Reload history whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchHistory = async () => {
        const items = await loadHistory();
        setHistory(items);
      };
      fetchHistory();
    }, []),
  );

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all prediction history?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
          },
        },
      ],
    );
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

  // Check if the image is a valid JPG/JPEG
  const isValidJpgImage = (asset: {type?: string; fileName?: string; uri?: string}): boolean => {
    // Check MIME type first
    if (asset.type) {
      const mimeType = asset.type.toLowerCase();
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        return true;
      }
    }
    // Fallback: check file extension
    const fileName = (asset.fileName || asset.uri || '').toLowerCase();
    return fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
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

      // Validate that the image is a JPG
      if (!isValidJpgImage(asset)) {
        setError(
          'Only JPG/JPEG images are supported. Please select a JPG image or take a photo with the camera.',
        );
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

      // Validate that the image is a JPG
      if (!isValidJpgImage(asset)) {
        setError(
          'Only JPG/JPEG images are supported. The camera should produce JPG images by default.',
        );
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

          {/* Prediction History Section */}
          {history.length > 0 && !loading && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>📋 Recent Checks</Text>
                <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.7}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
              </View>
              {history.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  {item.imageUri ? (
                    <Image
                      source={{uri: item.imageUri}}
                      style={styles.historyThumb}
                    />
                  ) : (
                    <View style={[styles.historyThumb, styles.historyThumbPlaceholder]}>
                      <Text style={styles.historyThumbPlaceholderText}>🦶</Text>
                    </View>
                  )}
                  <View style={styles.historyInfo}>
                    <View style={styles.historyRow}>
                      <Text
                        style={[
                          styles.historyStatus,
                          item.isGoodQuality
                            ? styles.historyStatusGood
                            : styles.historyStatusBad,
                        ]}>
                        {item.isGoodQuality ? '✓ Good Quality' : '✕ Not Accepted'}
                      </Text>
                      <Text style={styles.historyDate}>
                        {formatDate(item.timestamp)}
                      </Text>
                    </View>
                    {item.isGoodQuality && item.condition ? (
                      <Text style={styles.historyCondition} numberOfLines={1}>
                        {item.condition}
                      </Text>
                    ) : item.rejectionReason ? (
                      <Text style={styles.historyRejection} numberOfLines={1}>
                        {item.rejectionReason}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Empty state when no history */}
          {history.length === 0 && !loading && !image?.uri && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📷</Text>
              <Text style={styles.emptyStateText}>
                Your foot check history will appear here
              </Text>
            </View>
          )}
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
  // History styles
  historySection: {
    marginTop: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  clearButton: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  historyThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  historyThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyThumbPlaceholderText: {
    fontSize: 22,
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyStatusGood: {
    color: '#4ade80',
  },
  historyStatusBad: {
    color: '#f87171',
  },
  historyDate: {
    fontSize: 11,
    color: '#64748b',
  },
  historyCondition: {
    fontSize: 12,
    color: '#94a3b8',
  },
  historyRejection: {
    fontSize: 12,
    color: '#fbbf24',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});