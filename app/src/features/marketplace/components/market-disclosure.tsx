import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@/services/i18n';

import { Chip } from '@/components/molecules';

export type MarketDisclosureProps = {
  /** What the frame puts beside the chip: a line, a pair of chips, or a seller. */
  children?: ReactNode;
};

/**
 * The row every marketplace frame opens with (frame 15 node `5:23793`, 16 `5:23846`, 17 `5:23897`,
 * 18 `5:23949`): the design's own “Planned extra” chip, and whatever that frame puts next to it.
 *
 * The chip is the screen's disclosure that the marketplace is not live — the design draws it on
 * all four frames, and it is drawn here rather than in each screen so the four cannot drift into
 * four different claims about the same demo.
 *
 * `flex-wrap` at the frame's own 12 px gap: the frames set the row on one line and their own words
 * fit in one, and at the largest system text size they do not (ADR-019).
 *
 * Whatever a frame puts beside the chip shares the row **at its own size** and is never stretched to
 * what is left of it: at 200 % the chip alone can take most of the 342 px column, and a group told
 * to fit the remainder would be squeezed narrower than its longest word and painted out of its own
 * box — the defect the layout harness caught on all four screens (ADR-019). The row wraps instead,
 * and the group takes a line of its own.
 */
export function MarketDisclosure({ children }: MarketDisclosureProps) {
  const { t } = useTranslation();

  return (
    <View className="w-full flex-row flex-wrap items-center gap-gap" testID="market-disclosure">
      <Chip label={t('market.disclosure')} tone="warning" />
      {children ? (
        <View className="flex-row flex-wrap items-center gap-gap">{children}</View>
      ) : null}
    </View>
  );
}
