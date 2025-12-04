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

  const iqaWithLabels = iqaScores.map((s: number, i: number) => ({
    label: iqaLabels[i] ?? String(i),
    score: s,
  }));
  const iqaTop = [...iqaWithLabels]
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3);
  const bestIqa = iqaTop[0] || null;

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

  const isQualityGood =
    bestIqa &&
    (bestIqa.label.toLowerCase().includes('good') ||
      bestIqa.score >= 0.7);

  if (!isQualityGood) {
    const topLabel = (bestIqa?.label || '').toLowerCase();
    let title = 'Image quality issue';
    const steps: string[] = [];

    if (topLabel.includes('blur') || topLabel.includes('sharp')) {
      title = 'The picture looks a bit blurry.';
      steps.push(
        '• Hold the phone steady with both hands',
        '• Make sure the camera is in focus before taking the photo',
        '• Try to take the picture a little closer (but keep the whole foot visible)',
      );
    } else if (
      topLabel.includes('dark') ||
      topLabel.includes('bright') ||
      topLabel.includes('exposure')
    ) {
      title = 'The picture is too dark or too bright.';
      steps.push(
        '• Take the photo in a well-lit room or near a window',
        '• Avoid very strong light or deep shadows on the foot',
        '• Make sure the foot is clearly visible, not hidden in the dark',
      );
    } else if (
      topLabel.includes('noise') ||
      topLabel.includes('grain') ||
      topLabel.includes('artifact')
    ) {
      title = 'The picture has too much noise.';
      steps.push(
        '• Take the picture in better light so the camera does not struggle',
        '• Avoid zooming in too much',
        '• Try again from a normal distance with a steady hand',
      );
    } else {
      title = 'The picture is not clear enough to analyze.';
      steps.push(
        '• Hold the phone steady',
        '• Make sure the whole foot is in the picture',
        '• Take the photo in good light (no strong shadows)',
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

  const condTop = condScores
    .map((s: number, i: number) => ({
      label: conditionLabels[i] ?? String(i),
      score: s,
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3);

  navigation.navigate('ConditionResult', {
    imageUri,
    iqaTop,
    openCvMetrics: opencv,
    condTop,
  });
};
