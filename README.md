# Jotai

A jotai clone for vanilla JS, made for fun and for my own use.

```typescript
import { createStore, atom } from "@madahapa/jotai";

const store = createStore();
const countAtom = atom(0);

const unsubscribe = store.subscribe(countAtom, function () {
  console.log(store.get(countAtom));
});

store.set(countAtom, store.get(count) + 1);
unsubscribe();
```
