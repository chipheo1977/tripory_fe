import { cn } from '../lib/cn';

/** Số màu trong bảng màu theo ngày (khớp token `--map-day-1..8`). */
export type MapTone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Bảng tĩnh để Tailwind thấy đủ 8 class; không ghép chuỗi động.
const TONE_CLASSES = [
  'bg-map-day-1',
  'bg-map-day-2',
  'bg-map-day-3',
  'bg-map-day-4',
  'bg-map-day-5',
  'bg-map-day-6',
  'bg-map-day-7',
  'bg-map-day-8',
] as const;

/** `tone` ngoài 1..8 quy về `((tone - 1) mod 8) + 1`, nên ngày 9 dùng lại màu ngày 1 (D-123). */
export const mapToneClass = (tone: number): string => {
  const index = (((Math.trunc(tone) - 1) % TONE_CLASSES.length) + TONE_CLASSES.length) % TONE_CLASSES.length;
  return TONE_CLASSES[index] ?? TONE_CLASSES[0];
};

export type MapPinState = 'normal' | 'selected' | 'dimmed';

const ROOT_CLASS: Readonly<Record<MapPinState, string>> = {
  normal: 'cursor-pointer',
  selected: 'cursor-pointer',
  dimmed: 'pointer-events-none opacity-(--map-dimmed-opacity)',
};

const DOT_CLASS: Readonly<Record<MapPinState, string>> = {
  normal: 'size-(--map-pin-size) shadow-sm hover:shadow-md',
  selected: 'size-(--map-pin-size-selected) shadow-md ring-2 ring-text',
  dimmed: 'size-(--map-pin-size) shadow-sm',
};

export type MapPinProps = Readonly<{
  /** Số thứ tự trong ngày, hiển thị trong vòng tròn. */
  number: number;
  tone: number;
  state: MapPinState;
  /** Nhãn tên cạnh pin, chỉ hiện khi `state` là `selected` (D-125, D-136). */
  label?: Readonly<{ title: string; detail?: string }>;
  className?: string;
}>;

function DetailLine({ text }: Readonly<{ text: string | undefined }>) {
  if (text === undefined || text === '') return null;
  return <span className="truncate text-label text-muted">{text}</span>;
}

function MapPinLabel({ visible, label }: Readonly<{ visible: boolean; label: MapPinProps['label'] }>) {
  if (!visible || label === undefined) return null;
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 mb-inline-sm flex max-w-(--map-label-max-width) -translate-x-1/2 flex-col rounded-control border border-border bg-surface-elevated px-inline-sm py-inline-xs text-left text-text shadow-md">
      <span className="truncate text-label font-semibold">{label.title}</span>
      <DetailLine text={label.detail} />
    </span>
  );
}

/**
 * Pin số trên bản đồ. Chỉ để nhìn: `aria-hidden`, không nhận focus; đường bàn phím và trình đọc màn hình là danh sách điểm (D-128).
 * Vùng chạm 48px (`size-control-lg`) lớn hơn vòng tròn 28/36px.
 */
export function MapPin({ number, tone, state, label, className }: MapPinProps) {
  return (
    <div aria-hidden="true" className={cn('relative flex size-control-lg items-center justify-center', ROOT_CLASS[state], className)}>
      <span
        className={cn(
          'flex items-center justify-center rounded-pill border-2 border-surface text-label font-semibold tabular-nums text-text-inverse transition-[width,height] duration-(--semantic-motion-duration-fast) ease-standard',
          mapToneClass(tone),
          DOT_CLASS[state],
        )}
      >
        {number}
      </span>
      <MapPinLabel label={label} visible={state === 'selected'} />
    </div>
  );
}

/** Chấm màu ngày 12px dùng ở tab ngày và dòng ngày (D-123, D-135). Màu không phải kênh duy nhất nên `aria-hidden`. */
export function MapToneDot({ tone, className }: Readonly<{ tone: number; className?: string }>) {
  return <span aria-hidden="true" className={cn('inline-block size-(--map-day-dot-size) shrink-0 rounded-pill', mapToneClass(tone), className)} />;
}
