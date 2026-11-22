/** One message in the buyer–seller thread on a listing (`/market/listings/:id/messages`). */
export type ChatAuthor = 'buyer' | 'seller';

export type ChatMessage = {
  id: string;
  author: ChatAuthor;
  /** Whether the signed-in account wrote it. */
  mine: boolean;
  body: string;
  read: boolean;
  sentAt: string;
};

export type ChatThread = {
  listingId: string;
  sellerName: string;
  messages: ChatMessage[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseThread(body: unknown): ChatThread | null {
  if (!isRecord(body) || !Array.isArray(body.messages) || typeof body.listing_id !== 'string') {
    return null;
  }

  return {
    listingId: body.listing_id,
    sellerName: typeof body.seller_name === 'string' ? body.seller_name : '',
    messages: body.messages.flatMap((value): ChatMessage[] => {
      if (!isRecord(value)) return [];
      const { id, author, body: text, sent_at } = value;
      if (
        typeof id !== 'string' ||
        (author !== 'buyer' && author !== 'seller') ||
        typeof text !== 'string' ||
        typeof sent_at !== 'string'
      ) {
        return [];
      }
      return [
        {
          id,
          author,
          mine: value.mine === true,
          body: text,
          read: value.read === true,
          sentAt: sent_at,
        },
      ];
    }),
  };
}

export function lastMessage(thread: readonly ChatMessage[]): ChatMessage | undefined {
  return thread[thread.length - 1];
}
