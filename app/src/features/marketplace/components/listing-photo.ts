import type { ImageSourcePropType } from 'react-native';

import blueberriesCard from '@/assets/images/market-blueberries-card.png';
import blueberriesDetail from '@/assets/images/market-blueberries-detail.png';
import lingonberriesCard from '@/assets/images/market-lingonberries-card.png';

/**
 * The one table that turns a listing into its photograph, so the card and the listing's own screen
 * cannot show two different pictures of one thing.
 *
 * The two photographs are the design's own image fills, taken from the file itself
 * (`/v1/files/:key/images`, the assets the file holds) rather than shot, sourced or invented
 * (ADR-016): frame 15's cards carry them at nodes `5:23809` and `5:23819`, and frame 16 draws the
 * same produce at node `5:23850` — a listing has one photograph of its berries, so the tables below
 * hold the file's two card images and the one detail image the frame draws beside them. Each was
 * written out at twice the size the frame draws it, like the app's other exported photographs.
 *
 * A listing the app has no photograph for gets **none**, and the caller draws no image: a card that
 * showed another listing's berries would be worse than a card with no picture.
 */
const CARD_PHOTO: Record<string, ImageSourcePropType> = {
  blueberries: blueberriesCard,
  lingonberries: lingonberriesCard,
};

const DETAIL_PHOTO: Record<string, ImageSourcePropType> = {
  blueberries: blueberriesDetail,
};

/** The listing's photograph, as frame 15's card draws it. */
export function listingCardPhoto(listingId: string): ImageSourcePropType | undefined {
  return CARD_PHOTO[listingId];
}

/** The listing's own photograph, as frame 16 draws it. */
export function listingDetailPhoto(listingId: string): ImageSourcePropType | undefined {
  return DETAIL_PHOTO[listingId];
}
