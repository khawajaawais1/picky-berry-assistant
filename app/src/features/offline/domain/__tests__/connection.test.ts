import { connectionState } from '../connection';

/**
 * What the app may claim about the device's connection (frame 13's status message). The frame's
 * own words are only drawn when they are true, so which of the three answers a platform report
 * earns is worth pinning down: a wrong “offline” tells the picker to expect a delay that is not
 * there, and a wrong “online” is a claim about a device the app cannot see.
 */
describe('connectionState', () => {
  it('is online when the platform reports a connection it can reach through', () => {
    expect(connectionState({ isConnected: true, isInternetReachable: true })).toBe('online');
  });

  it('is offline when there is no connection at all', () => {
    expect(connectionState({ isConnected: false, isInternetReachable: false })).toBe('offline');
    expect(connectionState({ isConnected: false })).toBe('offline');
  });

  it('is offline on a connection with no internet behind it', () => {
    // A radio link is not an internet connection: nothing this app would send would arrive.
    expect(connectionState({ isConnected: true, isInternetReachable: false })).toBe('offline');
    expect(connectionState({ isInternetReachable: false })).toBe('offline');
  });

  it('accepts a platform that answers with only one of the two fields', () => {
    // iOS reports `isInternetReachable` as `isConnected`, and a platform may leave one out
    // entirely; the one it did report is an answer, not a silence.
    expect(connectionState({ isConnected: true })).toBe('online');
    expect(connectionState({ isInternetReachable: true })).toBe('online');
  });

  it('is unknown while the platform has not answered, and guesses neither way', () => {
    expect(connectionState({})).toBe('unknown');
    expect(connectionState({ isConnected: undefined, isInternetReachable: undefined })).toBe(
      'unknown',
    );
  });
});
