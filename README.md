# Jotai

A jotai clone for vanilla JS, made for fun and for my own use.

```typescript
import { createStore, atom } from "@madahapa/jotai";

const store = createStore();
const countAtom = atom(0);
const doubleCountAtom = atom(
  (get) => get(countAtom) * 2,
  (get, set, value: number) => set(countAtom, value / 2)
);

const unsubscribe = store.subscribe(doubleCountAtom, function () {
  console.log(store.get(doubleCountAtom));
});

store.set(countAtom, (prev) => prev + 1);
unsubscribe();
```
