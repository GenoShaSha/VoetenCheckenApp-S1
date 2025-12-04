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
import {savePrediction} from './historyStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityReview'>;

export default function QualityReviewScreen({route, navigation}: Props) {
  const {imageUri, errorMessage, iqaTop, openCvMetrics} = route.params;

  // Log metrics for debugging, but don't display to user
  if (iqaTop) {
    console.log('[QUALITY] IQA scores (not shown):', iqaTop);
  }
  if (openCvMetrics) {
    console.log('[QUALITY] OpenCV metrics (not shown):', openCvMetrics);
  }

  // Parse the error message to extract title and tips
  const parts = (errorMessage || '').split('\n\nPlease try again:\n');
  const title = parts[0] || 'Photo quality issue';
  const tipsRaw = parts[1] || '';
  const tips = tipsRaw
    .split('\n')
    .map(t => t.replace(/^•\s*/, '').trim())
    .filter(t => t.length > 0);

  const handleTakeNewPhoto = async () => {
    // Save the failed attempt to history
    await savePrediction({
      imageUri,
      isGoodQuality: false,
      rejectionReason: title,
      iqaLabel: iqaTop?.[0]?.label,
    });
    navigation.navigate('ImageInput');
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>Voet Check</Text>
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>⚠️ Photo Not Accepted</Text>
          <Text style={styles.headerSubtitle}>{title}</Text>
        </View>

        {/* Photo preview */}
        {imageUri ? (
          <View style={styles.photoCard}>
            <Image source={{uri: imageUri}} style={styles.preview} />
            <View style={styles.photoOverlay}>
              <Text style={styles.photoOverlayText}>✕</Text>
            </View>
          </View>
        ) : null}

        {/* Tips card */}
        {tips.length > 0 && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 How to improve</Text>
            {tips.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <View style={styles.tipBullet}>
                  <Text style={styles.tipBulletText}>{idx + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Spacer to push buttons down */}
        <View style={styles.spacer} />

        {/* Action button */}
        <TouchableOpacity
          style={styles.retryButton}
          activeOpacity={0.85}
          onPress={handleTakeNewPhoto}>
          <Text style={styles.retryButtonText}>📷  Take a New Photo</Text>
        </TouchableOpacity>

        {/* Secondary link */}
        <TouchableOpacity
          style={styles.backLink}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>← Go back</Text>
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
    color: '#f1f5f9',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#f87171',
    textAlign: 'center',
    fontWeight: '500',
  },
  photoCard: {
    height: 360,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#ef4444',
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
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tipsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  tipBulletText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  tipText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backLinkText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});