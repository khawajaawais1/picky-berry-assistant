/**
 * Frame 17's thread (node `5:23883`): the picker asking the frame 16 listing's own seller for 5 kg,
 * and the two of them agreeing on the pickup.
 *
 * The messages are the design's sample exchange, and they are **data, not copy**: a real thread
 * would arrive from a service, so what is held here is who wrote what, when, and whether the
 * picker has seen it. The *words* are the catalogue's (`market.chat.*`, joined by
 * `components/chat-copy.ts`), because they are rendered sentences and the app ships two languages.
 *
 * There is no transport: nothing sends a message and nothing receives one (PROJECT.md records it),
 * so the screen draws the thread of the design's demo order — the one the browse card, the detail
 * screen and the order all belong to.
 */

export type ChatAuthor = 'picker' | 'seller';

export type ChatMessage = {
  /**
   * The message's own identifier, which is also how the catalogue names its words: the sample
   * thread has no message ids of its own to arrive with, and a stable identifier is what keeps the
   * copy and the bubble in one place.
   */
  id: 'ask' | 'reply' | 'confirm' | 'pack';
  author: ChatAuthor;
  /** The clock time under the bubble, as the design prints it. */
  time: string;
  /**
   * Whether the picker has seen it. The frame prints a receipt under its own two messages
   * (“14:02 · Read”) and a bare time under the seller's: a receipt for a message the app did not
   * send, to someone the app cannot see, is not something it can know.
   */
  read: boolean;
};

/** The frame's own four messages, in the order it draws them (nodes `5:23910`–`5:23923`). */
export const DEMO_THREAD: readonly ChatMessage[] = [
  { id: 'ask', author: 'picker', time: '14:02', read: true },
  { id: 'reply', author: 'seller', time: '14:04', read: false },
  { id: 'confirm', author: 'picker', time: '14:05', read: true },
  { id: 'pack', author: 'seller', time: '14:06', read: false },
];

/** The newest message of a thread, which is what a thread's own row prints. */
export function lastMessage(thread: readonly ChatMessage[]): ChatMessage | undefined {
  return thread[thread.length - 1];
}
