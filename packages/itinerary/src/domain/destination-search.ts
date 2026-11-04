import { POPULAR_GROUP_SIZE, type Destination } from './destination';

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const PUNCTUATION_AS_SPACE = /[.\-\u2013\u2014]/g;
const WHITESPACE_RUNS = /\s+/g;

/** Chuẩn hóa để so khớp không dấu: bỏ dấu, `đ` thành `d`, chữ thường, dấu câu thành khoảng trắng. */
export const normalizeSearchText = (input: string): string =>
  input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(PUNCTUATION_AS_SPACE, ' ')
    .replace(WHITESPACE_RUNS, ' ')
    .trim();

export type DestinationMatch = Readonly<{
  destination: Destination;
  matchedAlias: string | null;
}>;

type Ranked = Readonly<{ match: DestinationMatch; level: number; index: number }>;

const NO_RANK = Number.POSITIVE_INFINITY;

const rankOf = (destination: Destination): number => destination.popularityRank ?? NO_RANK;

const matchLevel = (name: string, query: string): number => {
  if (name.startsWith(query)) return 0;
  if (name.includes(query)) return 1;
  return -1;
};

const firstMatchingAlias = (destination: Destination, query: string): string | null =>
  destination.aliases.find((alias) => normalizeSearchText(alias).includes(query)) ?? null;

const rankDestination = (destination: Destination, index: number, query: string): Ranked | null => {
  const nameLevel = matchLevel(normalizeSearchText(destination.name), query);
  if (nameLevel >= 0) {
    return { match: { destination, matchedAlias: null }, level: nameLevel, index };
  }
  const alias = firstMatchingAlias(destination, query);
  if (alias === null) return null;
  return { match: { destination, matchedAlias: alias }, level: 2, index };
};

const compareRanked = (a: Ranked, b: Ranked): number => {
  if (a.level !== b.level) return a.level - b.level;
  const rankA = rankOf(a.match.destination);
  const rankB = rankOf(b.match.destination);
  if (rankA !== rankB) return rankA < rankB ? -1 : 1;
  return a.index - b.index;
};

/**
 * Tìm điểm đến theo tên rồi alias (không dấu). Mức 0: tên bắt đầu bằng từ khóa; 1: tên chứa;
 * 2: chỉ alias chứa. Cùng mức xếp theo hạng phổ biến (null sau cùng) rồi theo thứ tự khai báo.
 */
export const searchDestinations = (
  list: readonly Destination[],
  query: string,
): readonly DestinationMatch[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery === '') return Object.freeze([]);
  const ranked: Ranked[] = [];
  list.forEach((destination, index) => {
    const item = rankDestination(destination, index, normalizedQuery);
    if (item !== null) ranked.push(item);
  });
  ranked.sort(compareRanked);
  return Object.freeze(ranked.map((item) => item.match));
};

/** Nhóm "Phổ biến": các điểm đến có hạng, theo hạng tăng dần. */
export const popularDestinations = (
  list: readonly Destination[],
  size: number = POPULAR_GROUP_SIZE,
): readonly Destination[] => {
  const ranked = list.filter((destination) => destination.popularityRank !== null);
  ranked.sort((a, b) => rankOf(a) - rankOf(b));
  return Object.freeze(ranked.slice(0, size));
};
