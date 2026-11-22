import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from '../Drawer';

describe('Drawer', () => {
  it('renders its content as a labelled dialog and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Drawer
        open
        title="Report detail"
        subtitle="A report from the field app"
        onClose={onClose}
      >
        <p>Bilberry, 2 stars</p>
      </Drawer>,
    );

    expect(
      screen.getByRole('dialog', { name: 'Report detail' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Bilberry, 2 stars')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('has a named close control and does not render when closed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open title="Report detail" onClose={onClose}>
        <p>Content</p>
      </Drawer>,
    );

    await user.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <Drawer open={false} title="Report detail" onClose={onClose}>
        <p>Content</p>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
