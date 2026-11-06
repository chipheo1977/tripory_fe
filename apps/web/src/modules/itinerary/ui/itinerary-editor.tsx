"use client";

// Container của trình chỉnh sửa lịch trình `/itineraries/{id}/edit` (RESEARCH Pattern 1; D-11, D-22, D-35, D-36, D-42,
// D-45..D-47). Dữ liệu tải ở client qua BFF (không có fetch phía RSC) để Bearer hết hạn được refresh rồi phát lại trước
// khi kết luận 403 (Pitfall 11). Nhánh theo trạng thái:
//   đang tải → EditorSkeleton · BE 404 → NotFoundView · BE 403 hoặc `canEdit` false → EditorForbidden ·
//   lỗi khác → ErrorState "Thử lại" · còn lại → editor đầy đủ.
// `canEdit` chỉ để ẩn thao tác trên UI; BE vẫn chặn mọi lệnh ghi của người không phải chủ (T-04-58).
//
// Có dữ liệu thì luôn hiện editor, kể cả khi lần tải lại nền lỗi: mất mạng thoáng qua không được làm mất form đang mở.
import { isApiError } from "@tripory/api-client";
import type { Viewer } from "@tripory/identity";
import { buildDayRange, canEdit, type Itinerary, type Waypoint } from "@tripory/itinerary";
import { ErrorState } from "@tripory/ui-web";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NavigationGuardProvider } from "@/components/navigation-guard";
import { NotFoundView } from "@/components/not-found-view";
import { itinerary as itineraryHooks } from "@/composition/itinerary.client";
import type { ItineraryId } from "@tripory/shared-kernel";
import { DeleteItineraryDialog, type DeleteTarget } from "./delete-itinerary-dialog";
import { draftPrefix, draftStorage } from "./draft-storage";
import { EditorForbidden } from "./editor-forbidden";
import { EditorHeader, EditorHeaderMinimal } from "./editor-header";
import { DayPanel } from "./day-panel";
import { DayTabs } from "./day-tabs";
import { EditorLayout } from "./editor-layout";
import { EditorSkeleton } from "./editor-skeleton";
import { clearEnteredFromList, enteredFromList } from "./entry-flag";
import { waypointSchema, type WaypointValues } from "./form-schemas";
import { useEditorLeaveGuard } from "./leave-guard";
import { PublishDialog } from "./publish-dialog";
import { createSaveStatusStore, SaveStatusProvider } from "./save-status";
import { TimelinePanel } from "./timeline-panel";
import { TripInfoDialog } from "./trip-info-dialog";
import { useMetadataAutosave } from "./use-metadata-autosave";
import { TripSummary } from "./trip-summary";
import { usePendingDelete } from "./use-pending-delete";
import { WaypointFormDialog, type WaypointFormMode } from "./waypoint-form-dialog";
import type { WaypointFocusRequest } from "./waypoint-list";

const MY_ITINERARIES = "/itineraries/mine";
const HIGHLIGHT_MS = 1500;
const TITLE_FALLBACK = "Sửa lịch trình · Tripory";

export type ItineraryEditorProps = Readonly<{
  itineraryId: ItineraryId;
  /**
   * Người đang đăng nhập: `canEdit` cần `id`, còn `UserMenu` ở header rút gọn (403/lỗi/tải) cần cả đối tượng. Page RSC truyền vào cùng `key`
   * theo `viewer.id` để đổi tài khoản không giữ lại state của người trước (Pitfall 4, T-04-61).
   */
  viewer: Viewer;
}>;

/** Nút back dùng chung cho mọi nhánh: vào từ danh sách thì lùi một bước, mở thẳng thì về danh sách (D-47). */
function navigateBack(router: ReturnType<typeof useRouter>): void {
  if (enteredFromList()) {
    // Cờ chỉ dùng một lần: nếu giữ, lần mở editor kế tiếp không đi từ danh sách vẫn bị `back()` nhầm.
    clearEnteredFromList();
    router.back();
  } else {
    router.push(MY_ITINERARIES);
  }
}

type RestoredDraft = Readonly<{
  form: Readonly<{ mode: WaypointFormMode; values: WaypointValues }> | null;
}>;

