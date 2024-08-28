import type { Atom } from './atom';

type AtomState<Value> = {
  value: Value;
  listeners: Set<() => void>;
};

export type Store = {
  get<Value>(atom: Atom<Value>): Value;
  set<Value>(atom: Atom<Value>, value: Value): void;
  subscribe<Value>(atom: Atom<Value>, listener: () => void): () => void;
};

export function createStore(): Store {
  const atomStateMap = new WeakMap<Atom<unknown>, AtomState<unknown>>();

  function getAtomState<Value>(atom: Atom<Value>): AtomState<Value> {
    let atomState = atomStateMap.get(atom) as AtomState<Value> | undefined;

    if (!atomState) {
      atomState = {
        value: atom.initialValue,
        listeners: new Set(),
      };

      atomStateMap.set(atom, atomState);
    }

    return atomState;
  }

  const pendingListenerQueue: Set<() => void> = new Set();

  function notify<Value>(atom: Atom<Value>) {
    const shouldFlush = !pendingListenerQueue.size;
    const { listeners } = getAtomState(atom);

    for (const listener of listeners) {
      pendingListenerQueue.add(listener);
    }

    if (!shouldFlush) return;

    for (const listener of pendingListenerQueue) {
      listener();
    }

    pendingListenerQueue.clear();
  }

  return {
    get(atom) {
      return getAtomState(atom).value;
    },
    set(atom, value) {
      const atomState = getAtomState(atom);
      if (Object.is(atomState.value, value)) return;

      atomState.value = value;
      notify(atom);
    },
    subscribe(atom, listener) {
      const { listeners } = getAtomState(atom);
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
        pendingListenerQueue.delete(listener);
      };
    },
  };
}
