"use client";

// Trang "Lịch trình của tôi" (ITIN-01, 02, 12; D-01..D-10, D-42): Tabs theo `?status=`, lưới thẻ, cuộn vô hạn.
// D-02: cuối lưới KHÔNG có nút nạp thêm và KHÔNG có UI lỗi/thử lại khi trang kế thất bại; chỉ lỗi trang đầu mới
// hiện ErrorState. Sentinel chỉ gọi `fetchNextPage` khi nó đi từ ngoài vào trong viewport, nên trang kế lỗi sẽ được
// thử lại khi người dùng cuộn ra rồi vào lại, không tự lặp vô hạn.
import { parseStatusFilter, STATUS_FILTERS, type ItinerarySummary, type StatusFilter } from "@tripory/itinerary";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
} from "@tripory/ui-web";
import { Map as MapIcon, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { itinerary } from "@/composition/itinerary.client";
import { CreateItineraryDialog } from "./create-itinerary-dialog";
import { DeleteItineraryDialog, type DeleteTarget } from "./delete-itinerary-dialog";
import { ItineraryCard } from "./itinerary-card";

const TAB_LABELS: Readonly<Record<StatusFilter, string>> = {
  all: "Tất cả",
  draft: "Nháp",
  published: "Đã xuất bản",
};

const EMPTY_COPY: Readonly<Record<StatusFilter, Readonly<{ heading: string; body: string }>>> = {
  all: {
    heading: "Chưa có lịch trình nào",
    body: "Tạo lịch trình đầu tiên để lên kế hoạch cho chuyến đi của bạn.",
  },
  draft: { heading: "Chưa có bản nháp nào", body: "Lịch trình chưa xuất bản sẽ nằm ở đây." },
  published: {
    heading: "Chưa xuất bản lịch trình nào",
    body: "Lịch trình đã xuất bản sẽ nằm ở đây. Ai có link đều xem được.",
  },
};

const GRID_CLASS = "grid grid-cols-1 gap-stack-md sm:grid-cols-2 lg:grid-cols-3 lg:gap-stack-lg";

/** Cùng một lịch trình có thể nằm ở hai trang khi dữ liệu dịch chuyển giữa các lần tải (Pitfall 6). */
function dedupeById(items: readonly ItinerarySummary[]): ItinerarySummary[] {
  const seen = new Set<string>();
  const result: ItinerarySummary[] = [];
  for (const entry of items) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    result.push(entry);
  }
  return result;
}

function CardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-container border border-border bg-surface"
      data-slot="itinerary-card-skeleton"
    >
      <Skeleton className="aspect-(--itinerary-cover-ratio) h-auto rounded-none" variant="block" />
      <div className="flex flex-col gap-stack-sm p-stack-md">
        <Skeleton variant="text" />
        <Skeleton className="w-2/3" variant="text" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count }: Readonly<{ count: number }>) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Khung chờ của cả trang (fallback Suspense của `useSearchParams`). */
export function MyItinerariesSkeleton() {
  return (
    <div className="flex flex-col gap-stack-lg">
      <Skeleton className="w-60" variant="text" />
      <SkeletonGrid count={6} />
      <p className="sr-only" role="status">
        Đang tải lịch trình…
      </p>
    </div>
  );
}

type PendingFocus = Readonly<{ kind: "card"; id: string }> | Readonly<{ kind: "cta" }>;

