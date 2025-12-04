import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import Tts from 'react-native-tts';
import {Camera, useCameraDevices, useFrameProcessor, VisionCameraProxy} from 'react-native-vision-camera';
import {useRunOnJS} from 'react-native-worklets-core';
import type {Camera as CameraType, Frame} from 'react-native-vision-camera';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';
import {initTF} from './tfjs/modelLoader';
import RNFS from 'react-native-fs';
import {runAnalysisPipeline} from './analysisPipeline';

const plugin = VisionCameraProxy.initFrameProcessorPlugin('detectImageQuality', {});

export type AugmentedCameraProps = NativeStackScreenProps<
  RootStackParamList,
  'AugmentedCamera'
>;

export default function AugmentedCameraScreen({navigation}: AugmentedCameraProps) {
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'back') ?? devices[0] ?? null;
  const cameraRef = useRef<CameraType | null>(null);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>(
    'pending',
  );
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttsMuted, setTtsMuted] = useState(false);
  const [isTooDark, setIsTooDark] = useState(false);
  const [isTooBright, setIsTooBright] = useState(false);
  const [isBlurry, setIsBlurry] = useState(false);

  useEffect(() => {
    (async () => {
      let status = await Camera.getCameraPermissionStatus();
      const okStatuses = ['granted', 'authorized', 'limited'];

      if (!okStatuses.includes(status as string)) {
        status = await Camera.requestCameraPermission();
      }

      setPermission(okStatuses.includes(status as string) ? 'granted' : 'denied');
    })();
  }, []);

  // Basic TTS configuration
  useEffect(() => {
    Tts.setDefaultRate(0.5, true);
    Tts.setDefaultPitch(1.0);
    return () => {
      Tts.stop();
    };
  }, []);

  const updateQualityFlags = useRunOnJS((flags: {
    isTooDark: boolean;
    isTooBright: boolean;
    isBlurry: boolean;
  }) => {
    setIsTooDark(flags.isTooDark);
    setIsTooBright(flags.isTooBright);
    setIsBlurry(flags.isBlurry);
  }, [setIsTooDark, setIsTooBright, setIsBlurry]);

  const frameProcessor = useFrameProcessor((frame: Frame) => {
    'worklet';
    if (plugin == null) return;
    const result = plugin.call(frame) as {
      isTooDark: boolean;
      isTooBright: boolean;
      isBlurry: boolean;
    } | null;

    if (result) {
      updateQualityFlags(result);
    }
  }, [updateQualityFlags]);

  // Announce current issues whenever flags change (if not muted)
  useEffect(() => {
    if (ttsMuted) {
      return;
    }

    const messages: string[] = [];
    if (isTooDark) messages.push('The image looks too dark. Please use more light.');
    if (isTooBright) messages.push('The image looks too bright. Please reduce the light.');
    if (isBlurry) messages.push('The image looks blurry. Please hold the camera steady.');

    if (messages.length === 0) {
      return;
    }

    const text = messages.join(' ');
    Tts.stop();
    Tts.speak(text);
  }, [isTooDark, isTooBright, isBlurry, ttsMuted]);

  const readFileToBase64 = async (uri: string): Promise<string> => {
    const path = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
    console.log('[CAMERA] readFileToBase64 path:', path);
    const base64 = await RNFS.readFile(path, 'base64');
    console.log('[CAMERA] readFileToBase64 success, length:', base64?.length ?? 0);
    return base64;
  };

  const capture = async () => {
    if (!cameraRef.current || !device || permission !== 'granted') {
      console.log('[CAMERA] capture blocked: cameraRef, device, or permission not ready', {
        hasCamera: !!cameraRef.current,
        hasDevice: !!device,
        permission,
      });
      return;
    }
    setError(null);
    setTakingPhoto(true);
    try {
      console.log('[CAMERA] capture starting');
      const photo = await cameraRef.current.takePhoto({flash: 'off'});
      console.log('[CAMERA] takePhoto result:', photo);
      const uri = photo.path.startsWith('file://') ? photo.path : 'file://' + photo.path;
      console.log('[CAMERA] Photo saved to:', uri);

      console.log('[CAMERA] initTF() starting');
      await initTF();
      console.log('[CAMERA] initTF() done');

      const base64 = await readFileToBase64(uri);

      console.log('[CAMERA] runAnalysisPipeline call starting');
      await runAnalysisPipeline({
        navigation: navigation as any,
        imageUri: uri,
        base64,
      });
      console.log('[CAMERA] runAnalysisPipeline finished');
    } catch (e: any) {
      console.log('[CAMERA] capture error:', e);
      setError(String(e?.message || e));
    } finally {
      setTakingPhoto(false);
    }
  };

  if (permission === 'pending' || !device) {
    return (
      <View style={styles.loaderRoot}>
        <ActivityIndicator />
      </View>
    );
  }

  if (permission === 'denied') {
    return (
      <View style={styles.loaderRoot}>
        <Text style={styles.permissionError}>
          Camera permission is denied. Please enable it in Settings &gt; Apps &gt; VoetProj &gt; Permissions.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      {/* Live camera preview as background */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        ref={cameraRef}
        photo={true}
        torch={torchOn ? 'on' : 'off'}
        frameProcessor={frameProcessor}
      />

      {/* Top-left status icons for focus, brightness, framing (here: blur, dark, bright) */}
      <View style={styles.statusIconsContainer}>
        <View
          style={[styles.statusIcon, isBlurry ? styles.statusBad : styles.statusGood]}>
          <Text style={styles.iconText}>🌫️</Text>
        </View>
        <View
          style={[styles.statusIcon, isTooDark ? styles.statusBad : styles.statusGood]}>
          <Text style={styles.iconText}>🌑</Text>
        </View>
        <View
          style={[styles.statusIcon, isTooBright ? styles.statusBad : styles.statusGood]}>
          <Text style={styles.iconText}>☀️</Text>
        </View>
      </View>

      {/* Top guidance text */}
      <View style={styles.topMessageBar}>
        <Text style={styles.topMessageText}>
          Please keep the camera steady and make sure the image is not blurry.
        </Text>
      </View>

      {/* Top-right mute toggle for TTS */}
      <TouchableOpacity
        style={styles.muteButton}
        onPress={() => {
          setTtsMuted(prev => !prev);
          Tts.stop();
        }}
        activeOpacity={0.8}>
        <Text style={styles.muteButtonText}>{ttsMuted ? '🔈' : '🔊'}</Text>
      </TouchableOpacity>

      {/* Right side: flashlight toggle button */}
      <View pointerEvents="box-none" style={styles.flashWrapper}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setTorchOn(prev => !prev)}
          style={[styles.flashIcon, torchOn && styles.flashIconOn]}>
          <Text style={styles.flashText}>🔦</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom camera button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cameraButton}
          activeOpacity={0.85}
          onPress={capture}>
          {takingPhoto ? (
            <ActivityIndicator color="#000" />
          ) : (
            <View style={styles.cameraInner} />
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorOverlay}>{error}</Text> : null}
    </View>
  );
}

