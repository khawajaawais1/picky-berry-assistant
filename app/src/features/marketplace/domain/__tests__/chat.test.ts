import { lastMessage, parseThread } from '../chat';
import { API_THREAD } from '../test-fixtures';

describe('parseThread', () => {
  it('reads the thread, oldest first, with who wrote each message', () => {
    const thread = parseThread(API_THREAD);

    expect(thread?.sellerName).toBe('Matti L.');
    expect(thread?.messages.map((m) => [m.author, m.mine, m.body])).toEqual([
      ['buyer', true, 'Still available?'],
      ['seller', false, 'Yes!'],
    ]);
  });

  it('drops a message it cannot read, and refuses a body that is not a thread', () => {
    expect(
      parseThread({ ...API_THREAD, messages: [...API_THREAD.messages, { id: 'x' }] })?.messages,
    ).toHaveLength(2);
    expect(parseThread({ messages: [] })).toBeNull();
  });
});

describe('lastMessage', () => {
  it('answers with the newest message, or nothing for an empty thread', () => {
    expect(lastMessage(parseThread(API_THREAD)!.messages)?.id).toBe('m2');
    expect(lastMessage([])).toBeUndefined();
  });
});
