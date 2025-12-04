import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';

const {width} = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Instructions'>;

interface InstructionPage {
  id: string;
  title: string;
  content: React.ReactNode;
}

const ErrorIconsPage = () => (
  <View style={styles.pageContent}>
    <Text style={styles.pageDescription}>
      Error icons indicate whether a requirement is fulfilled or not.
    </Text>

    <View style={styles.iconExampleBox}>
      <View style={styles.iconColumn}>
        {/* Blur icon - red example */}
        <View style={[styles.iconCircle, styles.iconRed]}>
          <Text style={styles.iconText}>🌫️</Text>
        </View>
        {/* Dark icon - red example */}
        <View style={[styles.iconCircle, styles.iconRed]}>
          <Text style={styles.iconText}>🌑</Text>
        </View>
        {/* Brightness icon - green example */}
        <View style={[styles.iconCircle, styles.iconGreen]}>
          <Text style={styles.iconText}>☀️</Text>
        </View>
      </View>
      <View style={styles.iconLegend}>
        <Text style={styles.legendText}>🔴 Red: Requirement not fulfilled</Text>
        <Text style={styles.legendText}>🟢 Green: Requirement fulfilled</Text>
      </View>
    </View>

    <Text style={styles.sectionTitle}>These requirements are:</Text>

    <View style={styles.requirementRow}>
      <View style={styles.requirementIcon}>
        <Text style={styles.reqIconText}>🌫️</Text>
      </View>
      <View style={styles.requirementTextContainer}>
        <Text style={styles.requirementLabel}>Focus / Blur</Text>
        <Text style={styles.requirementDesc}>Determines if the image is sharp and not blurry</Text>
      </View>
    </View>

    <View style={styles.requirementRow}>
      <View style={styles.requirementIcon}>
        <Text style={styles.reqIconText}>🌑</Text>
      </View>
      <View style={styles.requirementTextContainer}>
        <Text style={styles.requirementLabel}>Darkness</Text>
        <Text style={styles.requirementDesc}>Checks if the image is too dark</Text>
      </View>
    </View>

    <View style={styles.requirementRow}>
      <View style={styles.requirementIcon}>
        <Text style={styles.reqIconText}>☀️</Text>
      </View>
      <View style={styles.requirementTextContainer}>
        <Text style={styles.requirementLabel}>Brightness</Text>
        <Text style={styles.requirementDesc}>Checks if the image is too bright</Text>
      </View>
    </View>
  </View>
);

const HowToTakePicturePage = () => (
  <View style={styles.pageContent}>
    <Text style={styles.pageDescription}>
      Follow these tips to take a good foot picture for accurate analysis.
    </Text>

    <View style={styles.tipCard}>
      <View style={styles.tipNumber}>
        <Text style={styles.tipNumberText}>1</Text>
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>Good Lighting</Text>
        <Text style={styles.tipDesc}>
          Make sure the foot is well-lit. Avoid dark rooms or harsh shadows.
        </Text>
      </View>
    </View>

    <View style={styles.tipCard}>
      <View style={styles.tipNumber}>
        <Text style={styles.tipNumberText}>2</Text>
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>Clear Focus</Text>
        <Text style={styles.tipDesc}>
          Hold the camera steady and tap to focus on the foot before taking the photo.
        </Text>
      </View>
    </View>

    <View style={styles.tipCard}>
      <View style={styles.tipNumber}>
        <Text style={styles.tipNumberText}>3</Text>
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>Proper Distance</Text>
        <Text style={styles.tipDesc}>
          Keep the camera about 30-40cm away. The entire foot should be visible.
        </Text>
      </View>
    </View>

    <View style={styles.tipCard}>
      <View style={styles.tipNumber}>
        <Text style={styles.tipNumberText}>4</Text>
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>Clean Background</Text>
        <Text style={styles.tipDesc}>
          Use a plain, contrasting background for best results.
        </Text>
      </View>
    </View>
  </View>
);

const WelcomePage = () => (
  <View style={styles.pageContent}>
    <View style={styles.welcomeIconContainer}>
      <Text style={styles.welcomeIcon}>👣</Text>
    </View>
    
    <Text style={styles.welcomeTitle}>Welcome to Voet Check</Text>
    
    <Text style={styles.welcomeDesc}>
      This app helps you analyze foot pictures for quality and potential conditions.
    </Text>

    <View style={styles.featureList}>
      <View style={styles.featureItem}>
        <Text style={styles.featureIcon}>📷</Text>
        <Text style={styles.featureText}>Take or select a foot picture</Text>
      </View>
      <View style={styles.featureItem}>
        <Text style={styles.featureIcon}>🔍</Text>
        <Text style={styles.featureText}>Automatic quality check</Text>
      </View>
      <View style={styles.featureItem}>
        <Text style={styles.featureIcon}>🩺</Text>
        <Text style={styles.featureText}>Condition analysis</Text>
      </View>
    </View>

    <Text style={styles.disclaimerNote}>
      ⚠️ This app provides estimates only and is not a substitute for professional medical advice.
    </Text>
  </View>
);

