import { fireEvent, render, screen } from '@testing-library/react-native';

import { MapListToggle } from '../map-list-toggle';

describe('MapListToggle', () => {
  it('returns from a floating list control to the map without inventing a download action', async () => {
    const onChange = jest.fn();

    await render(<MapListToggle floating onChange={onChange} view="list" />);

    expect(screen.queryByRole('button', { name: 'Offline maps and downloads' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show map' }));
    expect(onChange).toHaveBeenCalledWith('map');
  });

  it('keeps the floating download action separate from switching to the list', async () => {
    const onChange = jest.fn();
    const onOpenDownloads = jest.fn();

    await render(
      <MapListToggle floating onChange={onChange} onOpenDownloads={onOpenDownloads} view="map" />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Offline maps and downloads' }));
    expect(onOpenDownloads).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Show zone list' }));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('keeps the explanatory map row and its optional download destination operable', async () => {
    const onChange = jest.fn();
    const onOpenDownloads = jest.fn();

    await render(
      <MapListToggle onChange={onChange} onOpenDownloads={onOpenDownloads} view="map" />,
    );

    expect(screen.getByText('Map selected')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Show zone list' }));
    expect(onChange).toHaveBeenCalledWith('list');

    await fireEvent.press(screen.getByRole('button', { name: 'Offline maps and downloads' }));
    expect(onOpenDownloads).toHaveBeenCalledTimes(1);
  });
});
