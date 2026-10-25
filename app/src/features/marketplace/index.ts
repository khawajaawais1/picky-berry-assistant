/**
 * Public API of the `marketplace` feature.
 *
 * Four screens, which are the design's planned marketplace as a **demo**: frame 15's browse list
 * with its real search, the listing it opens (frame 16), the thread with that listing's seller
 * (frame 17) and the demo order the two of them agreed on (frame 18).
 *
 * The feature owns the design's two listings and their story (`domain/listing.ts`), the order and
 * its arithmetic (`domain/order.ts`), the sample thread (`domain/chat.ts`) and the money formatter
 * both of them print through (`domain/money.ts`).
 *
 * What the four screens deliberately do not have — a listings service, a seller account, a chat
 * transport and a payment provider — is recorded in PROJECT.md rather than invented here. The
 * screens carry the frames' own disclosures instead (“Planned extra”, “Buyer mode · Preview”,
 * “Provider test mode”), and the controls that would need those services claim no role.
 */
export {
  MarketBrowseScreen,
  type MarketBrowseScreenProps,
} from './components/market-browse-screen';
export { MarketChatScreen, type MarketChatScreenProps } from './components/market-chat-screen';
export {
  MarketListingScreen,
  type MarketListingScreenProps,
} from './components/market-listing-screen';
export { MarketOrderScreen, type MarketOrderScreenProps } from './components/market-order-screen';
export {
  DEMO_LISTING,
  DEMO_LISTING_DETAIL,
  DEMO_LISTING_ID,
  DEMO_LISTINGS,
  filterListings,
  listingById,
  listingDetailFor,
  type ListingDetail,
  type MarketListing,
  type MarketPlace,
  type MarketSeller,
} from './domain/listing';
export { DEMO_ORDER, orderSubtotalCents, orderTotalCents, type MarketOrder } from './domain/order';
export { DEMO_THREAD, lastMessage, type ChatAuthor, type ChatMessage } from './domain/chat';
export { formatEuros } from './domain/money';
