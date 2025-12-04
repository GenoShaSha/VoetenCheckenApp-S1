import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {Camera, useCameraDevices} from 'react-native-vision-camera';
import type {Camera as CameraType} from 'react-native-vision-camera';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';

export type CustomCameraScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ImageInput'
>;

export default function CustomCameraScreen({navigation}: CustomCameraScreenProps) {
const devices = useCameraDevices();
const device = devices.find(d => d.position === 'back') ?? devices[0] ?? null;
const cameraRef = useRef<CameraType | null>(null);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>(
    'pending',
  );
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      console.log('VISION CAMERA PERMISSION STATUS:', status);
      // Treat common "positive" statuses as granted
      const grantedStatuses = ['granted', 'authorized', 'limited'];
      setPermission(grantedStatuses.includes(status as string) ? 'granted' : 'denied');
    })();
  }, []);

  const capture = async () => {
    if (!cameraRef.current || !device || permission !== 'granted') {
      return;
    }
    setError(null);
    setTakingPhoto(true);
    try {
const photo = await cameraRef.current.takePhoto({
  flash: 'off',
  // qualityPrioritization: 'balanced',  // remove this line
});

      // For now, just go back; wiring into pipeline would pass path/uri
      navigation.goBack();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setTakingPhoto(false);
    }
  };

if (permission === 'pending' || !device) {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}

if (!cameraRef.current || !device || permission !== 'granted') {
  return;
}


  return (
    <View style={styles.root}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        ref={cameraRef}
        photo={true}
      />
      {error ? <Text style={styles.errorOverlay}>{error}</Text> : null}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={capture}
          activeOpacity={0.8}>
          {takingPhoto ? <ActivityIndicator color="#000" /> : <View style={styles.captureInner} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'black',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -10,
    right: 20,
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  closeText: {
    color: 'white',
    fontWeight: '700',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f9fafb',
  },
  error: {
    color: 'crimson',
    padding: 16,
    textAlign: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    color: 'crimson',
    textAlign: 'center',
    backgroundColor: 'rgba(15,23,42,0.7)',
    padding: 8,
    borderRadius: 8,
  },
});
