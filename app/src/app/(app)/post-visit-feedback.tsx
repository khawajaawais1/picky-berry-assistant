import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { PostVisitFeedbackScreen } from '@/features/discover';
import { clearLastFinalized, useVisitSession, type VisitSessionVisit } from '@/features/visits';
import { enqueueReport } from '@/services/report-queue';
import { appReportsApi, flushReportQueue } from '@/services/reports';

/**
 * Screen 10 · Core picker · Post-visit feedback (Figma node `5:23259`).
 *
 * The route supplies the two things the screen cannot do itself: the write to the device's own
 * report queue (`src/services/report-queue`), and where the flow goes afterwards — the saved
 * report opens the season it just joined (frame 11's visit history), which is where the design
 * lists what was saved and where the picker can see that it did not go anywhere but this phone.
 * Skipping the report leads back to the map, since there is nothing new to look at.
 *
 * The visit is the one the tracker finalized when screen 09's “End visit” was pressed or when the
 * picker left and the grace window passed, read from the session store. Once its report is saved,
 * skipped or left with the back control, the reading is cleared so a later visit to this route
 * cannot save the same visit twice.
 *
 * `onSave` rejects when the write failed, and the screen shows that instead of claiming the report
 * was kept — so nothing navigates on a failed write.
 */
export default function PostVisitFeedbackRoute() {
  const { lastFinalized } = useVisitSession();
  const queryClient = useQueryClient();
  // Keep the visit on screen while the route leaves: clearing the store after a save or skip
  // must not flash the empty state before the next route draws. The mount-time reading is the
  // fallback for the frame after the store is cleared.
  const [visitAtMount] = useState<VisitSessionVisit | null>(lastFinalized);
  const visit = lastFinalized ?? visitAtMount;

  return (
    <PostVisitFeedbackScreen
      onBack={() => {
        clearLastFinalized();
        router.replace('/discover');
      }}
      onSave={async (report) => {
        await enqueueReport(report);
        // Kept on the phone first, then sent: without signal it waits in the queue for the next pass.
        void flushReportQueue(appReportsApi)
          .then(() => queryClient.invalidateQueries({ queryKey: ['me'] }))
          .catch(() => undefined);
        clearLastFinalized();
        router.replace('/visits');
      }}
      onSkip={() => {
        clearLastFinalized();
        router.replace('/discover');
      }}
      visit={visit}
    />
  );
}
