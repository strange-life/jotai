export type Getter = <Value>(atom: Atom<Value>) => Value;

export type Setter = <Value, Args extends unknown[]>(
  atom: WritableAtom<Value, Args>,
  ...args: Args
) => void;

type Read<Value> = (get: Getter) => Value;

type Write<Args extends unknown[]> = (
  get: Getter,
  set: Setter,
  ...args: Args
) => void;

type WithInitialValue<Value> = {
  readonly initialValue: Value;
};

export function hasInitialValue<T extends Atom>(
  atom: T,
): atom is T & (T extends Atom<infer Value> ? WithInitialValue<Value> : never) {
  return 'initialValue' in atom;
}

export interface Atom<Value = unknown> {
  readonly read: Read<Value>;
}

export interface WritableAtom<
  Value = unknown,
  Args extends unknown[] = unknown[],
> extends Atom<Value> {
  readonly write: Write<Args>;
}

type SetStateAction<Value> = Value | ((prev: Value) => Value);

export type PrimitiveAtom<Value> = WritableAtom<Value, [SetStateAction<Value>]>;

// writable derived atom
export function atom<Value, Args extends unknown[]>(
  read: Read<Value>,
  write: Write<Args>,
): WritableAtom<Value, Args>;

// read only derived atom
export function atom<Value>(read: Read<Value>): Atom<Value>;

// writable derived atom with initial value
export function atom<Value, Args extends unknown[]>(
  initialValue: Value,
  write: Write<Args>,
): WritableAtom<Value, Args> & WithInitialValue<Value>;

// primitive atom with initial value
export function atom<Value>(
  initialValue: Value,
): PrimitiveAtom<Value> & WithInitialValue<Value>;

// primitive atom without initial value
export function atom<Value>(): PrimitiveAtom<Value | undefined> &
  WithInitialValue<Value | undefined>;

export function atom<Value, Args extends unknown[]>(
  read?: Value | Read<Value>,
  write?: Write<Args>,
) {
  if (typeof read === 'function') {
    if (write) {
      return {
        read: read as Read<Value>,
        write,
      } satisfies WritableAtom<Value, Args>;
    }

    return {
      read: read as Read<Value>,
    } satisfies Atom<Value>;
  }

  if (write) {
    return {
      read: defaultRead,
      write,
      initialValue: read,
    } satisfies WritableAtom<Value | undefined, Args> &
      WithInitialValue<Value | undefined>;
  }

  return {
    read: defaultRead,
    write: primitiveWrite,
    initialValue: read,
  } satisfies PrimitiveAtom<Value | undefined> &
    WithInitialValue<Value | undefined>;
}

function defaultRead<Value>(this: Atom<Value>, get: Getter) {
  return get(this);
}

function primitiveWrite<Value>(
  this: PrimitiveAtom<Value>,
  get: Getter,
  set: Setter,
  arg: SetStateAction<Value>,
) {
  set(
    this,
    typeof arg === 'function'
      ? (arg as (prev: Value) => Value)(get(this))
      : arg,
  );
}
