import AsyncStorage from '@react-native-async-storage/async-storage';

/** 读取 JSON 数据，解析失败返回 null */
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 写入 JSON 数据 */
export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[storage] setItem failed:', key, error);
  }
}

/** 删除数据 */
export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('[storage] removeItem failed:', key, error);
  }
}

/** 批量删除 */
export async function multiRemove(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.warn('[storage] multiRemove failed:', error);
  }
}
