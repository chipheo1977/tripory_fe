// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BASEMAP_STYLE, OPENFREEMAP_GLYPHS_URL, OPENFREEMAP_TILEJSON_URL, SOVEREIGNTY_LABEL_TEXTS, SOVEREIGNTY_MASK } from './basemap-style';

type AnyLayer = Record<string, unknown> & { id: string; type: string };
const layers = BASEMAP_STYLE.layers as unknown as readonly AnyLayer[];

// Duyệt đệ quy mảng và object để tìm chuỗi, số và toán tử trong filter/biểu thức.
const walk = (value: unknown, visit: (node: unknown) => void): void => {
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) walk(item, visit);
  }
};

const collect = (value: unknown, predicate: (node: unknown) => boolean): unknown[] => {
  const found: unknown[] = [];
  walk(value, (node) => {
    if (predicate(node)) found.push(node);
  });
  return found;
};

const containsString = (value: unknown, text: string): boolean => collect(value, (node) => node === text).length > 0;
const layout = (layer: AnyLayer) => (layer.layout ?? {}) as Record<string, unknown>;
const sourceLayerOf = (layer: AnyLayer) => layer['source-layer'] as string | undefined;

const symbolLayers = layers.filter((layer) => layer.type === 'symbol');
const vectorSymbolLayers = symbolLayers.filter((layer) => layer.source === 'openmaptiles');

const VI_NAME = ['coalesce', ['get', 'name:vi'], ['get', 'name']];

type Ring = readonly (readonly [number, number])[];
const insideRing = (ring: Ring, lng: number, lat: number): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
};
const insideMask = ([lng, lat]: readonly [number, number]): boolean =>
  SOVEREIGNTY_MASK.coordinates.some((polygon) => insideRing(polygon[0] as Ring, lng, lat));

describe('BASEMAP_STYLE: nguồn và tài nguyên', () => {
  it('trỏ TileJSON và glyph của OpenFreeMap, không ghi cứng đường tile', () => {
    expect(BASEMAP_STYLE.sources.openmaptiles).toEqual({ type: 'vector', url: 'https://tiles.openfreemap.org/planet' });
    expect(OPENFREEMAP_TILEJSON_URL).toBe('https://tiles.openfreemap.org/planet');
    expect(BASEMAP_STYLE.glyphs).toBe('https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf');
    expect(OPENFREEMAP_GLYPHS_URL).toBe(BASEMAP_STYLE.glyphs);
    expect(JSON.stringify(BASEMAP_STYLE)).not.toMatch(/\/planet\/\d|styles\/(liberty|positron|bright)/u);
  });

  it('không có sprite và không chứa khóa hay token', () => {
    expect('sprite' in BASEMAP_STYLE).toBe(false);
    expect(JSON.stringify(BASEMAP_STYLE)).not.toMatch(/api_key|key=|token/iu);
  });

  it('chỉ dùng cỡ chữ 14 hoặc 16 và font Noto Sans Regular/Bold', () => {
    for (const layer of symbolLayers) {
      const sizes = collect(layout(layer)['text-size'], (node) => typeof node === 'number');
      expect(sizes.length, layer.id).toBeGreaterThan(0);
      for (const size of sizes) expect([14, 16], layer.id).toContain(size);

      expect(['Noto Sans Regular', 'Noto Sans Bold'], layer.id).toContain((layout(layer)['text-font'] as string[])[0]);
    }
  });
});