const NO_DRAFT: RestoredDraft = { form: null };

/**
 * Bản nháp form đã lưu khi phiên hết hạn (D-36): mở lại đúng form kèm nội dung. Khóa của điểm không còn tồn tại hoặc
 * ngày không còn trong dải thì bị xóa, không mở gì. `findFirst`/`load` đã tự dọn bản quá hạn hoặc sai schema.
 */
function readRestoredDraft(viewerId: string, itinerary: Itinerary): RestoredDraft {
  // Form metadata tự lưu nên không còn bản nháp (D-101, D-107); khóa `metadata` cũ trong storage được `findFirst` tự dọn.
  const found = draftStorage.findFirst(draftPrefix({ viewerId, itineraryId: itinerary.id }));
  if (found === null) return NO_DRAFT;

  if (found.kind.startsWith("add:")) {
    const dayNumber = Number(found.kind.slice("add:".length));
    if (!buildDayRange(itinerary).some((day) => day.dayNumber === dayNumber)) {
      draftStorage.remove(found.key);
      return NO_DRAFT;
    }
    const values = draftStorage.load(found.key, waypointSchema);
    return values === null ? NO_DRAFT : { form: { mode: { kind: "add", dayNumber }, values } };
  }
  const waypointId = found.kind.slice("edit:".length);
  const waypoint = itinerary.waypoints.find((candidate) => candidate.id === waypointId);
  if (waypoint === undefined) {
    draftStorage.remove(found.key);
    return NO_DRAFT;
  }
  const values = draftStorage.load(found.key, waypointSchema);
  return values === null ? NO_DRAFT : { form: { mode: { kind: "edit", waypoint }, values } };
}

type StatusShellProps = Readonly<{
  viewer: Viewer;
  onBack(): void;
  /** `false` khi nội dung tự đặt tiêu đề tài liệu (EditorForbidden). */
  withTitle?: boolean;
  children: ReactNode;
}>;

/** Khung cho các nhánh không phải editor: header rút gọn (không có thao tác sửa) + nội dung. */
function StatusShell({ viewer, onBack, withTitle = true, children }: StatusShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {withTitle ? <title>{TITLE_FALLBACK}</title> : null}
      <EditorHeaderMinimal onBack={onBack} title="Sửa lịch trình" viewer={viewer} />
      <main className="flex flex-1 flex-col px-page-inline py-page-block sm:px-page-inline-md lg:px-page-inline-lg">
        {children}
      </main>
    </div>
  );
}

/** Khung chờ kèm tiêu đề tài liệu chung (EditorSkeleton tự nó không đặt title). */
function LoadingView() {
  return (
    <>
      <title>{TITLE_FALLBACK}</title>
      <EditorSkeleton />
    </>
  );
}

export function ItineraryEditor(props: ItineraryEditorProps) {
  // Store chỉ báo lưu sống theo vòng đời editor; mọi hook ghi bên trong đọc nó qua context.
  const [store] = useState(createSaveStatusStore);
  return (
    <SaveStatusProvider store={store}>
      <EditorScreen {...props} />
    </SaveStatusProvider>
  );
}

function EditorScreen({ itineraryId, viewer }: ItineraryEditorProps) {
  const router = useRouter();
  const query = itineraryHooks.useItinerary(itineraryId);
  const [leaving, setLeaving] = useState(false);
  const back = useCallback(() => navigateBack(router), [router]);

  const { data } = query;

  // Vừa xóa lịch trình: query đã bị gỡ khỏi cache, tải lại sẽ ra 404. Giữ khung chờ cho tới khi điều hướng xong.
  if (leaving) return <LoadingView />;

  if (data === undefined) {
    if (query.isPending) return <LoadingView />;
    const status = isApiError(query.error) ? query.error.status : null;
    if (status === 404) {
      return (
        <StatusShell onBack={back} viewer={viewer}>
          <NotFoundView />
        </StatusShell>
      );
    }
    if (status === 403) {
      return (
        <StatusShell onBack={back} viewer={viewer} withTitle={false}>
          <EditorForbidden />
        </StatusShell>
      );
    }
    return (
      <StatusShell onBack={back} viewer={viewer}>
        <ErrorState className="flex-1" onRetry={() => void query.refetch()} variant="page" />
      </StatusShell>
    );
  }

  if (!canEdit(data, viewer.id)) {
    return (
      <StatusShell onBack={back} viewer={viewer} withTitle={false}>
        <EditorForbidden />
      </StatusShell>
    );
  }

  return <LoadedEditor itinerary={data} onDeleted={() => setLeaving(true)} viewer={viewer} />;
}

