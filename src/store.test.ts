import { describe, test, vi } from 'vitest';
import { createStore } from './store';
import { atom } from './atom';

describe.concurrent('createStore function', () => {
  test('should return undefined for an atom without initial value and not set', ({
    expect,
  }) => {
    expect(createStore().get(atom())).toBeUndefined();
  });

  test('should get the initial value from an atom', ({ expect }) => {
    expect(createStore().get(atom(0))).toBe(0);
  });

  test('should set and get a value for an atom', ({ expect }) => {
    const store = createStore();
    const testAtom = atom<number>();

    store.set(testAtom, 0);
    expect(store.get(testAtom)).toBe(0);
  });

  test('should not fire on subscribe', ({ expect }) => {
    const store = createStore();
    const testAtom = atom();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    store.subscribe(testAtom, listener1);
    store.subscribe(testAtom, listener2);

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).not.toHaveBeenCalled();
  });

  test('should notify listeners when a value is set', ({ expect }) => {
    const store = createStore();
    const testAtom = atom<number>();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    store.subscribe(testAtom, listener1);
    store.subscribe(testAtom, listener2);
    store.set(testAtom, 0);

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  test('should unsubscribe listeners correctly', ({ expect }) => {
    const store = createStore();
    const testAtom = atom<number>();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsubscribe = store.subscribe(testAtom, listener1);
    store.subscribe(testAtom, listener2);

    unsubscribe();
    store.set(testAtom, 0);

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  test('should not notify listeners if value does not change', ({ expect }) => {
    const store = createStore();
    const testAtom = atom(0);
    const listener = vi.fn();

    store.subscribe(testAtom, listener);
    store.set(testAtom, 0);

    expect(listener).not.toHaveBeenCalled();
  });
});
