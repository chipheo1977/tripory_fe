import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MapPin, MapToneDot, mapToneClass } from './map-pin';

describe('mapToneClass', () => {
  it.each([
    [1, 'bg-map-day-1'],
    [2, 'bg-map-day-2'],
    [8, 'bg-map-day-8'],
    [9, 'bg-map-day-1'],
    [16, 'bg-map-day-8'],
    [17, 'bg-map-day-1'],
    [0, 'bg-map-day-8'],
  ])('tone %i -> %s', (tone, expected) => {
    expect(mapToneClass(tone)).toBe(expected);
  });
});

const classesOf = (element: Element | null) => (element?.getAttribute('class') ?? '').split(/\s+/);

function renderPin(props: Partial<Parameters<typeof MapPin>[0]> = {}) {
  const { container } = render(<MapPin number={3} state="normal" tone={2} {...props} />);
  const root = container.firstElementChild as HTMLElement;
  return { root, dot: root.firstElementChild as HTMLElement };
}

describe('MapPin', () => {
  it('ẩn khỏi trình đọc màn hình, không có phần tử focus được', () => {
    const { root } = renderPin();

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('button, a, [tabindex]')).toHaveLength(0);
  });

  it('vùng chạm 48px và hiển thị số thứ tự', () => {
    const { root, dot } = renderPin({ number: 7 });

    expect(classesOf(root)).toContain('size-control-lg');
    expect(dot.textContent).toBe('7');
  });

  it('normal: vòng tròn 28px, màu theo tone, viền surface, không có nhãn', () => {
    const { dot } = renderPin({ label: { title: 'Chợ Bến Thành' }, tone: 3 });

    expect(classesOf(dot)).toEqual(
      expect.arrayContaining(['size-(--map-pin-size)', 'bg-map-day-3', 'border-2', 'border-surface']),
    );
    expect(document.body.textContent).not.toContain('Chợ Bến Thành');
  });

  it('selected: vòng tròn 36px có viền chọn, hiện nhãn tên và dòng chi tiết', () => {
    const { dot, root } = renderPin({ label: { title: 'Chợ Bến Thành', detail: 'Quận 1' }, state: 'selected' });

    expect(classesOf(dot)).toEqual(expect.arrayContaining(['size-(--map-pin-size-selected)', 'ring-2', 'ring-text']));
    expect(root.textContent).toContain('Chợ Bến Thành');
    expect(root.textContent).toContain('Quận 1');
    const label = [...root.querySelectorAll('span')].find((span) => span.textContent?.includes('Chợ Bến Thành') && span.children.length > 0);
    expect(classesOf(label ?? null)).toEqual(expect.arrayContaining(['max-w-(--map-label-max-width)', 'pointer-events-none']));
  });

  it('selected không có nhãn thì chỉ có số', () => {
    const { root } = renderPin({ state: 'selected' });

    expect(root.textContent).toBe('3');
  });

  it('nhãn là text node, không phải HTML', () => {
    const { root } = renderPin({ label: { title: '<img src=x onerror=alert(1)>' }, state: 'selected' });

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('dimmed: mờ và không nhận chuột', () => {
    const { root } = renderPin({ state: 'dimmed' });

    expect(classesOf(root)).toEqual(expect.arrayContaining(['opacity-(--map-dimmed-opacity)', 'pointer-events-none']));
  });

  it('truyền tiếp className', () => {
    const { root } = renderPin({ className: 'extra' });

    expect(classesOf(root)).toContain('extra');
  });
});

describe('MapToneDot', () => {
  it('chấm 12px, aria-hidden, màu theo tone', () => {
    const { container } = render(<MapToneDot tone={9} />);
    const dot = container.firstElementChild;

    expect(dot?.getAttribute('aria-hidden')).toBe('true');
    expect(classesOf(dot ?? null)).toEqual(expect.arrayContaining(['size-(--map-day-dot-size)', 'rounded-pill', 'bg-map-day-1']));
  });
});