type LoadedEditorProps = Readonly<{
  itinerary: Itinerary;
  viewer: Viewer;
  onDeleted(): void;
}>;

function LoadedEditor({ itinerary, viewer, onDeleted }: LoadedEditorProps) {
  const router = useRouter();
  const itineraryId = itinerary.id;

  // Bản nháp chỉ đọc một lần lúc mount (editor chỉ dựng sau khi có dữ liệu, nên không chạy phía server).
  const [restored] = useState(() => readRestoredDraft(viewer.id, itinerary));

  const [selectedDay, setSelectedDay] = useState(() =>
    restored.form?.mode.kind === "add" ? restored.form.mode.dayNumber : 1,
  );
  const [formMode, setFormMode] = useState<WaypointFormMode | null>(restored.form?.mode ?? null);
  const [formRestored, setFormRestored] = useState<WaypointValues | null>(restored.form?.values ?? null);
  const [tripInfoOpen, setTripInfoOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<WaypointFocusRequest | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [focusMenuAfterPublish, setFocusMenuAfterPublish] = useState(false);

  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const tripInfoButtonRef = useRef<HTMLButtonElement | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tự lưu "Thông tin chuyến đi" sống ở cấp editor (dialog có thể unmount khi còn lệnh chờ); chưa lưu hết thì cảnh báo rời trang.
  const autosave = useMetadataAutosave(itineraryId);
  const leave = useEditorLeaveGuard({ itineraryId, formDirty: formDirty || autosave.state.dirty });
  const pending = usePendingDelete({
    itineraryId,
    onUndone: (waypointId) => setFocusRequest({ waypointId, target: "main" }),
  });
  const { pendingIds } = pending;

  useEffect(
    () => () => {
      if (highlightTimer.current !== null) clearTimeout(highlightTimer.current);
    },
    [],
  );

  // Xuất bản xong thì nút "Xuất bản" biến mất khi dữ liệu tải lại (isPublic true): trả focus về nút "i" của header.
  const { isPublic } = itinerary;
  useEffect(() => {
    if (!isPublic) return;
    if (!focusMenuAfterPublish) return;
    tripInfoButtonRef.current?.focus();
  }, [isPublic, focusMenuAfterPublish]);

  const days = useMemo(() => buildDayRange(itinerary), [itinerary]);
  // Ngày đang chọn có thể biến mất (thêm ngày lỗi bị hoàn lại): kẹp về ngày cuối của dải.
  const day = days.some((candidate) => candidate.dayNumber === selectedDay)
    ? selectedDay
    : (days.at(-1)?.dayNumber ?? 1);

  // `days` luôn có ít nhất Ngày 1; `day` đã kẹp vào dải nên luôn tìm thấy.
  const dayView = days.find((candidate) => candidate.dayNumber === day) ?? days[0]!;
  const flashHighlight = (waypointId: string): void => {
    if (highlightTimer.current !== null) clearTimeout(highlightTimer.current);
    setHighlightId(waypointId);
    highlightTimer.current = setTimeout(() => {
      highlightTimer.current = null;
      setHighlightId(null);
    }, HIGHLIGHT_MS);
  };

  const requestBack = () => leave.requestLeave(() => navigateBack(router));

  const openTripInfo = () => setTripInfoOpen(true);

  const handleTripInfoOpenChange = (open: boolean): void => {
    setTripInfoOpen(open);
  };

  const closeForm = (): void => {
    setFormMode(null);
    setFormRestored(null);
  };

  const openAdd = (dayNumber: number): void => {
    setFormRestored(null);
    setFormMode({ kind: "add", dayNumber });
  };

  const openEdit = (waypoint: Waypoint): void => {
    setFormRestored(null);
    setFormMode({ kind: "edit", waypoint });
  };

  // Chọn nơi nhận focus TRƯỚC khi điểm biến mất: thẻ kế tiếp, không có thì thẻ trước, không còn gì thì nút thêm (D-31).
  const removeWaypoint = (waypoint: Waypoint): void => {
    const shown = (days.find((candidate) => candidate.dayNumber === waypoint.dayNumber)?.waypoints ?? []).filter(
      (candidate) => !pendingIds.has(candidate.id),
    );
    const index = shown.findIndex((candidate) => candidate.id === waypoint.id);
    const neighbour = shown[index + 1] ?? shown[index - 1];
    setFocusRequest(
      neighbour === undefined
        ? { waypointId: null, target: "add" }
        : { waypointId: neighbour.id, target: "main" },
    );
    pending.remove(waypoint);
  };

  const handleAdded = (waypoint: Waypoint): void => {
    setLiveMessage(`Đã thêm ${waypoint.name} vào Ngày ${waypoint.dayNumber}`);
    flashHighlight(waypoint.id);
    setFocusRequest({ waypointId: null, target: "add" });
  };

  const deleteTarget = useMemo<DeleteTarget | null>(
    () => (deleteOpen ? { id: itineraryId, title: itinerary.title, isPublic: itinerary.isPublic } : null),
    [deleteOpen, itineraryId, itinerary.title, itinerary.isPublic],
  );

  const handleDeleteItinerary = (): void => {
    // Lệnh xóa điểm còn chờ phải đi trước, không thì nó bắn vào lịch trình đã mất.
    pending.flush();
    setDeleteOpen(true);
  };

  return (
    <NavigationGuardProvider value={leave.guard}>
      <title>{`${itinerary.title} · Tripory`}</title>
      <EditorLayout
        header={
          <EditorHeader
            itinerary={itinerary}
            onBack={requestBack}
            onDeleteItinerary={handleDeleteItinerary}
            onOpenTripInfo={openTripInfo}
            onRequestPublish={() => setPublishOpen(true)}
            pendingIds={pendingIds}
            tripInfoButtonRef={tripInfoButtonRef}
          />
        }
        map={(frame) => <TripSummary itinerary={itinerary} onEdit={openTripInfo} variant={frame.wide ? "canvas" : "compact"} />}
        timeline={
          <TimelinePanel
            tabs={
              <DayTabs
                itinerary={itinerary}
                onSelectTab={(tab) => {
                  if (tab !== "overview") setSelectedDay(tab);
                }}
                selectedTab={day}
              />
            }
          >
            <DayPanel
              addButtonRef={addButtonRef}
              day={dayView}
              feedback={{ highlightId, focusRequest }}
              itinerary={itinerary}
              list={{ onEdit: openEdit, onFlushPending: pending.flush, onRemove: removeWaypoint }}
              onAdd={openAdd}
              pendingIds={pendingIds}
            />
          </TimelinePanel>
        }
      />

      <p aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      <WaypointFormDialog
        itineraryId={itineraryId}
        mode={formMode}
        onAdded={handleAdded}
        onClose={closeForm}
        onDeleteRequested={removeWaypoint}
        onDirtyChange={setFormDirty}
        onUpdated={(waypointId) => setFocusRequest({ waypointId, target: "main" })}
        restored={formRestored}
        viewerId={viewer.id}
      />
      <TripInfoDialog
        autosave={autosave}
        itinerary={itinerary}
        onOpenChange={handleTripInfoOpenChange}
        open={tripInfoOpen}
      />
      <PublishDialog
        itineraryId={itineraryId}
        onOpenChange={setPublishOpen}
        onPublished={() => setFocusMenuAfterPublish(true)}
        open={publishOpen}
      />
      <DeleteItineraryDialog
        onDeleted={() => {
          onDeleted();
          router.replace(MY_ITINERARIES);
        }}
        onOpenChange={setDeleteOpen}
        target={deleteTarget}
      />
      {leave.dialog}
    </NavigationGuardProvider>
  );
}
