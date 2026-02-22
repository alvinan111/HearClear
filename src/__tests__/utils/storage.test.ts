/**
 * storage 工具函数测试
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, setItem, removeItem, multiRemove } from '@utils/storage';

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getItem', () => {
  it('返回解析后的 JSON 对象', async () => {
    mockStorage.getItem.mockResolvedValue('{"name":"test","value":42}');
    const result = await getItem<{ name: string; value: number }>('key');
    expect(result).toEqual({ name: 'test', value: 42 });
  });

  it('key 不存在时返回 null', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    const result = await getItem('missing');
    expect(result).toBeNull();
  });

  it('JSON 解析失败时返回 null（不抛异常）', async () => {
    mockStorage.getItem.mockResolvedValue('{invalid json}');
    const result = await getItem('bad');
    expect(result).toBeNull();
  });

  it('AsyncStorage 报错时返回 null（不崩溃）', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('storage error'));
    const result = await getItem('error-key');
    expect(result).toBeNull();
  });

  it('可以正确读取数组', async () => {
    mockStorage.getItem.mockResolvedValue('[1,2,3]');
    const result = await getItem<number[]>('arr');
    expect(result).toEqual([1, 2, 3]);
  });

  it('可以读取布尔值', async () => {
    mockStorage.getItem.mockResolvedValue('true');
    const result = await getItem<boolean>('flag');
    expect(result).toBe(true);
  });
});

describe('setItem', () => {
  it('正确序列化对象并写入', async () => {
    mockStorage.setItem.mockResolvedValue(undefined);
    await setItem('key', { a: 1 });
    expect(mockStorage.setItem).toHaveBeenCalledWith('key', '{"a":1}');
  });

  it('写入失败时不抛异常（仅 warn）', async () => {
    mockStorage.setItem.mockRejectedValue(new Error('write error'));
    await expect(setItem('key', { a: 1 })).resolves.not.toThrow();
  });

  it('可以写入 null 值', async () => {
    mockStorage.setItem.mockResolvedValue(undefined);
    await setItem('key', null);
    expect(mockStorage.setItem).toHaveBeenCalledWith('key', 'null');
  });

  it('可以写入数组', async () => {
    mockStorage.setItem.mockResolvedValue(undefined);
    await setItem('arr', [1, 2, 3]);
    expect(mockStorage.setItem).toHaveBeenCalledWith('arr', '[1,2,3]');
  });
});

describe('removeItem', () => {
  it('正常删除', async () => {
    mockStorage.removeItem.mockResolvedValue(undefined);
    await removeItem('key');
    expect(mockStorage.removeItem).toHaveBeenCalledWith('key');
  });

  it('删除失败时不抛异常', async () => {
    mockStorage.removeItem.mockRejectedValue(new Error('remove error'));
    await expect(removeItem('key')).resolves.not.toThrow();
  });
});

describe('multiRemove', () => {
  it('批量删除多个 key', async () => {
    mockStorage.multiRemove.mockResolvedValue(undefined);
    await multiRemove(['k1', 'k2', 'k3']);
    expect(mockStorage.multiRemove).toHaveBeenCalledWith(['k1', 'k2', 'k3']);
  });

  it('空数组不报错', async () => {
    mockStorage.multiRemove.mockResolvedValue(undefined);
    await expect(multiRemove([])).resolves.not.toThrow();
  });

  it('批量删除失败时不抛异常', async () => {
    mockStorage.multiRemove.mockRejectedValue(new Error('batch error'));
    await expect(multiRemove(['k1'])).resolves.not.toThrow();
  });
});
