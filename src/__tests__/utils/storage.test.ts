import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, setItem, removeItem, multiRemove } from '@utils/storage';

const mockStorage = AsyncStorage as unknown as { __reset: () => void };

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.__reset();
});

describe('setItem / getItem', () => {
  it('存储并读取对象', async () => {
    await setItem('key1', { name: 'test', value: 42 });
    const result = await getItem<{ name: string; value: number }>('key1');
    expect(result).toEqual({ name: 'test', value: 42 });
  });

  it('存储并读取字符串', async () => {
    await setItem('str', 'hello');
    const result = await getItem<string>('str');
    expect(result).toBe('hello');
  });

  it('存储并读取数组', async () => {
    await setItem('arr', [1, 2, 3]);
    const result = await getItem<number[]>('arr');
    expect(result).toEqual([1, 2, 3]);
  });

  it('读取不存在的 key 返回 null', async () => {
    const result = await getItem('nonexistent');
    expect(result).toBeNull();
  });

  it('AsyncStorage.getItem 被调用', async () => {
    await getItem('test-key');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('test-key');
  });

  it('AsyncStorage.setItem 被调用，值为 JSON 字符串', async () => {
    await setItem('obj', { a: 1 });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('obj', JSON.stringify({ a: 1 }));
  });
});

describe('removeItem', () => {
  it('删除已存在的 key', async () => {
    await setItem('del-key', 'value');
    await removeItem('del-key');
    const result = await getItem('del-key');
    expect(result).toBeNull();
  });

  it('删除不存在的 key 不报错', async () => {
    await expect(removeItem('not-exist')).resolves.toBeUndefined();
  });
});

describe('multiRemove', () => {
  it('批量删除多个 key', async () => {
    await setItem('k1', 'v1');
    await setItem('k2', 'v2');
    await setItem('k3', 'v3');
    await multiRemove(['k1', 'k2']);
    expect(await getItem('k1')).toBeNull();
    expect(await getItem('k2')).toBeNull();
    expect(await getItem('k3')).toBe('v3');
  });

  it('空数组不报错', async () => {
    await expect(multiRemove([])).resolves.toBeUndefined();
  });
});

describe('容错处理', () => {
  it('AsyncStorage.getItem 抛出异常时 getItem 返回 null', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    const result = await getItem('any');
    expect(result).toBeNull();
  });

  it('损坏的 JSON 不崩溃，返回 null', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('{broken json}}}');
    const result = await getItem('bad');
    expect(result).toBeNull();
  });
});
