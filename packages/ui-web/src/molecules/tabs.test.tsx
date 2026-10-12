import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTrigger } from './tabs';

function ExampleTabs({ variant = 'line' }: { variant?: 'line' | 'contained' }) {
  return (
    <Tabs defaultValue="overview" variant={variant}>
      <TabsList aria-label="Lịch trình">
        <TabsTrigger value="overview">Tổng quan</TabsTrigger>
        <TabsTrigger value="days">Theo ngày</TabsTrigger>
        <TabsTrigger value="notes">Ghi chú</TabsTrigger>
        <TabsIndicator />
      </TabsList>
      <TabsPanel value="overview">Nội dung tổng quan</TabsPanel>
      <TabsPanel value="days">Nội dung theo ngày</TabsPanel>
      <TabsPanel value="notes">Nội dung ghi chú</TabsPanel>
    </Tabs>
  );
}

it('render line/contained với role, selected state và indicator ngoài màu', () => {
  const { rerender } = render(<ExampleTabs />);
  const overview = screen.getByRole('tab', { name: 'Tổng quan' });
  expect(overview.getAttribute('aria-selected')).toBe('true');
  expect(screen.getByRole('tabpanel').textContent).toBe('Nội dung tổng quan');
  expect(document.querySelector('[data-tabs-indicator]')).toBeTruthy();

  rerender(<ExampleTabs variant="contained" />);
  expect(screen.getByRole('tablist').getAttribute('data-variant')).toBe('contained');
});

it('dùng roving focus với Arrow, Home và End', async () => {
  const user = userEvent.setup();
  render(<ExampleTabs />);
  const overview = screen.getByRole('tab', { name: 'Tổng quan' });
  const days = screen.getByRole('tab', { name: 'Theo ngày' });
  const notes = screen.getByRole('tab', { name: 'Ghi chú' });

  overview.focus();
  await user.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(days);
  expect(days.getAttribute('aria-selected')).toBe('true');
  await user.keyboard('{End}');
  expect(document.activeElement).toBe(notes);
  expect(notes.getAttribute('aria-selected')).toBe('true');
  await user.keyboard('{Home}');
  expect(document.activeElement).toBe(overview);
  expect(overview.getAttribute('aria-selected')).toBe('true');
});
