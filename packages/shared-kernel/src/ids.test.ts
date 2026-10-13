import { describe, expect, expectTypeOf, it } from 'vitest';
import { isGuid, parseItineraryId, parseUserId, type ItineraryId, type UserId } from './ids';

const LOWER = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

describe('Branded id dạng GUID', () => {
  it('chuẩn hóa GUID chữ hoa về chữ thường', () => {
    expect(parseUserId('3F2504E0-4F89-11D3-9A0C-0305E82C3301')).toBe(LOWER);
    expect(parseItineraryId('3F2504E0-4F89-11D3-9A0C-0305E82C3301')).toBe(LOWER);
  });

  it('bỏ khoảng trắng hai đầu trước khi kiểm', () => {
    expect(parseItineraryId(`  ${LOWER}  `)).toBe(LOWER);
    expect(parseUserId(`\t${LOWER.toUpperCase()}\n`)).toBe(LOWER);
  });

  it.each([
    [''],
    ['abc'],
    ['3f2504e0-4f89-11d3-9a0c-0305e82c330'],
    ['{3f2504e0-4f89-11d3-9a0c-0305e82c3301}'],
    ['3f2504e0-4f89-11d3-9a0c-0305e82c3301x'],
    ['3f2504e0-4f89-11d3-9a0c-0305e82c330g'],
    ['3f2504e04f8911d39a0c0305e82c3301'],
  ] as const)('trả null với chuỗi không phải GUID: "%s"', (value) => {
    expect(parseUserId(value)).toBeNull();
    expect(parseItineraryId(value)).toBeNull();
  });

  it('không kiểm version nibble', () => {
    expect(isGuid('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('không gán chéo branded id', () => {
    expectTypeOf<UserId>().not.toExtend<ItineraryId>();
    expectTypeOf<ItineraryId>().not.toExtend<UserId>();
    expectTypeOf<string>().not.toExtend<UserId>();
    expectTypeOf<UserId>().toExtend<string>();

    const acceptUserId = (id: UserId) => id;
    // @ts-expect-error chuỗi trần phải đi qua parseUserId trước
    expect(acceptUserId('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe(LOWER);
  });
});
