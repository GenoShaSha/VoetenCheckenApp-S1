import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@prediction_history';
const MAX_HISTORY_ITEMS = 20;

export type PredictionHistoryItem = {
  id: string;
  timestamp: number;
  imageUri?: string;
  isGoodQuality: boolean;
  condition?: string;
  iqaLabel?: string;
  rejectionReason?: string;
};

/**
 * Load all prediction history items
 */
export const loadHistory = async (): Promise<PredictionHistoryItem[]> => {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    if (!json) return [];
    const items = JSON.parse(json) as PredictionHistoryItem[];
    // Sort by timestamp descending (newest first)
    return items.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error('[History] Failed to load history:', e);
    return [];
  }
};

/**
 * Save a new prediction to history
 */
export const savePrediction = async (
  item: Omit<PredictionHistoryItem, 'id' | 'timestamp'>,
): Promise<void> => {
  try {
    const history = await loadHistory();
    
    const newItem: PredictionHistoryItem = {
      ...item,
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Add new item at the beginning
    history.unshift(newItem);

    // Keep only the last MAX_HISTORY_ITEMS
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    console.log('[History] Saved prediction:', newItem.id);
  } catch (e) {
    console.error('[History] Failed to save prediction:', e);
  }
};

/**
 * Clear all prediction history
 */
export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    console.log('[History] Cleared all history');
  } catch (e) {
    console.error('[History] Failed to clear history:', e);
  }
};

/**
 * Format timestamp to readable date string
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
