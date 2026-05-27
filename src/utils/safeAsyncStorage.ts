import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * =========================================================
 * SAFE ASYNC STORAGE
 * =========================================================
 *
 * Wrapper seguro para AsyncStorage.
 *
 * Resolve problemas comuns:
 *
 * - java.lang.Boolean cannot be cast to java.lang.String
 * - dados corrompidos
 * - valores inválidos
 * - JSON quebrado
 * - crash no Android
 *
 * Compatível:
 * - Expo
 * - React Native
 * - Android
 * - iOS
 *
 * =========================================================
 */

type StoragePrimitive = string | number | boolean | null;

type StorageValue = StoragePrimitive | Record<string, unknown> | unknown[];

const isCastError = (error: unknown): boolean => {
  const message = String((error as Error)?.message ?? error ?? '');

  return (
    message.includes('cannot be cast') ||
    message.includes('ClassCastException') ||
    message.includes('Boolean cannot be cast') ||
    message.includes('String cannot be cast')
  );
};

const logError = (method: string, key: string, error: unknown) => {
  console.log(`[safeAsyncStorage:${method}] key="${key}"`, error);
};

export const safeAsyncStorage = {
  /**
   * =========================================================
   * GET STRING
   * =========================================================
   */

  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);

      if (value === undefined || value === null) {
        return null;
      }

      return typeof value === 'string' ? value : String(value);
    } catch (error) {
      logError('getItem', key, error);

      if (isCastError(error)) {
        try {
          await AsyncStorage.removeItem(key);
        } catch {}
      }

      return null;
    }
  },

  /**
   * =========================================================
   * SET STRING
   * =========================================================
   */

  async setItem(key: string, value: StorageValue): Promise<void> {
    try {
      let safeValue: string;

      if (typeof value === 'string') {
        safeValue = value;
      } else {
        safeValue = JSON.stringify(value);
      }

      await AsyncStorage.setItem(key, safeValue);
    } catch (error) {
      logError('setItem', key, error);
    }
  },

  /**
   * =========================================================
   * GET JSON
   * =========================================================
   */

  async getJSON<T>(key: string, fallback: T): Promise<T> {
    try {
      const value = await AsyncStorage.getItem(key);

      if (!value) {
        return fallback;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logError('getJSON', key, error);

      if (isCastError(error)) {
        try {
          await AsyncStorage.removeItem(key);
        } catch {}
      }

      return fallback;
    }
  },

  /**
   * =========================================================
   * SET JSON
   * =========================================================
   */

  async setJSON(key: string, value: unknown): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      await AsyncStorage.setItem(key, serialized);
    } catch (error) {
      logError('setJSON', key, error);
    }
  },

  /**
   * =========================================================
   * REMOVE ITEM
   * =========================================================
   */

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logError('removeItem', key, error);
    }
  },

  /**
   * =========================================================
   * CLEAR STORAGE
   * =========================================================
   */

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.log('[safeAsyncStorage:clear]', error);
    }
  },

  /**
   * =========================================================
   * HAS KEY
   * =========================================================
   */

  async hasKey(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);

      return value !== null;
    } catch (error) {
      logError('hasKey', key, error);
      return false;
    }
  },
};

export default safeAsyncStorage;
