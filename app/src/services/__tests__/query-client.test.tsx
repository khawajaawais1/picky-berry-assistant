import { onlineManager } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import * as Network from 'expo-network';

import { createQueryClient, QueryProvider } from '../query-client';

/**
 * The two defaults that make a forest read behave: a read is fresh for a while, and the cache
 * hears the device when it comes back online instead of staying failed until the next mount
 * (frontend review, 2026-10-25).
 */
describe('the query cache', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    jest.clearAllMocks();
  });

  it('keeps a successful answer fresh for longer than a tab switch', () => {
    expect(createQueryClient().getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('tells the cache when the phone loses and regains its connection', async () => {
    await render(
      <QueryProvider>
        <></>
      </QueryProvider>,
    );

    const listener = (Network.addNetworkStateListener as jest.Mock).mock.calls[0]?.[0];
    expect(listener).toBeDefined();

    await act(async () => listener({ isConnected: false }));

    expect(onlineManager.isOnline()).toBe(false);

    await act(async () => listener({ isConnected: true }));

    expect(onlineManager.isOnline()).toBe(true);
  });
});
