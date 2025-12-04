import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ConditionResult'>;

export default function ConditionResultScreen({route, navigation}: Props) {
  const {
    imageUri,
    isGoodFootPicture,
    mainCondition,
    iqaTop,
    openCvMetrics,
    condTop,
  } = route.params as any;

  if (iqaTop) {
    console.log('[RESULT] IQA top (not shown to user):', iqaTop);
  }
  if (openCvMetrics) {
    console.log('[RESULT] OpenCV metrics (not shown to user):', openCvMetrics);
  }
  if (condTop) {
    console.log('[RESULT] Condition scores (not shown to user):', condTop);
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>Voet Check</Text>
      </View>

      <View style={styles.content}>
        {/* Header with success icon */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>✅ Photo Accepted</Text>
          <Text style={styles.headerSubtitle}>Your foot picture is good quality</Text>
        </View>

        {/* Photo preview */}
        {imageUri ? (
          <View style={styles.photoCard}>
            <Image source={{uri: imageUri}} style={styles.preview} />
            <View style={styles.photoOverlay}>
              <Text style={styles.photoOverlayText}>✓</Text>
            </View>
          </View>
        ) : null}

        {/* Condition result card */}
        {mainCondition && (
          <View style={styles.conditionCard}>
            <Text style={styles.conditionTitle}>🔍 Analysis Result</Text>
            <View style={styles.conditionRow}>
              <Text style={styles.conditionLabel}>Detected:</Text>
              <Text style={styles.conditionValue}>{mainCondition.label}</Text>
            </View>
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                ⚠️ This is an automatic estimate only. It is not a medical diagnosis. 
                Please consult a healthcare professional to confirm and discuss any treatment.
              </Text>
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Action button */}
        <TouchableOpacity
          style={styles.doneButton}
          activeOpacity={0.85}
          onPress={() => {
            console.log('Submit / log result');
            navigation.navigate('ImageInput');
          }}>
          <Text style={styles.doneButtonText}>✓  Submit</Text>
        </TouchableOpacity>

        {/* Secondary link */}
        <TouchableOpacity
          style={styles.retakeLink}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ImageInput')}>
          <Text style={styles.retakeLinkText}>📷 Take another photo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  navbar: {
    height: 52,
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.2)',
  },
  navbarTitle: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 18,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4ade80',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
  },
  photoCard: {
    height: 360,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#22c55e',
    marginBottom: 14,
  },
  preview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  conditionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  conditionLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginRight: 8,
  },
  conditionValue: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimerBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  disclaimerText: {
    color: '#fcd34d',
    fontSize: 12,
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
  doneButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  retakeLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  retakeLinkText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});