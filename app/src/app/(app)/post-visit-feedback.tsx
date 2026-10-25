import { router } from 'expo-router';

import { PostVisitFeedbackScreen } from '@/features/discover';
import { enqueueReport } from '@/services/report-queue';

/**
 * Screen 10 · Core picker · Post-visit feedback (Figma node `5:23259`).
 *
 * The route supplies the two things the screen cannot do itself: the write to the device's own
 * report queue (`src/services/report-queue`), and where the flow goes afterwards — the saved
 * report opens the season it just joined (frame 11's visit history), which is where the design
 * lists what was saved and where the picker can see that it did not go anywhere but this phone.
 * Skipping the report leads back to the map, since there is nothing new to look at.
 *
 * `onSave` rejects when the write failed, and the screen shows that instead of claiming the
 * report was kept — so nothing navigates on a failed write.
 */
export default function PostVisitFeedbackRoute() {
  return (
    <PostVisitFeedbackScreen
      onBack={() => router.replace('/discover')}
      onSave={async (report) => {
        await enqueueReport(report);
        router.replace('/visits');
      }}
      onSkip={() => router.replace('/discover')}
    />
  );
}
