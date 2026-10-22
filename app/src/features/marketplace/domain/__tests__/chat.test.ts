import { DEMO_THREAD, lastMessage } from '../chat';

/**
 * Frame 17's thread is the design's own sample exchange: four messages between the picker and the
 * seller the demo listing belongs to. The order the bubbles are drawn in is the story's, so it is
 * asserted rather than assumed — a thread that draws the seller's reply above the question would
 * still render, and would read as a conversation that never happened.
 */
describe('DEMO_THREAD', () => {
  it('is the frame’s own four messages, oldest first', () => {
    expect(DEMO_THREAD.map((message) => message.id)).toEqual(['ask', 'reply', 'confirm', 'pack']);
  });

  it('alternates between the picker and the seller', () => {
    expect(DEMO_THREAD.map((message) => message.author)).toEqual([
      'picker',
      'seller',
      'picker',
      'seller',
    ]);
  });

  it('stamps each message, in the order the design prints them', () => {
    expect(DEMO_THREAD.map((message) => message.time)).toEqual([
      '14:02',
      '14:04',
      '14:05',
      '14:06',
    ]);
  });

  it('carries a read receipt on the picker’s own messages, and on none of the seller’s', () => {
    // The frame prints “14:02 · Read” under the two outgoing bubbles and a bare time under the
    // incoming ones: a receipt the app cannot have for someone else's message is not drawn.
    expect(DEMO_THREAD.map((message) => message.read)).toEqual([true, false, true, false]);
  });
});

describe('lastMessage', () => {
  it('answers with the newest message of a thread', () => {
    expect(lastMessage(DEMO_THREAD)?.id).toBe('pack');
  });

  it('answers with nothing for a thread that has no messages', () => {
    expect(lastMessage([])).toBeUndefined();
  });
});
