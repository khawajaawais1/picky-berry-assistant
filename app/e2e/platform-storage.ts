import type { Page } from '@playwright/test';

/**
 * The platform's storage, made asynchronous for the one reading that needs it to be.
 *
 * **Why a reading needs this.** A screen read **while an action is working** exists only for as long
 * as the work takes, and on the web target that is no time at all: `AsyncStorage`'s web
 * implementation calls `window.localStorage` *synchronously inside* `new Promise` (read in
 * `@react-native-async-storage/async-storage`'s `AsyncStorage.js`), so an awaited write resolves
 * inside the task the press was handled in. React then folds `busy = true` and `busy = false` into
 * one commit and the in-flight state never reaches the DOM — measured on the built export before
 * this file existed, with a mutation recorder watching every `aria-*` attribute: nothing. On a
 * device the same code path is asynchronous — the native module answers in a later task — so the
 * state a user sees is real there and invisible to this harness.
 *
 * **What it does, and what it deliberately does not.** It defers the *reaction* of every promise the
 * app creates with `new Promise` — which is how its storage layer wraps the platform's calls — by
 * `delayMs`, the timing the device has and the web target does not. It changes no product code, no
 * screen and no store: the app resolves the same values in the same order, one task later. Promises
 * an `async` function creates are untouched (they use the realm's intrinsic constructor, not the
 * global one), so what is slowed is the storage wrapper and nothing else.
 *
 * **Where it may be used.** Only in a test that reads an in-flight state, and only beside an
 * assertion that the work finished — the delay is a harness factor, not a claim about the device's
 * speed (`DELAY_MS` is long enough to read, and the screen being read is the app's own).
 */
export async function makePlatformStorageAsynchronous(page: Page): Promise<void> {
  await page.addInitScript((delayMs: number) => {
    const NativePromise = window.Promise;
    const later = (run: () => void): void => {
      window.setTimeout(run, delayMs);
    };

    class PlatformStoragePromise<T> extends NativePromise<T> {
      then<TResult1 = T, TResult2 = never>(
        onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
        onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): Promise<TResult1 | TResult2> {
        return new NativePromise<TResult1 | TResult2>((resolve, reject) => {
          super.then(
            (value) =>
              later(() => {
                try {
                  resolve(onFulfilled ? onFulfilled(value) : (value as unknown as TResult1));
                } catch (error) {
                  reject(error);
                }
              }),
            (reason) =>
              later(() => {
                // Without a rejection handler the derived promise rejects, exactly as the
                // platform's own `then` does — a shim that swallowed it would hide a failure the
                // screen is supposed to report.
                if (!onRejected) {
                  reject(reason);

                  return;
                }

                try {
                  resolve(onRejected(reason));
                } catch (error) {
                  reject(error);
                }
              }),
          );
        });
      }
    }

    window.Promise = PlatformStoragePromise;
  }, DELAY_MS);
}

/**
 * How long the platform's storage takes to answer in this reading: long enough that the state a
 * press produces can be observed and read, and short enough that the screen finishes the work the
 * test then asserts (the press, the write and the flow on). It is a harness factor, not a figure
 * about any device.
 */
export const DELAY_MS = 500;
