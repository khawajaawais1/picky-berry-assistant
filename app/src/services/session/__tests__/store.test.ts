import { createInMemorySessionStore } from '../store';

/**
 * The store port's contract, held against the only implementation that exists — the in-memory
 * one. It is written as a **contract** rather than as a test of that implementation because the
 * next one is the reason the port exists: ADR-006's secure-storage adapter, which is what holds
 * a real token when the account service arrives. Whatever is written for it has to pass this.
 *
 * What the contract fixes is the shape a caller may rely on: reading a store that was never
 * written to hands back nothing, writing replaces what was there, and clearing leaves it empty.
 * It says nothing about *where* anything is kept — that is the implementation's business, and it
 * is exactly what changes between the two implementations.
 */
describe('a session store', () => {
  it('keeps nothing until something is written to it', async () => {
    expect(await createInMemorySessionStore().read()).toBeNull();
  });

  it('hands back what was written to it', async () => {
    const store = createInMemorySessionStore();

    await store.write('{"accountId":"aino@example.fi"}');

    expect(await store.read()).toBe('{"accountId":"aino@example.fi"}');
  });

  it('replaces what was there rather than keeping both', async () => {
    const store = createInMemorySessionStore();

    await store.write('first');
    await store.write('second');

    expect(await store.read()).toBe('second');
  });

  it('keeps nothing after it is cleared', async () => {
    const store = createInMemorySessionStore();

    await store.write('{"accountId":"aino@example.fi"}');
    await store.clear();

    expect(await store.read()).toBeNull();
  });

  it('clears without complaining when there is nothing to clear', async () => {
    // Signing out twice is not an error: what the caller asked for — no session is kept —
    // holds either way.
    await expect(createInMemorySessionStore().clear()).resolves.toBeUndefined();
  });

  it('keeps sessions to itself, rather than sharing one place between stores', async () => {
    // Two stores are two devices' worth of state; a module-level variable would make the
    // harness's cases leak into each other, and would make the port's contract untestable.
    const one = createInMemorySessionStore();
    const two = createInMemorySessionStore();

    await one.write('from one');

    expect(await two.read()).toBeNull();
  });
});