const MethodsPage = () => (
  <View style={styles.pageContent}>
    <Text style={styles.pageDescription}>
      There are two ways to check your foot. Choose the method that works best for you.
    </Text>

    {/* Method 1: Gallery */}
    <View style={styles.methodCard}>
      <View style={styles.methodHeader}>
        <View style={styles.methodIconCircle}>
          <Text style={styles.methodIcon}>🖼️</Text>
        </View>
        <Text style={styles.methodTitle}>Upload from Gallery</Text>
      </View>
      <Text style={styles.methodDesc}>
        Select an existing foot picture from your photo gallery. This is quick and easy if you already have a good quality photo.
      </Text>
      <View style={styles.methodNote}>
        <Text style={styles.methodNoteText}>
          💡 Make sure the photo is clear, well-lit, and shows the entire foot.
        </Text>
      </View>
    </View>

    {/* Method 2: Augmented Camera */}
    <View style={[styles.methodCard, styles.methodCardHighlight]}>
      <View style={styles.methodHeader}>
        <View style={[styles.methodIconCircle, styles.methodIconCircleHighlight]}>
          <Text style={styles.methodIcon}>📸</Text>
        </View>
        <View style={styles.methodTitleContainer}>
          <Text style={styles.methodTitle}>Augmented Camera</Text>
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Recommended</Text>
          </View>
        </View>
      </View>
      <Text style={styles.methodDesc}>
        Use our smart camera with real-time guidance. It helps you take the perfect foot picture with helpful features:
      </Text>
      <View style={styles.cameraFeaturesList}>
        <Text style={styles.cameraFeature}>✓ Real-time quality indicators</Text>
        <Text style={styles.cameraFeature}>✓ Voice guidance (text-to-speech)</Text>
        <Text style={styles.cameraFeature}>✓ Built-in flashlight</Text>
        <Text style={styles.cameraFeature}>✓ Blur, darkness & brightness detection</Text>
      </View>
    </View>
  </View>
);

const VoiceGuidancePage = () => (
  <View style={styles.pageContent}>
    <View style={styles.featureIconLarge}>
      <Text style={styles.featureIconLargeText}>🔊</Text>
    </View>

    <Text style={styles.pageDescription}>
      The camera includes automatic voice guidance to help you take a better picture.
    </Text>

    <View style={styles.featureExplainCard}>
      <Text style={styles.featureExplainTitle}>How it works</Text>
      <Text style={styles.featureExplainDesc}>
        When the camera detects an issue with your picture (too dark, too bright, or blurry), 
        it will automatically speak out loud to tell you exactly what the problem is and how to fix it.
      </Text>
    </View>

    <View style={styles.voiceExampleBox}>
      <Text style={styles.voiceExampleLabel}>Example:</Text>
      <View style={styles.voiceExampleBubble}>
        <Text style={styles.voiceExampleText}>
          "The image looks too dark. Please use more light."
        </Text>
      </View>
    </View>

    <View style={styles.muteInfoCard}>
      <View style={styles.muteIconRow}>
        <View style={styles.muteIconExample}>
          <Text style={styles.muteIconText}>🔊</Text>
        </View>
        <Text style={styles.muteIconArrow}>→</Text>
        <View style={styles.muteIconExample}>
          <Text style={styles.muteIconText}>🔈</Text>
        </View>
      </View>
      <Text style={styles.muteInfoText}>
        If you don't find this feature useful, you can turn off the voice by tapping the sound icon in the top-right corner of the camera screen.
      </Text>
    </View>
  </View>
);

const FlashlightPage = () => (
  <View style={styles.pageContent}>
    <View style={styles.featureIconLarge}>
      <Text style={styles.featureIconLargeText}>🔦</Text>
    </View>

    <Text style={styles.pageDescription}>
      Use the built-in flashlight when taking pictures in dark environments.
    </Text>

    <View style={styles.featureExplainCard}>
      <Text style={styles.featureExplainTitle}>When to use it</Text>
      <Text style={styles.featureExplainDesc}>
        If the space where you are taking the picture is too dark, you can turn on the flashlight 
        to illuminate your foot and get a clearer, brighter image.
      </Text>
    </View>

    <View style={styles.flashlightDemoBox}>
      <View style={styles.flashlightButton}>
        <Text style={styles.flashlightButtonIcon}>🔦</Text>
      </View>
      <Text style={styles.flashlightDemoText}>
        Tap this button on the right side of the camera screen to toggle the flashlight on or off.
      </Text>
    </View>

    <View style={styles.flashlightTip}>
      <Text style={styles.flashlightTipText}>
        🌑/☀️ The guidance icons for lighting will turn green when lighting conditions are good!
      </Text>
    </View>
  </View>
);

