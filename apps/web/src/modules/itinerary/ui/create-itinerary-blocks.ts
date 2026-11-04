// Hàm thuần của form tạo 4 khối (D-63, D-69, D-72): thứ tự khối, khối lỗi đầu tiên, ô nhận focus, tóm tắt khối.
// Không React: container (04-37) và khối UI (04-34) gọi các hàm này.
import { formatCalendarDateVi, parseCalendarDate } from "@tripory/itinerary";
import { CREATE_TRIP_FIELDS } from "./form-schemas";

export type CreateTripField = (typeof CREATE_TRIP_FIELDS)[number];
export type CreateBlockId = "destination" | "name" | "dates" | "interests";

/** Thứ tự khối cố định (D-72). */
export const CREATE_BLOCKS: readonly CreateBlockId[] = ["destination", "name", "dates", "interests"];

export const BLOCK_TITLES: Readonly<Record<CreateBlockId, string>> = {
  destination: "Điểm đến",
  name: "Tên chuyến đi",
  dates: "Thời gian",
  interests: "Sở thích",
};

export const blockOfField: Readonly<Record<CreateTripField, CreateBlockId>> = {
  destinationCode: "destination",
  title: "name",
  startDate: "dates",
  dayCount: "dates",
  interests: "interests",
};

export type BlockErrors = Readonly<Partial<Record<CreateTripField, unknown>>>;

const hasError = (errors: BlockErrors, field: CreateTripField): boolean => errors[field] !== undefined;

/** Các khối có ít nhất một ô lỗi. */
export function invalidBlocks(errors: BlockErrors): ReadonlySet<CreateBlockId> {
  const blocks = new Set<CreateBlockId>();
  for (const field of CREATE_TRIP_FIELDS) {
    if (hasError(errors, field)) blocks.add(blockOfField[field]);
  }
  return blocks;
}

/** Khối lỗi đầu tiên theo thứ tự khối (không theo thứ tự khóa của `errors`). */
export function firstInvalidBlock(errors: BlockErrors): CreateBlockId | null {
  const invalid = invalidBlocks(errors);
  return CREATE_BLOCKS.find((block) => invalid.has(block)) ?? null;
}

const FIELD_OF_SIMPLE_BLOCK: Readonly<Record<Exclude<CreateBlockId, "dates">, CreateTripField>> = {
  destination: "destinationCode",
  name: "title",
  interests: "interests",
};

/** Ô nhận focus khi chuyển tới khối lỗi. Khối Thời gian ưu tiên ngày khởi hành nếu ô này lỗi. */
export function focusTargetOfBlock(block: CreateBlockId, errors: BlockErrors): CreateTripField {
  if (block !== "dates") return FIELD_OF_SIMPLE_BLOCK[block];
  if (hasError(errors, "startDate")) return "startDate";
  return "dayCount";
}

export type BlockSummaryInput = Readonly<{
  destinationName: string | null;
  title: string;
  startDate: string;
  dayCount: number;
  interestLabels: readonly string[];
}>;

function datesSummary(startDate: string, dayCount: number): string {
  const days = `${dayCount} ngày`;
  const parsed = parseCalendarDate(startDate.trim());
  if (parsed === null) return days;
  return `${days}, từ ${formatCalendarDateVi(parsed)}`;
}

function interestsSummary(labels: readonly string[]): string {
  if (labels.length === 0) return "Chưa chọn";
  return labels.join(", ");
}

/** Dòng tóm tắt hiện dưới tiêu đề khối khi khối đóng. */
export function blockSummary(block: CreateBlockId, input: BlockSummaryInput): string {
  if (block === "destination") return input.destinationName ?? "Chưa chọn";
  if (block === "name") {
    const title = input.title.trim();
    if (title === "") return "Chưa đặt tên";
    return title;
  }
  if (block === "dates") return datesSummary(input.startDate, input.dayCount);
  return interestsSummary(input.interestLabels);
}
