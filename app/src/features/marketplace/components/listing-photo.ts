import type { ImageSourcePropType } from 'react-native';

import blueberriesCard from '@/assets/images/market-blueberries-card.jpg';
import blueberriesDetail from '@/assets/images/market-blueberries-detail.jpg';
import lingonberriesCard from '@/assets/images/market-lingonberries-card.jpg';
import type { Species } from '@/features/discover';

/**
 * A photograph of the berry a listing sells. Sellers do not upload photos yet, so the picture
 * illustrates the species rather than claiming to be the seller's own harvest.
 */
const CARD_PHOTO: Partial<Record<Species, ImageSourcePropType>> = {
  bilberry: blueberriesCard,
  lingonberry: lingonberriesCard,
};

const DETAIL_PHOTO: Partial<Record<Species, ImageSourcePropType>> = {
  bilberry: blueberriesDetail,
  lingonberry: lingonberriesCard,
};

export function listingCardPhoto(species: Species): ImageSourcePropType | undefined {
  return CARD_PHOTO[species];
}

export function listingDetailPhoto(species: Species): ImageSourcePropType | undefined {
  return DETAIL_PHOTO[species];
}