export function MyItinerariesView() {
  const router = useRouter();
  const params = useSearchParams();
  const status = parseStatusFilter(params.get("status"));
  const query = itinerary.useMyItineraries(status);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  // Thẻ vừa xóa biến mất ngay, không chờ refetch của danh sách (D-42).
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(() => new Set());

  const allItems = dedupeById(query.data?.pages.flatMap((entry) => entry.items) ?? []);
  const items = allItems.filter((entry) => !removedIds.has(entry.id));
  const firstPageError = query.isError && query.data === undefined;

  // --- Cuộn vô hạn -------------------------------------------------------------------------------------------
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const latest = useRef({ hasNextPage, isFetchingNextPage, fetchNextPage });
  useEffect(() => {
    latest.current = { hasNextPage, isFetchingNextPage, fetchNextPage };
  });

  // Đăng ký MỘT lần; trạng thái mới nhất đọc qua `latest` nên observer không bị dựng lại mỗi lần render.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (sentinel === null || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry === undefined) return;
        visibleRef.current = entry.isIntersecting;
        const current = latest.current;
        if (entry.isIntersecting && current.hasNextPage && !current.isFetchingNextPage) {
          void current.fetchNextPage();
        }
      },
      { rootMargin: "0px 0px 400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // IntersectionObserver chỉ báo khi giao nhau THAY ĐỔI: nếu sentinel vẫn nằm trong viewport sau khi một trang
  // vừa nạp xong (màn hình cao), phải tự nạp tiếp. Chỉ chạy khi số thẻ đổi nên trang kế lỗi (số thẻ giữ nguyên)
  // không tạo vòng thử lại (D-02).
  const loadedCount = allItems.length;
  useEffect(() => {
    const current = latest.current;
    if (visibleRef.current && current.hasNextPage && !current.isFetchingNextPage) void current.fetchNextPage();
  }, [loadedCount]);

  // --- Focus sau khi xóa (D-42) ------------------------------------------------------------------------------
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const headerCtaRef = useRef<HTMLButtonElement | null>(null);
  const emptyCtaRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocus = useRef<PendingFocus | null>(null);

  const applyPendingFocus = () => {
    const pending = pendingFocus.current;
    if (pending === null) return;
    const target = pending.kind === "card" ? linkRefs.current.get(pending.id) : (emptyCtaRef.current ?? headerCtaRef.current);
    if (target === null || target === undefined) return;
    target.focus();
    pendingFocus.current = null;
  };

  // Chạy sau mỗi lần danh sách hiển thị đổi: thẻ kế tiếp đã có sẵn, còn CTA chỉ có sau khi EmptyState render.
  const itemsKey = items.map((entry) => entry.id).join(",");
  useEffect(() => {
    applyPendingFocus();
  }, [itemsKey]);

  const handleDeleted = (id: string) => {
    const index = items.findIndex((entry) => entry.id === id);
    const neighbour = items[index + 1] ?? items[index - 1];
    pendingFocus.current = neighbour === undefined ? { kind: "cta" } : { kind: "card", id: neighbour.id };
    setRemovedIds((previous) => new Set(previous).add(id));
    // Dialog xóa đóng ngay sau `onDeleted` và có thể trả focus; áp dụng lại ở khung kế để focus cuối cùng là thẻ.
    requestAnimationFrame(applyPendingFocus);
  };

  const handleTabChange = (value: unknown) => {
    router.replace(`?status=${parseStatusFilter(typeof value === "string" ? value : null)}`, { scroll: false });
  };

  const openCreate = () => setCreateOpen(true);

  const renderContent = () => {
    if (query.isPending) {
      return (
        <>
          <SkeletonGrid count={6} />
          <p className="sr-only" role="status">
            Đang tải lịch trình…
          </p>
        </>
      );
    }
    if (firstPageError) return <ErrorState onRetry={() => void query.refetch()} variant="page" />;
    if (items.length === 0 && !hasNextPage) {
      const copy = EMPTY_COPY[status];
      return (
        <EmptyState
          action={
            status === "all" ? (
              <Button onClick={openCreate} ref={emptyCtaRef} variant="primary">
                <Icon icon={Plus} size="sm" />
                Tạo lịch trình
              </Button>
            ) : undefined
          }
          body={copy.body}
          heading={copy.heading}
          icon={<Icon icon={MapIcon} size="lg" />}
          variant="page"
        />
      );
    }
    return (
      <>
        <div className={GRID_CLASS}>
          {items.map((entry) => (
            <ItineraryCard
              key={entry.id}
              onDelete={(summary) =>
                setDeleteTarget({ id: summary.id, title: summary.title, isPublic: summary.isPublic })
              }
              summary={entry}
              titleLinkRef={(element) => {
                if (element === null) linkRefs.current.delete(entry.id);
                else linkRefs.current.set(entry.id, element);
              }}
            />
          ))}
          {isFetchingNextPage ? <SkeletonGrid count={3} /> : null}
        </div>
        {isFetchingNextPage ? (
          <p className="sr-only" role="status">
            Đang tải thêm lịch trình…
          </p>
        ) : null}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-stack-md">
        <h1 className="text-display font-semibold text-text">Lịch trình của tôi</h1>
        <Button onClick={openCreate} ref={headerCtaRef} size="md" variant="primary">
          <Icon icon={Plus} size="sm" />
          Tạo lịch trình
        </Button>
      </div>
      <Tabs onValueChange={handleTabChange} value={status} variant="line">
        <TabsList>
          {STATUS_FILTERS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {TAB_LABELS[value]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsPanel value={status}>{renderContent()}</TabsPanel>
      </Tabs>
      <div aria-hidden ref={sentinelRef} />
      <CreateItineraryDialog onOpenChange={setCreateOpen} open={createOpen} />
      <DeleteItineraryDialog
        onDeleted={handleDeleted}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        target={deleteTarget}
      />
    </div>
  );
}
