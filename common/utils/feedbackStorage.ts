// utils/feedbackStorage.ts
import AsyncStorage from '@/common/utils/compatibleStorage';

export interface Feedback {
  id: string;
  username: string;
  userId: string;
  category: FeedbackCategory;
  rating: number;
  title: string;
  message: string;
  contact: string;
  attachments: string[];
  status: 'pending' | 'reviewed' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  adminReply?: string;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

export type FeedbackCategory =
  | 'product-quality'
  | 'service-experience'
  | 'app-bug'
  | 'feature-request'
  | 'billing-payment'
  | 'delivery-shipping'
  | 'general-feedback';

const FEEDBACK_KEY = '@flow_nest_feedbacks';
const USERNAME_KEY = '@flow_nest_username';
const USER_ID_KEY = '@flow_nest_user_id';

// Generate unique ID
const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `FB-${timestamp}-${random}`.toUpperCase();
};

// Get or Create Username
export const getOrCreateUsername = async (): Promise<string> => {
  try {
    let username = await AsyncStorage.getItem(USERNAME_KEY);
    if (!username) {
      const adjectives = ['Happy', 'Smart', 'Quick', 'Bright', 'Cool', 'Swift'];
      const nouns = ['User', 'Client', 'Partner', 'Member', 'Visitor'];
      const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNum = Math.floor(Math.random() * 9999);
      username = `${randomAdj}${randomNoun}${randomNum}`;
      await AsyncStorage.setItem(USERNAME_KEY, username);
    }
    return username;
  } catch (error) {
    return `Guest${Math.floor(Math.random() * 9999)}`;
  }
};

// Set custom username (from your side)
export const setCustomUsername = async (username: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(USERNAME_KEY, username);
  } catch (error) {
    console.error('Error setting username:', error);
  }
};

// Get or Create User ID
export const getOrCreateUserId = async (): Promise<string> => {
  try {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase();
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch (error) {
    return `USR-${Date.now()}`;
  }
};

// Save feedback to cache
export const saveFeedback = async (feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Feedback> => {
  try {
    const existing = await getAllFeedbacks();
    const newFeedback: Feedback = {
      ...feedback,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newFeedback, ...existing];
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    return newFeedback;
  } catch (error) {
    console.error('Error saving feedback:', error);
    throw error;
  }
};

// Get all feedbacks
export const getAllFeedbacks = async (): Promise<Feedback[]> => {
  try {
    const data = await AsyncStorage.getItem(FEEDBACK_KEY);
    if (!data) return [];
    const feedbacks: Feedback[] = JSON.parse(data);
    return feedbacks.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting feedbacks:', error);
    return [];
  }
};

// Get feedbacks by username
export const getFeedbacksByUsername = async (username: string): Promise<Feedback[]> => {
  try {
    const all = await getAllFeedbacks();
    return all.filter((fb) => fb.username === username);
  } catch (error) {
    return [];
  }
};

// Get feedbacks by userId
export const getFeedbacksByUserId = async (userId: string): Promise<Feedback[]> => {
  try {
    const all = await getAllFeedbacks();
    return all.filter((fb) => fb.userId === userId);
  } catch (error) {
    return [];
  }
};

// Delete feedback
export const deleteFeedback = async (id: string): Promise<void> => {
  try {
    const all = await getAllFeedbacks();
    const filtered = all.filter((fb) => fb.id !== id);
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting feedback:', error);
  }
};

// Update feedback
export const updateFeedback = async (id: string, updates: Partial<Feedback>): Promise<void> => {
  try {
    const all = await getAllFeedbacks();
    const updated = all.map((fb) =>
      fb.id === id ? { ...fb, ...updates, updatedAt: new Date().toISOString() } : fb
    );
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating feedback:', error);
  }
};

// Get statistics
export const getFeedbackStats = async () => {
  try {
    const all = await getAllFeedbacks();
    const total = all.length;
    const pending = all.filter((f) => f.status === 'pending').length;
    const resolved = all.filter((f) => f.status === 'resolved').length;
    const avgRating = total > 0
      ? (all.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1)
      : '0.0';

    return { total, pending, resolved, avgRating };
  } catch (error) {
    return { total: 0, pending: 0, resolved: 0, avgRating: '0.0' };
  }
};

// Clear all feedbacks (for testing)
export const clearAllFeedbacks = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FEEDBACK_KEY);
  } catch (error) {
    console.error('Error clearing feedbacks:', error);
  }
};
