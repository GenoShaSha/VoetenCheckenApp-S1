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

// Tooltip auto-dismiss duration (1.5 seconds as per guidelines)
const TOOLTIP_DURATION = 1500;

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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Clear tooltip timeout on unmount
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Show tooltip with auto-dismiss (only 1 at a time, 1.5s duration)
  const showTooltip = (message: string) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setActiveTooltip(message);
    tooltipTimeoutRef.current = setTimeout(() => {
      setActiveTooltip(null);
    }, TOOLTIP_DURATION);
  };

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
  // Show only 1 tooltip at a time with priority: blur > dark > bright
  useEffect(() => {
    // Determine which tooltip to show (priority order)
    let tooltipMessage: string | null = null;
    if (isBlurry) {
      tooltipMessage = 'Image is blurry - hold steady';
    } else if (isTooDark) {
      tooltipMessage = 'Too dark - add more light';
    } else if (isTooBright) {
      tooltipMessage = 'Too bright - reduce light';
    }

    if (tooltipMessage) {
      showTooltip(tooltipMessage);
    }

    // TTS announcement
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

      {/* Top-left status icons (48x48 touch targets, 24x24 icons, 8dp spacing) */}
      <View style={styles.statusIconsContainer}>
        <TouchableOpacity
          style={[styles.statusIcon, isBlurry ? styles.statusBad : styles.statusGood]}
          activeOpacity={0.8}
          accessibilityLabel={isBlurry ? 'Image is blurry' : 'Image is sharp'}>
          <Text style={styles.iconText}>🌫️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusIcon, isTooDark ? styles.statusBad : styles.statusGood]}
          activeOpacity={0.8}
          accessibilityLabel={isTooDark ? 'Image is too dark' : 'Lighting is good'}>
          <Text style={styles.iconText}>🌑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusIcon, isTooBright ? styles.statusBad : styles.statusGood]}
          activeOpacity={0.8}
          accessibilityLabel={isTooBright ? 'Image is too bright' : 'Brightness is good'}>
          <Text style={styles.iconText}>☀️</Text>
        </TouchableOpacity>
      </View>

      {/* Tooltip - only 1 shown at a time, auto-dismiss after 1.5s */}
      {activeTooltip && (
        <View style={styles.tooltipContainer}>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipIcon}>⚠️</Text>
            <Text style={styles.tooltipText}>{activeTooltip}</Text>
          </View>
        </View>
      )}

      {/* Top guidance text (16dp font minimum) */}
      <View style={styles.topMessageBar}>
        <Text style={styles.topMessageText}>
          Keep the camera steady and ensure good lighting.
        </Text>
      </View>

      {/* Top-right mute toggle for TTS (48x48 touch target) */}
      <TouchableOpacity
        style={styles.muteButton}
        onPress={() => {
          setTtsMuted(prev => !prev);
          Tts.stop();
        }}
        activeOpacity={0.8}
        accessibilityLabel={ttsMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}>
        <Text style={styles.muteButtonText}>{ttsMuted ? '🔈' : '🔊'}</Text>
      </TouchableOpacity>

      {/* Right side: flashlight toggle button (48x48 touch target) */}
      <View pointerEvents="box-none" style={styles.flashWrapper}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setTorchOn(prev => !prev)}
          style={[styles.flashIcon, torchOn && styles.flashIconOn]}
          accessibilityLabel={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}>
          <Text style={styles.flashText}>🔦</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom camera button (larger for primary action) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cameraButton}
          activeOpacity={0.85}
          onPress={capture}
          accessibilityLabel="Take photo">
          {takingPhoto ? (
            <ActivityIndicator color="#1e293b" size="large" />
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

// Color palette (max 3 colors as per guidelines):
// Primary: #1e293b (dark slate) - backgrounds
// Secondary: #ffffff (white) - text, icons
// Accent: #22c55e (green) for good, #dc2626 (red) for bad

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderRoot: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Top message bar - 16dp font minimum
  topMessageBar: {
    position: 'absolute',
    top: 24,
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.9)', // #1e293b with opacity
  },
  topMessageText: {
    color: '#ffffff',
    fontSize: 16, // Minimum 16dp as per guidelines
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  // Status icons container - 8dp spacing between icons
  statusIconsContainer: {
    position: 'absolute',
    top: 90,
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    gap: 8, // 8dp spacing between icons
  },
  // Status icon - 48x48 touch target with 24x24 icon inside
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24, // 24dp icon size
    textAlign: 'center',
  },
  // Good status - green with 4.5:1 contrast
  statusGood: {
    backgroundColor: '#22c55e', // Green - contrast 4.5:1 against dark
  },
  // Bad status - red with 4.5:1 contrast
  statusBad: {
    backgroundColor: '#dc2626', // Red - contrast 4.5:1 against dark
  },
  // Tooltip - 4dp spacing for icon, auto-dismiss after 1.5s
  tooltipContainer: {
    position: 'absolute',
    top: 90,
    left: 80,
    right: 80,
    alignItems: 'center',
  },
  tooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fbbf24', // Amber border for warning
  },
  tooltipIcon: {
    fontSize: 18,
    marginRight: 8, // 4dp+ spacing between icon and text (using 8 for better readability)
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 16, // Minimum 16dp
    fontWeight: '500',
  },
  // Mute button - 48x48 touch target
  muteButton: {
    position: 'absolute',
    top: 30,
    right: 16,
    width: 48, // 48dp touch target
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButtonText: {
    fontSize: 24, // 24dp icon
  },
  // Flash button wrapper
  flashWrapper: {
    position: 'absolute',
    right: 16,
    top: '25%',
    alignItems: 'center',
  },
  // Flash icon - 48x48 touch target
  flashIcon: {
    width: 48, // 48dp touch target
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIconOn: {
    backgroundColor: '#fbbf24', // Amber when on
    borderColor: '#fbbf24',
  },
  flashText: {
    fontSize: 24, // 24dp icon
  },
  // Bottom bar with camera button
  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // Camera button - larger primary action (72x72 for prominence)
  cameraButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for visibility against any background
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cameraInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#1e293b',
    backgroundColor: '#ffffff',
  },
  // Permission error - 16dp font
  permissionError: {
    color: '#fca5a5', // Light red for contrast on dark
    textAlign: 'center',
    fontSize: 16, // Minimum 16dp
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  // Error overlay - 16dp font
  errorOverlay: {
    position: 'absolute',
    top: 160,
    left: 20,
    right: 20,
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.9)', // Red background
    padding: 12,
    borderRadius: 10,
    fontSize: 16, // Minimum 16dp
    fontWeight: '500',
  },
});
