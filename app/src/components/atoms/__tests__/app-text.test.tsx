import { render, screen } from '@testing-library/react-native';

import { themes } from '@/constants/theme';

import { AppText } from '../app-text';

describe('AppText', () => {
  it('renders its content', async () => {
    await render(<AppText>Hello berries</AppText>);

    expect(screen.getByText('Hello berries')).toBeOnTheScreen();
  });

  it('uses the default tone colour', async () => {
    await render(<AppText>Default</AppText>);

    expect(screen.getByText('Default')).toHaveStyle({ color: themes.light.colors.text });
  });

  it('maps a tone to its palette colour', async () => {
    await render(<AppText tone="danger">Failed</AppText>);

    expect(screen.getByText('Failed')).toHaveStyle({ color: themes.light.colors.danger });
  });

  it('applies the typography variant', async () => {
    await render(<AppText variant="caption">Small print</AppText>);

    expect(screen.getByText('Small print')).toHaveStyle({ fontSize: 13 });
  });

  it('lets a caller override the tone colour with an explicit style', async () => {
    await render(
      <AppText tone="danger" style={{ color: '#123456' }}>
        Overridden
      </AppText>,
    );

    expect(screen.getByText('Overridden')).toHaveStyle({ color: '#123456' });
  });
});
