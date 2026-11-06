// Style nền riêng của repo cho OpenFreeMap (D-111, D-112). Chỉ là dữ liệu: màu hex ở đây là màu bản đồ,
// không phải class UI (UI-SPEC §Style nền). Style KHÔNG chứa dữ liệu lịch trình (D-115): pin và đường
// là marker và nguồn GeoJSON do TripMap thêm lúc chạy.
//
// Chủ quyền Hoàng Sa, Trường Sa (D-113), đọc từ tile thật ngày 2026-11-05:
// - Lớp `place` trong hai vùng có nhãn do OSM gán cho phía khác ("Tam Sa", "Quận Tây Sa", "Quận Nam Sa",
//   "Kalayaan", tên đảo chữ Trung). Mọi lớp chữ đều lọc `["!", ["within", SOVEREIGNTY_MASK]]`.
// - Lớp `boundary` có đoạn `maritime=1`, `disputed=1`, `claimed_by` và 6 đoạn quanh đảo Ba Bình
//   (`admin_level=2, maritime=0`). Lớp ranh giới lọc cả ba thuộc tính lẫn vùng.
// - `within` chỉ áp được cho Point và LineString, nên style không vẽ nhãn park/aerodrome/POI/đỉnh núi.
// - Hai nhãn riêng của repo nằm ở nguồn GeoJSON `sovereignty-labels`, vẽ cuối cùng.
// Đổi nguồn tile sau này chỉ cần sửa hai hằng URL dưới đây (D-112).
import type { ExpressionSpecification, FilterSpecification, StyleSpecification } from 'maplibre-gl';

export const OPENFREEMAP_TILEJSON_URL = 'https://tiles.openfreemap.org/planet';
export const OPENFREEMAP_GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

export const SOVEREIGNTY_LABEL_TEXTS = ['Quần đảo Hoàng Sa (Việt Nam)', 'Quần đảo Trường Sa (Việt Nam)'] as const;

// Khung che hai quần đảo: ẩn mọi nhãn OSM và mọi ranh giới nằm trọn trong vùng này (D-113 mục 2, 3).
export const SOVEREIGNTY_MASK = {
  type: 'MultiPolygon',
  coordinates: [
    // Hoàng Sa: cách Hải Nam (mũi nam ~18.1°B) và bờ miền Trung (~109.5°Đ) đủ xa
    [
      [
        [110.5, 15.3],
        [113.3, 15.3],
        [113.3, 17.5],
        [110.5, 17.5],
        [110.5, 15.3],
      ],
    ],
    // Trường Sa: tránh bờ Sabah (Kudat 116.8°Đ 6.9°B), Balabac (117.0°Đ 7.9°B), Palawan; tránh Phú Quý/Côn Đảo ở phía tây
    [
      [
        [111.3, 6.2],
        [114.0, 6.2],
        [116.0, 7.2],
        [116.4, 8.0],
        [116.4, 12.0],
        [111.3, 12.0],
        [111.3, 6.2],
      ],
    ],
  ],
} as const;

const OUTSIDE_MASK = ['!', ['within', SOVEREIGNTY_MASK]] as unknown as ExpressionSpecification;
const NOT_MARITIME: ExpressionSpecification = ['!=', ['get', 'maritime'], 1];
const NOT_DISPUTED: ExpressionSpecification = ['!=', ['get', 'disputed'], 1];
const NOT_CLAIMED: ExpressionSpecification = ['!', ['has', 'claimed_by']];

const VI_NAME: ExpressionSpecification = ['coalesce', ['get', 'name:vi'], ['get', 'name']];

const classIn = (...classes: string[]): ExpressionSpecification => ['in', ['get', 'class'], ['literal', classes]];

const MAJOR_ROADS = classIn('motorway', 'trunk', 'primary', 'secondary');
const MINOR_ROADS = classIn('tertiary', 'minor', 'service');

const roadWidth = (minZoom: number, minWidth: number, maxZoom: number, maxWidth: number): ExpressionSpecification => [
  'interpolate',
  ['linear'],
  ['zoom'],
  minZoom,
  minWidth,
  maxZoom,
  maxWidth,
];

const TEXT_PAINT = { 'text-color': '#57534E', 'text-halo-color': '#FFFFFF', 'text-halo-width': 1 } as const;
const REGULAR_FONT = ['Noto Sans Regular'];
const BOLD_FONT = ['Noto Sans Bold'];

