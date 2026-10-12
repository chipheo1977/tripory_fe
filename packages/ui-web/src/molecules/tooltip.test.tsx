import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, tooltipDelay } from './tooltip';

function ExampleTooltip({ side = 'top' }: { side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger aria-label="Sao chép">Sao chép</TooltipTrigger>
        <TooltipContent side={side}>Sao chép liên kết</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

it('dùng delay 400ms và hỗ trợ bốn vị trí', () => {
  expect(tooltipDelay).toBe(400);
  const { rerender } = render(<ExampleTooltip side="top" />);
  for (const side of ['right', 'bottom', 'left'] as const) rerender(<ExampleTooltip side={side} />);
  expect(screen.getByRole('button', { name: 'Sao chép' })).toBeTruthy();
});

it('mở bằng focus, liên kết mô tả và đóng bằng Escape với focus giữ ở trigger', async () => {
  const user = userEvent.setup();
  render(<ExampleTooltip side="right" />);
  const trigger = screen.getByRole('button', { name: 'Sao chép' });

  await user.tab();
  const tooltip = await screen.findByRole('tooltip');
  expect(tooltip.textContent).toBe('Sao chép liên kết');
  expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('tooltip')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it('mở bằng hover', async () => {
  const user = userEvent.setup();
  render(<ExampleTooltip />);
  await user.hover(screen.getByRole('button', { name: 'Sao chép' }));
  expect(await screen.findByRole('tooltip', {}, { timeout: 1000 })).toBeTruthy();
});
