import type { Getter, Setter, Atom, WritableAtom } from './atom';
import { hasInitialValue } from './atom';

type Mounted = {
  readonly listeners: Set<() => void>;
  readonly dependencies: Set<Atom>;
  readonly dependents: Set<Atom>;
};

type AtomState<Value = unknown> = {
  readonly dependencies: Map<Atom, number>;
  epoch: number;
  value?: Value;
  error?: unknown;
  mounted?: Mounted;
};

export type Store = {
  get<Value>(atom: Atom<Value>): Value;
  set<Value, Args extends unknown[]>(
    atom: WritableAtom<Value, Args>,
    ...args: Args
  ): void;
  subscribe(atom: Atom, listener: () => void): () => void;
};

export function createStore(): Store {
  const atomStateMap = new WeakMap<Atom, AtomState>();

  function getAtomState<Value>(atom: Atom<Value>): AtomState<Value> {
    let atomState = atomStateMap.get(atom) as AtomState<Value> | undefined;

    if (!atomState) {
      atomState = {
        dependencies: new Map(),
        epoch: 0,
      };

      atomStateMap.set(atom, atomState);
    }

    return atomState;
  }

  function readAtomState<Value>(
    atom: Atom<Value>,
    force?: (a: Atom) => boolean,
  ): AtomState<Value> {
    const atomState = getAtomState(atom);

    if (!force?.(atom) && isAtomStateInitialized(atomState)) {
      if (atomState.mounted) return atomState;

      const notChanged = Array.from(atomState.dependencies).every(
        ([a, ep]) => readAtomState(a, force).epoch === ep,
      );
      if (notChanged) return atomState;
    }

    atomState.dependencies.clear();

    const get: Getter = function get(a) {
      if (Object.is(a, atom)) {
        if (!hasInitialValue(a)) {
          throw new Error('invalid derived atom');
        }

        const aState = getAtomState(a);

        if (!isAtomStateInitialized(aState)) {
          setAtomStateValue(aState, a.initialValue);
        }

        return getAtomStateValue(aState);
      }

      const aState = readAtomState(a, force);
      atomState.dependencies.set(a, aState.epoch);

      return getAtomStateValue(aState);
    };

    try {
      setAtomStateValue(atomState, atom.read(get));
    } catch (error) {
      setAtomStateError(atomState, error);
    }

    return atomState;
  }

  function readAtom<Value>(atom: Atom<Value>): Value {
    return getAtomStateValue(readAtomState(atom));
  }

  function writeAtomState<Value, Args extends unknown[]>(
    atom: WritableAtom<Value, Args>,
    ...args: Args
  ) {
    const get: Getter = readAtom;
    const set: Setter = function set(a, ...args) {
      if (Object.is(a, atom)) {
        if (!hasInitialValue(a)) {
          throw new Error('atom not writable');
        }

        const aState = getAtomState(a);
        const { epoch } = aState;

        setAtomStateValue(aState, args[0]);
        mountDependencies(a);

        if (aState.epoch === epoch) return;
        pendingAtom(a);
        return;
      }

      writeAtomState(a, ...args);
    };

    atom.write(get, set, ...args);
  }

  function writeAtom<Value, Args extends unknown[]>(
    atom: WritableAtom<Value, Args>,
    ...args: Args
  ) {
    writeAtomState(atom, ...args);
    flushPending();
  }

  function mountAtom(atom: Atom): Mounted {
    const atomState = getAtomState(atom);

    if (!atomState.mounted) {
      readAtomState(atom);

      for (const a of atomState.dependencies.keys()) {
        mountAtom(a).dependents.add(atom);
      }

      atomState.mounted = {
        listeners: new Set(),
        dependencies: new Set(atomState.dependencies.keys()),
        dependents: new Set(),
      };
    }

    return atomState.mounted;
  }

  function unmountAtom(atom: Atom): Mounted | undefined {
    const atomState = getAtomState(atom);
    if (!atomState.mounted) return;

    const hasListeners = atomState.mounted.listeners.size > 0;
    if (hasListeners) return atomState.mounted;

    const hasDependents = Array.from(atomState.mounted.dependents).some((a) =>
      getAtomState(a).mounted?.dependencies.has(atom),
    );
    if (hasDependents) return atomState.mounted;

    atomState.mounted = undefined;

    for (const a of atomState.dependencies.keys()) {
      unmountAtom(a)?.dependents.delete(atom);
    }
  }

  function mountDependencies(atom: Atom) {
    const atomState = getAtomState(atom);
    if (!atomState.mounted) return;

    for (const a of atomState.dependencies.keys()) {
      if (atomState.mounted.dependencies.has(a)) continue;
      mountAtom(a).dependents.add(atom);
      atomState.mounted.dependencies.add(a);
    }

    for (const a of atomState.mounted.dependencies) {
      if (atomState.dependencies.has(a)) continue;
      unmountAtom(a)?.dependents.delete(atom);
      atomState.mounted.dependencies.delete(a);
    }
  }

  function subscribeAtom(atom: Atom, listener: () => void) {
    const { listeners } = mountAtom(atom);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
      unmountAtom(atom);
    };
  }

  const pendingAtoms = new Set<Atom>();

  function pendingAtom(atom: Atom) {
    const atomState = getAtomState(atom);
    if (!atomState.mounted) return;
    pendingAtoms.add(atom);

    const topsortedAtoms: Atom[] = [];
    const markedAtoms = new Set<Atom>();

    visit(atom);
    function visit(a: Atom) {
      const aState = getAtomState(a);
      if (!aState.mounted) return;

      if (markedAtoms.has(a)) return;
      markedAtoms.add(a);

      for (const t of aState.mounted.dependents) {
        visit(t);
      }

      topsortedAtoms.push(a);
    }

    const changedAtoms = new Set([atom]);
    const isMarked = (a: Atom) => markedAtoms.has(a);

    for (let i = topsortedAtoms.length - 1; i >= 0; i--) {
      const a = topsortedAtoms[i];
      const aState = getAtomState(a);

      if (!aState.mounted) {
        markedAtoms.delete(a);
        continue;
      }

      let hasChangedDep = false;
      for (const dep of aState.mounted.dependencies) {
        if (changedAtoms.has(dep)) {
          hasChangedDep = true;
          break;
        }
      }

      if (hasChangedDep) {
        const { epoch } = aState;
        readAtomState(a, isMarked);
        mountDependencies(a);

        if (aState.epoch !== epoch) {
          changedAtoms.add(a);
          pendingAtoms.add(a);
        }
      }

      markedAtoms.delete(a);
    }
  }

  function flushPending() {
    while (pendingAtoms.size) {
      const atoms = [...pendingAtoms];
      pendingAtoms.clear();

      for (const a of atoms) {
        const aState = getAtomState(a);
        if (!aState.mounted) continue;

        for (const listener of aState.mounted.listeners) {
          listener();
        }
      }
    }
  }

  return {
    get: readAtom,
    set: writeAtom,
    subscribe: subscribeAtom,
  };
}

function isAtomStateInitialized(atomState: AtomState) {
  return 'value' in atomState || 'error' in atomState;
}

function getAtomStateValue<Value>(atomState: AtomState<Value>): Value {
  if (!isAtomStateInitialized(atomState)) {
    throw new Error('atom state is not initialized');
  }

  if (atomState.error) {
    throw atomState.error;
  }

  return atomState.value as Value;
}

function setAtomStateValue(atomState: AtomState, value: unknown) {
  if (isAtomStateInitialized(atomState) && Object.is(atomState.value, value)) {
    return;
  }

  atomState.value = value;
  atomState.error = undefined;
  atomState.epoch++;
}

function setAtomStateError(atomState: AtomState, error: unknown) {
  atomState.value = undefined;
  atomState.error = error;
  atomState.epoch++;
}