const boundaryFilter = (adminLevel: number): FilterSpecification => [
  'all',
  ['==', ['get', 'admin_level'], adminLevel],
  NOT_MARITIME,
  NOT_DISPUTED,
  NOT_CLAIMED,
  OUTSIDE_MASK,
];

export const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'tripory-light',
  glyphs: OPENFREEMAP_GLYPHS_URL,
  sources: {
    openmaptiles: { type: 'vector', url: OPENFREEMAP_TILEJSON_URL },
    'sovereignty-labels': {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { text: SOVEREIGNTY_LABEL_TEXTS[0] },
            geometry: { type: 'Point', coordinates: [112.0, 16.5] },
          },
          {
            type: 'Feature',
            properties: { text: SOVEREIGNTY_LABEL_TEXTS[1] },
            geometry: { type: 'Point', coordinates: [114.5, 10.0] },
          },
        ],
      },
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#F5F5F4' } },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#D4E4EE' },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      minzoom: 8,
      paint: { 'line-color': '#D4E4EE', 'line-width': 1 },
    },
    {
      id: 'park',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'park',
      minzoom: 8,
      paint: { 'fill-color': '#E6EEE3' },
    },
    {
      id: 'landcover-wood',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      minzoom: 8,
      filter: ['==', ['get', 'class'], 'wood'],
      paint: { 'fill-color': '#E6EEE3' },
    },
    {
      id: 'building',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 15,
      paint: { 'fill-color': '#EEECEA' },
    },
    {
      id: 'road-major-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 7,
      filter: MAJOR_ROADS,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#E7E5E4', 'line-width': roadWidth(6, 5, 14, 10) },
    },
    {
      id: 'road-major',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 7,
      filter: MAJOR_ROADS,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#FFFFFF', 'line-width': roadWidth(6, 3, 14, 8) },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 12,
      filter: MINOR_ROADS,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#FFFFFF', 'line-width': roadWidth(12, 1, 16, 4) },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: boundaryFilter(2),
      paint: { 'line-color': '#A8A29E', 'line-width': 1 },
    },
    {
      id: 'boundary-province',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      minzoom: 6,
      filter: boundaryFilter(4),
      paint: { 'line-color': '#D6D3D1', 'line-width': 1, 'line-dasharray': [2, 2] },
    },
    {
      id: 'label-water',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'water_name',
      filter: ['all', classIn('ocean', 'sea', 'bay', 'gulf', 'lake'), OUTSIDE_MASK],
      layout: {
        'text-field': VI_NAME,
        'text-font': REGULAR_FONT,
        'text-size': ['match', ['get', 'class'], ['ocean', 'sea'], 16, 14],
      },
      paint: { ...TEXT_PAINT, 'text-color': '#4B6475' },
    },
    {
      id: 'label-road',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 14,
      filter: OUTSIDE_MASK,
      layout: {
        'text-field': VI_NAME,
        'text-font': REGULAR_FONT,
        'text-size': 14,
        'symbol-placement': 'line',
      },
      paint: TEXT_PAINT,
    },
    {
      id: 'label-place-minor',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['all', classIn('village', 'town', 'suburb', 'quarter', 'neighbourhood'), OUTSIDE_MASK],
      layout: { 'text-field': VI_NAME, 'text-font': REGULAR_FONT, 'text-size': 14 },
      paint: TEXT_PAINT,
    },
    {
      id: 'label-place-major',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['all', classIn('city', 'state', 'province'), OUTSIDE_MASK],
      layout: { 'text-field': VI_NAME, 'text-font': REGULAR_FONT, 'text-size': 14 },
      paint: TEXT_PAINT,
    },
    {
      id: 'label-country',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['all', ['==', ['get', 'class'], 'country'], OUTSIDE_MASK],
      layout: { 'text-field': VI_NAME, 'text-font': BOLD_FONT, 'text-size': 16 },
      paint: TEXT_PAINT,
    },
    {
      id: 'sovereignty-labels',
      type: 'symbol',
      source: 'sovereignty-labels',
      maxzoom: 10,
      layout: {
        'text-field': ['get', 'text'],
        'text-font': BOLD_FONT,
        'text-size': 14,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { ...TEXT_PAINT, 'text-color': '#4B6475' },
    },
  ],
};
