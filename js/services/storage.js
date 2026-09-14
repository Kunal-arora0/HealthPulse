/**
 * Web Storage Service (localStorage API)
 * Demonstrates: Web Storage, JSON Serialization, Defensive Parsing
 */

const STORAGE_KEYS = {
  DAILY_FOOD_LOG: 'healthpulse_daily_food_log',
  WORKOUT_LOG: 'healthpulse_workout_log',
  USER_GOALS: 'healthpulse_user_goals',
  CUSTOM_EXERCISES: 'healthpulse_custom_exercises',
  PRS: 'healthpulse_personal_records'
};

export const StorageService = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing ${key} from localStorage:`, e);
    }
  },

  KEYS: STORAGE_KEYS
};
