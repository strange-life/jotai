import { describe, test } from 'vitest';
import { atom } from './atom';

describe.concurrent('atom function', () => {
  test('should create an atom without initial value', ({ expect }) => {
    expect(atom().initialValue).toBeUndefined();
  });

  test('should create an atom with initial value', ({ expect }) => {
    expect(atom(0).initialValue).toBe(0);
  });
});
