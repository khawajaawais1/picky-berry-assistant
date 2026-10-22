import { View } from 'react-native';

import { AppText } from '@/components/atoms';

/**
 * The three promise labels under the hero copy on screen 01: 12 px semibold in the
 * design's success colour, sharing the row in equal thirds.
 */
export function FeatureTags({ tags }: { tags: readonly string[] }) {
  return (
    <View className="flex-row gap-xs">
      {tags.map((tag) => (
        <View className="flex-1" key={tag}>
          <AppText style={{ fontWeight: '600' }} tone="success" variant="metadata">
            {tag}
          </AppText>
        </View>
      ))}
    </View>
  );
}
