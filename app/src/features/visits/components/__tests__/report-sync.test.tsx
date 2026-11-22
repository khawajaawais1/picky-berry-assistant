import { render, waitFor } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';
import { flushReportQueue } from '@/services/reports';

import { ReportSync } from '../report-sync';

jest.mock('@/services/reports', () => ({
  appReportsApi: { send: jest.fn() },
  flushReportQueue: jest.fn(),
}));

const flush = jest.mocked(flushReportQueue);

describe('ReportSync', () => {
  it('sends the queued reports once when the shell opens, and draws nothing', async () => {
    flush.mockResolvedValue(undefined);

    const { toJSON } = await render(<ReportSync />, { wrapper: QueryProvider });

    await waitFor(() => expect(flush).toHaveBeenCalledTimes(1));
    expect(toJSON()).toBeNull();
  });

  it('leaves a failed pass for the next one without crashing', async () => {
    flush.mockRejectedValue(new Error('offline'));

    await render(<ReportSync />, { wrapper: QueryProvider });

    await waitFor(() => expect(flush).toHaveBeenCalled());
  });
});