const FRAME_BORDER = '#111827';

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderRoot: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraFrame: {
    // no longer used as a solid frame; kept for reference
  },
  topMessageBar: {
    position: 'absolute',
    top: 24,
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  topMessageText: {
    color: '#e5e7eb',
    fontSize: 14,
    textAlign: 'center',
  },
  statusIconsContainer: {
    position: 'absolute',
    top: 80,
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
    textAlign: 'center',
  },
  statusGood: {
    backgroundColor: '#16a34a',
  },
  statusBad: {
    backgroundColor: '#dc2626',
  },
  muteButton: {
    position: 'absolute',
    top: 30,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15,23,42,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButtonText: {
    color: '#e5e7eb',
    fontSize: 18,
  },
  flashWrapper: {
    position: 'absolute',
    right: 24,
    // Position it somewhere reasonable on the right side
    top: '23%', 
    alignItems: 'center',
  },
  flashIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIconOn: {
    backgroundColor: '#eab308',
    borderColor: '#eab308',
  },
  flashText: {
    fontSize: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraButton: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraInner: {
    width: 34,
    height: 26,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#111827',
  },
  permissionError: {
    color: '#f97373',
    textAlign: 'center',
    fontSize: 14,
  },
  errorOverlay: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    color: '#f97373',
    textAlign: 'center',
    backgroundColor: 'rgba(15,23,42,0.8)',
    padding: 8,
    borderRadius: 8,
    fontSize: 13,
  },
});
