export type Atom<Value> = {
  readonly initialValue: Value;
};

export function atom<Value>(): Atom<Value | undefined>;
export function atom<Value>(initialValue: Value): Atom<Value>;
export function atom<Value>(initialValue?: Value) {
  return { initialValue };
}
