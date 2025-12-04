import React from 'react';
import {View, Text, Image, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'ConditionResult'>;

export default function ConditionResultScreen({route, navigation}: Props) {
  const {imageUri, iqaTop, openCvMetrics, condTop} = route.params;

  return (
    <View style={styles.root}>
      <View style={styles.navbar}>
        <Text style={styles.navbarTitle}>Voet Check</Text>
      </View>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.headerTitle}>Foot condition result</Text>

          {imageUri ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Photo used</Text>
              <Image source={{uri: imageUri}} style={styles.preview} />
            </View>
          ) : null}

          {Array.isArray(iqaTop) ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Image quality (IQA)</Text>
              {iqaTop.map((item, idx) => (
                <View key={idx} style={styles.row}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.value}>
                    {(item.score * 100).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {openCvMetrics ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>OpenCV metrics</Text>
              <Text style={styles.label}>
                Sharpness: {openCvMetrics.Sharpness_Laplacian?.toFixed(2) ?? '—'}
              </Text>
              <Text style={styles.label}>
                Contrast: {openCvMetrics.Contrast_STD?.toFixed(2) ?? '—'}
              </Text>
              <Text style={styles.label}>
                Brightness: {openCvMetrics.Brightness?.toFixed(2) ?? '—'}
              </Text>
              <Text style={styles.label}>
                Noise: {openCvMetrics.NoiseVariance?.toFixed(2) ?? '—'}
              </Text>
              <Text style={styles.label}>
                Blockiness: {openCvMetrics.Blockiness?.toFixed(2) ?? '—'}
              </Text>
            </View>
          ) : null}

          {Array.isArray(condTop) ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Condition</Text>
              {condTop.map((item, idx) => (
                <View key={idx} style={styles.row}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.value}>
                    {(item.score * 100).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              // here you can later call a /log endpoint if you want
              console.log('Submit / log result');
              navigation.navigate('ImageInput');
            }}>
            <Text style={styles.primaryButtonText}>Submit / Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#020617'},
  navbar: {
    height: 56,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  navbarTitle: {color: '#e5e7eb', fontSize: 18, fontWeight: '700'},
  container: {flex: 1, backgroundColor: '#020617'},
  content: {padding: 20, paddingBottom: 40},
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 12,
  },
  card: {
    marginTop: 12,
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
    marginBottom: 8,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {color: '#9ca3af', fontSize: 13},
  value: {color: '#e5e7eb', fontWeight: '600', fontSize: 13},
  primaryButton: {
    marginTop: 20,
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  primaryButtonText: {color: '#f9fafb', fontWeight: '600', fontSize: 15},
});