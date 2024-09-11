import { describe, test } from 'vitest';
import { atom } from './atom';

describe.concurrent('atom function', () => {
  test('should create an atom without initial value', ({ expect }) => {
    expect(atom().initialValue).toBeUndefined();
  });

  test('should create an atom with initial value', ({ expect }) => {
    expect(atom(0).initialValue).toBe(0);
  });

  test('derived readonly atom should not has initial value', ({ expect }) => {
    const countAtom = atom(0);
    const doubleAtom = atom((get) => get(countAtom) * 2);

    expect(
      Object.prototype.hasOwnProperty.call(doubleAtom, 'initialValue'),
    ).toBe(false);
  });
});