describe('BASEMAP_STYLE: chủ quyền Hoàng Sa, Trường Sa (D-113)', () => {
  it('mọi lớp chữ lấy name:vi rồi name (trừ nhãn riêng)', () => {
    for (const layer of vectorSymbolLayers) {
      expect(layout(layer)['text-field'], layer.id).toEqual(VI_NAME);
    }
  });

  it('mọi lớp ranh giới lọc maritime, disputed, claimed_by và vùng', () => {
    const boundaries = layers.filter((layer) => sourceLayerOf(layer) === 'boundary');

    expect(boundaries.length).toBeGreaterThan(0);
    for (const layer of boundaries) {
      for (const needle of ['maritime', 'disputed', 'claimed_by', 'within']) {
        expect(containsString(layer.filter, needle), `${layer.id} thiếu ${needle}`).toBe(true);
      }
    }
  });

  it('không có lớp ranh giới tranh chấp', () => {
    expect(layers.some((layer) => /disputed/u.test(layer.id))).toBe(false);
  });

  it('mọi lớp chữ từ tile (place, water_name, transportation_name) lọc đúng vùng SOVEREIGNTY_MASK', () => {
    expect(vectorSymbolLayers.length).toBeGreaterThan(0);
    for (const layer of vectorSymbolLayers) {
      const masks = collect(layer.filter, (node) => JSON.stringify(node) === JSON.stringify(SOVEREIGNTY_MASK));
      expect(masks.length, layer.id).toBeGreaterThan(0);
      expect(containsString(layer.filter, 'within'), layer.id).toBe(true);
    }
    const sourceLayers = new Set(vectorSymbolLayers.map(sourceLayerOf));
    expect(sourceLayers).toEqual(new Set(['place', 'water_name', 'transportation_name']));
  });

  it('không vẽ POI, sân bay, đỉnh núi, số nhà; công viên chỉ là lớp fill', () => {
    const banned = ['poi', 'aerodrome_label', 'mountain_peak', 'housenumber'];

    expect(layers.filter((layer) => banned.includes(sourceLayerOf(layer) ?? ''))).toEqual([]);
    expect(layers.filter((layer) => sourceLayerOf(layer) === 'park').map((layer) => layer.type)).toEqual(['fill']);
  });

  it('có đúng hai nhãn riêng với chuỗi và tọa độ cố định', () => {
    const source = BASEMAP_STYLE.sources['sovereignty-labels'] as {
      type: string;
      data: { features: { properties: { text: string }; geometry: { type: string; coordinates: number[] } }[] };
    };

    expect(source.type).toBe('geojson');
    expect(source.data.features.map((feature) => [feature.properties.text, feature.geometry.type, feature.geometry.coordinates])).toEqual([
      ['Quần đảo Hoàng Sa (Việt Nam)', 'Point', [112.0, 16.5]],
      ['Quần đảo Trường Sa (Việt Nam)', 'Point', [114.5, 10.0]],
    ]);
    expect([...SOVEREIGNTY_LABEL_TEXTS]).toEqual(['Quần đảo Hoàng Sa (Việt Nam)', 'Quần đảo Trường Sa (Việt Nam)']);
  });

  it('lớp nhãn riêng hiện tới zoom 10, không bị nhãn khác che và là lớp symbol cuối cùng', () => {
    const layer = layers.find((candidate) => candidate.id === 'sovereignty-labels');

    expect(layer).toBeDefined();
    expect(layer?.maxzoom).toBe(10);
    expect(layout(layer as AnyLayer)['text-allow-overlap']).toBe(true);
    expect(layout(layer as AnyLayer)['text-ignore-placement']).toBe(true);
    expect(symbolLayers.at(-1)?.id).toBe('sovereignty-labels');
  });

  it('nhãn riêng nằm trong mask, vì vậy nhãn OSM cùng chỗ bị lọc', () => {
    expect(insideMask([112.0, 16.5])).toBe(true);
    expect(insideMask([114.5, 10.0])).toBe(true);
  });

  it.each([
    ['Tam Sa / Quận Tây Sa', [112.334, 16.832]],
    ['Hoàng Sa (đảo Phú Lâm)', [111.743, 16.465]],
    ['Quận Nam Sa', [112.887, 9.545]],
    ['Kalayaan', [114.285, 11.054]],
    ['Ba Bình (vòng TWN)', [114.071, 10.91]],
    ['Zhubi', [114.365, 10.377]],
  ] as const)('điểm mẫu trong tile %s nằm trong mask', (_name, point) => {
    expect(insideMask([point[0], point[1]])).toBe(true);
  });

  it.each([
    ['Phú Quý', [108.93, 10.52]],
    ['Côn Đảo', [106.61, 8.68]],
    ['Lý Sơn', [109.13, 15.38]],
    ['Mũi Đôi', [109.46, 12.65]],
    ['bờ Hải Nam', [109.5, 18.2]],
    ['Kudat (Sabah)', [116.85, 6.88]],
    ['Balabac', [117.02, 7.94]],
    ['Palawan', [118.7, 9.8]],
  ] as const)('đất liền và đảo Việt Nam/nước khác %s nằm ngoài mask', (_name, point) => {
    expect(insideMask([point[0], point[1]])).toBe(false);
  });
});