const pages: InstructionPage[] = [
  {
    id: '1',
    title: 'Welcome',
    content: <WelcomePage />,
  },
  {
    id: '2',
    title: 'How to Check Your Foot',
    content: <MethodsPage />,
  },
  {
    id: '3',
    title: 'Guidance Icons',
    content: <ErrorIconsPage />,
  },
  {
    id: '4',
    title: 'Voice Guidance',
    content: <VoiceGuidancePage />,
  },
  {
    id: '5',
    title: 'Flashlight',
    content: <FlashlightPage />,
  },
  {
    id: '6',
    title: 'Taking a Good Picture',
    content: <HowToTakePicturePage />,
  },
];

export default function InstructionsScreen({navigation}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < pages.length - 1) {
      flatListRef.current?.scrollToIndex({index: currentIndex + 1});
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last page - go to home
      navigation.replace('ImageInput');
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({index: currentIndex - 1});
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    navigation.replace('ImageInput');
  };

  const onViewableItemsChanged = useRef(({viewableItems}: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderPage = ({item}: {item: InstructionPage}) => (
    <View style={styles.page}>
      <Text style={styles.pageTitle}>{item.title}</Text>
      {item.content}
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* Header with back arrow */}
      <View style={styles.header}>
        {currentIndex > 0 ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Pages */}
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={renderPage}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: false},
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
      />

      {/* Page indicators */}
      <View style={styles.pagination}>
        {pages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Next button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}>
          <Text style={styles.nextButtonText}>
            {currentIndex === pages.length - 1 ? 'Get Started' : 'Next Step'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  backArrow: {
    fontSize: 28,
    color: '#1f2937',
    fontWeight: '300',
  },
  backPlaceholder: {
    width: 44,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  page: {
    width: width,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  pageContent: {
    flex: 1,
  },
  pageDescription: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 20,
  },
  // Error Icons Page styles
  iconExampleBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconColumn: {
    marginRight: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  iconRed: {
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  iconGreen: {
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  iconText: {
    fontSize: 18,
  },
  iconLegend: {
    flex: 1,
  },
  legendText: {
    fontSize: 14,
    color: '#374151',
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
  },
  requirementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  reqIconText: {
    fontSize: 20,
  },
  requirementTextContainer: {
    flex: 1,
  },
  requirementLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  requirementDesc: {
    fontSize: 13,
    color: '#6b7280',
  },
  // Tips page styles
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  tipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tipNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  // Welcome page styles
  welcomeIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeIcon: {
    fontSize: 64,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeDesc: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featureList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  featureText: {
    fontSize: 15,
    color: '#1e40af',
    fontWeight: '500',
  },
  disclaimerNote: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
    textAlign: 'center',
  },
  // Methods page styles
  methodCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  methodCardHighlight: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  methodIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIconCircleHighlight: {
    backgroundColor: '#dbeafe',
  },
  methodIcon: {
    fontSize: 22,
  },
  methodTitleContainer: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  recommendedBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  methodDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 19,
    marginBottom: 10,
  },
  methodNote: {
    backgroundColor: '#fef9c3',
    padding: 10,
    borderRadius: 8,
  },
  methodNoteText: {
    fontSize: 12,
    color: '#854d0e',
    lineHeight: 17,
  },
  cameraFeaturesList: {
    marginTop: 4,
  },
  cameraFeature: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
    marginVertical: 3,
  },
  // Voice Guidance & Flashlight page styles
  featureIconLarge: {
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIconLargeText: {
    fontSize: 64,
  },
  featureExplainCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  featureExplainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  featureExplainDesc: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
  },
  voiceExampleBox: {
    marginBottom: 16,
  },
  voiceExampleLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  voiceExampleBubble: {
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
  },
  voiceExampleText: {
    fontSize: 14,
    color: '#1f2937',
    fontStyle: 'italic',
  },
  muteInfoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  muteIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  muteIconExample: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteIconText: {
    fontSize: 22,
  },
  muteIconArrow: {
    fontSize: 20,
    color: '#6b7280',
    marginHorizontal: 12,
  },
  muteInfoText: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 19,
  },
  flashlightDemoBox: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  flashlightButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  flashlightButtonIcon: {
    fontSize: 24,
  },
  flashlightDemoText: {
    flex: 1,
    fontSize: 13,
    color: '#e5e7eb',
    lineHeight: 19,
  },
  flashlightTip: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    padding: 14,
  },
  flashlightTipText: {
    fontSize: 13,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 19,
  },
  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#2563eb',
    width: 24,
  },
  dotInactive: {
    backgroundColor: '#d1d5db',
  },
  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  nextButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
