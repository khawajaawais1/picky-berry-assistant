import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { Session } from '@/services/session';

import { SessionRestore } from '../session-restore';

// `Redirect` is the router's declarative navigation; the assertion is that it is asked for the
// map, not that this component knows how to navigate.
jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
  };
});

const SESSION: Session = {
  accountId: 'aino@example.fi',
  displayName: null,
  expiresAt: '2026-08-03T08:00:00.000Z',
  issuedAt: '2026-08-03T07:00:00.000Z',
};

async function renderGate(state: { loading: boolean; error: boolean; session: Session | null }) {
  return render(
    <SessionRestore state={state}>
      <Text>welcome</Text>
    </SessionRestore>,
  );
}

describe('SessionRestore', () => {
  it('claims nothing while the store is still being read', async () => {
    await renderGate({ error: false, loading: true, session: null });

    expect(screen.getByTestId('session-restoring')).toBeOnTheScreen();
    expect(screen.queryByText('welcome')).not.toBeOnTheScreen();
  });

  it('lands a returning picker on the map instead of onboarding', async () => {
    await renderGate({ error: false, loading: false, session: SESSION });

    expect(screen.getByText('redirect:/discover')).toBeOnTheScreen();
    expect(screen.queryByText('welcome')).not.toBeOnTheScreen();
  });

  it('draws the welcome screen when the device holds no session', async () => {
    await renderGate({ error: false, loading: false, session: null });

    expect(screen.getByText('welcome')).toBeOnTheScreen();
    expect(screen.queryByText('redirect:/discover')).not.toBeOnTheScreen();
  });

  it('falls back to the welcome screen when the store could not answer', async () => {
    // A store that will not read is recoverable by signing in again; a blank launch is not.
    await renderGate({ error: true, loading: false, session: null });

    expect(screen.getByText('welcome')).toBeOnTheScreen();
  });
});
