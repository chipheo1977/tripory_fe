import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Map } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl, SegmentedControlItem } from './segmented-control';

type ExampleProps = { onChange?: (value: string) => void; initial?: string; className?: string };

function Example({ onChange, initial = 'article', className }: ExampleProps) {
  const [value, setValue] = useState(initial);
  return (
    <SegmentedControl
      aria-label="Chế độ xem"
      className={className}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      value={value}
    >
      <SegmentedControlItem value="article">Bài viết</SegmentedControlItem>
      <SegmentedControlItem icon={Map} iconClassName="icon-extra" value="map">
        Bản đồ
      </SegmentedControlItem>
    </SegmentedControl>
  );
}

describe('SegmentedControl', () => {
  it('đoạn đang chọn có aria-pressed true và data-pressed', () => {
    render(<Example />);
    const article = screen.getByRole('button', { name: 'Bài viết' });
    const map = screen.getByRole('button', { name: 'Bản đồ' });
    expect(article.getAttribute('aria-pressed')).toBe('true');
    expect(article.hasAttribute('data-pressed')).toBe(true);
    expect(map.getAttribute('aria-pressed')).toBe('false');
  });

  it('bấm đoạn khác gọi onValueChange một lần với giá trị mới', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Bản đồ' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('map');
  });

  it('bấm lại đoạn đang chọn không gọi onValueChange và không bỏ chọn', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const article = screen.getByRole('button', { name: 'Bài viết' });
    await user.click(article);
    expect(onChange).not.toHaveBeenCalled();
    expect(article.getAttribute('aria-pressed')).toBe('true');
  });

  it('mũi tên chỉ di chuyển focus, không tự chọn', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const article = screen.getByRole('button', { name: 'Bài viết' });
    const map = screen.getByRole('button', { name: 'Bản đồ' });
    article.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(map);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Space chọn đoạn đang focus', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const map = screen.getByRole('button', { name: 'Bản đồ' });
    map.focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith('map');
  });

  it('Enter chọn đoạn đang focus', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const map = screen.getByRole('button', { name: 'Bản đồ' });
    map.focus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('map');
  });

  it('Tab vào nhóm chỉ dừng một lần', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <button type="button">Sau nhóm</button>
      </>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bài viết' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sau nhóm' }));
  });

  it('nhóm có tên truy cập', () => {
    render(<Example />);
    expect(screen.getByRole('group', { name: 'Chế độ xem' })).toBeTruthy();
  });

  it('className vào nhóm cùng khung pill, icon ẩn với trình đọc và nhận iconClassName', () => {
    render(<Example className="shadow-overlay" />);
    const group = screen.getByRole('group', { name: 'Chế độ xem' });
    expect(group.className).toContain('shadow-overlay');
    expect(group.className).toContain('rounded-pill');
    expect(group.className).toContain('border-border');
    const svg = screen.getByRole('button', { name: 'Bản đồ' }).querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('class')).toContain('icon-extra');
  });
});
