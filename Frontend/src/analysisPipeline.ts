import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';

const conditionLabels = require('../my_tfjs_models/condition_labels.json');
const iqaLabels = require('../my_tfjs_models/iqa_labels.json');

export type AnalysisNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'ImageInput' | 'AugmentedCamera'
>;

export type AnalysisInput = {
  navigation: AnalysisNavigation;
  imageUri?: string;
  base64: string;
};

export const runAnalysisPipeline = async ({
  navigation,
  imageUri,
  base64,
}: AnalysisInput) => {
  const backendUrl = 'http://localhost:3000/predict';
  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({imageBase64: base64}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend error ${response.status}: ${text}`);
  }

  const json = await response.json();
  const condScores = json.conditionScores || [];
  const iqaScores = json.iqaScores || [];
  const opencv = json.opencvMetrics || null;

  console.log('[ANALYSIS] Raw OpenCV metrics:', opencv);

  // Build labeled IQA predictions and sort by confidence
  const iqaWithLabels = iqaScores.map((s: number, i: number) => ({
    label: iqaLabels[i] ?? String(i),
    score: s,
  }));
  const iqaSorted = [...iqaWithLabels].sort((a: any, b: any) => b.score - a.score);
  const iqaTop = iqaSorted.slice(0, 3);
  const bestIqa = iqaTop[0] || null;

  // Log all IQA predictions with labels and scores
  console.log('[ANALYSIS] === IQA Predictions (sorted by confidence) ===');
  iqaSorted.forEach((item, idx) => {
    const marker = idx === 0 ? '★ TOP' : `  #${idx + 1}`;
    console.log(`[ANALYSIS] ${marker}: "${item.label}" → ${(item.score * 100).toFixed(1)}%`);
  });

  // Build labeled condition predictions and sort by confidence
  const condWithLabels = condScores.map((s: number, i: number) => ({
    label: conditionLabels[i] ?? String(i),
    score: s,
  }));
  const condSorted = [...condWithLabels].sort((a: any, b: any) => b.score - a.score);

  console.log('[ANALYSIS] === Condition Predictions (sorted by confidence) ===');
  condSorted.forEach((item, idx) => {
    const marker = idx === 0 ? '★ TOP' : `  #${idx + 1}`;
    console.log(`[ANALYSIS] ${marker}: "${item.label}" → ${(item.score * 100).toFixed(1)}%`);
  });

  if (bestIqa) {
    const topLabelRaw = bestIqa.label || '';
    const topLabelLower = topLabelRaw.toLowerCase();
    const isNotFoot = topLabelLower === 'not a foot';

    if (isNotFoot) {
      const title = 'This picture does not look like a foot.';
      const steps: string[] = [
        '• Please take a clear photo of a single foot',
        '• Make sure the whole foot is visible in the picture',
        '• Let the foot fill most of the screen (not too far away)',
      ];

      const message =
        title +
        '\n\n' +
        'Please try again:\n' +
        steps.join('\n');

      navigation.navigate('QualityReview', {
        imageUri,
        errorMessage: message,
        iqaTop,
        openCvMetrics: opencv,
      });
      return;
    }
  }

  // Only accept as "good foot picture" when the top IQA label itself
  // clearly indicates a good foot image. Any other top label
  // (blurry, dark, noisy, not-a-foot variants, etc.) should be treated
  // as not good and routed to the quality screen.
  const topLabelForCheck = (bestIqa?.label || '').toLowerCase();
  const isQualityGood = topLabelForCheck.includes('good');
  console.log('[ANALYSIS] Top IQA label:', bestIqa?.label, '| isQualityGood:', isQualityGood);

  if (!isQualityGood) {
    const topLabel = (bestIqa?.label || '').toLowerCase();
    let title = 'Image quality issue';
    const steps: string[] = [];

    if (topLabel.includes('bad angle') || topLabel.includes('not fully visible')) {
      title = 'The foot is not fully visible or at a bad angle.';
      steps.push(
        '• Position the camera directly above or in front of the foot',
        '• Make sure the entire foot is visible in the frame',
        '• Avoid cutting off toes or the heel',
        '• Try to keep the foot flat and facing the camera',
      );
    } else if (topLabel.includes('blurry') || topLabel.includes('blur') || topLabel.includes('focus')) {
      title = 'The picture is blurry or out of focus.';
      steps.push(
        '• Hold the phone steady with both hands',
        '• Wait for the camera to focus before taking the photo',
        '• Avoid moving the phone while capturing',
        '• Try taking the photo in better lighting conditions',
      );
    } else if (topLabel.includes('not a foot')) {
      title = 'This picture does not appear to be a foot.';
      steps.push(
        '• Please take a clear photo of a single foot',
        '• Make sure the whole foot is visible in the picture',
        '• Let the foot fill most of the screen',
        '• Remove any objects blocking the view of the foot',
      );
    } else if (topLabel.includes('dark') || topLabel.includes('underexposed')) {
      title = 'The picture is too dark.';
      steps.push(
        '• Move to a well-lit area or near a window',
        '• Turn on more lights in the room',
        '• Avoid shadows falling on the foot',
        '• Consider using the camera flash if available',
      );
    } else if (topLabel.includes('too far') || topLabel.includes('too small')) {
      title = 'The foot is too far away or too small in the frame.';
      steps.push(
        '• Move the camera closer to the foot',
        '• The foot should fill most of the screen',
        '• Keep approximately 20-30 cm distance from the foot',
        '• Make sure the foot is still fully visible when closer',
      );
    } else {
      title = 'The picture quality is not good enough to analyze.';
      steps.push(
        '• Hold the phone steady',
        '• Make sure the whole foot is in the picture',
        '• Take the photo in good lighting (no strong shadows)',
        '• Position the camera at a good angle',
      );
    }

    const message =
      title +
      '\n\n' +
      'Please try again:\n' +
      steps.join('\n');

    navigation.navigate('QualityReview', {
      imageUri,
      errorMessage: message,
      iqaTop,
      openCvMetrics: opencv,
    });
    return;
  }

  let opencvOk = true;
  if (opencv) {
    const {
      Sharpness_Laplacian,
      Contrast_STD,
      Brightness,
      NoiseVariance,
      Blockiness,
    } = opencv;

    if (Sharpness_Laplacian != null && Sharpness_Laplacian < 60)
      opencvOk = false;
    if (Contrast_STD != null && (Contrast_STD < 10 || Contrast_STD > 80))
      opencvOk = false;
    if (Brightness != null && (Brightness < 40 || Brightness > 220))
      opencvOk = false;
    if (NoiseVariance != null && NoiseVariance > 40000)
      opencvOk = false;
    if (Blockiness != null && Blockiness > 600) opencvOk = false;
  }

  if (!opencvOk) {
    const message =
      'The photo quality is not ideal for analysis.\n\n' +
      'Please make sure:\n' +
      '• The picture is sharp (not blurry)\n' +
      '• The foot is bright enough and not too dark\n' +
      '• There are no blocks or stripes in the image';

    navigation.navigate('QualityReview', {
      imageUri,
      errorMessage: message,
      iqaTop,
      openCvMetrics: opencv,
    });
    return;
  }

  const condTop = condSorted.slice(0, 3);

  const mainCondition = condTop[0] || null;
  const isGoodFootPicture = true; // If we got here, all gates passed

  navigation.navigate('ConditionResult', {
    imageUri,
    isGoodFootPicture,
    mainCondition,
    iqaTop,
    openCvMetrics: opencv,
    condTop,
  });
};
