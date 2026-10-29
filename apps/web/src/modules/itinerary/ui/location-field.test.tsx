import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PlaceHint } from "@tripory/itinerary";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/composition/query-client";
import {
  LOCATION_HINT,
  LOCATION_INVALID,
  LOCATION_NO_COORDINATE,
  LOCATION_OUT_OF_RANGE,
  LOCATION_RESOLVE_FAILED,
  LocationField,
  useLocationState,
  type LocationState,
} from "./location-field";

const h = vi.hoisted(() => ({ resolve: vi.fn() }));

vi.mock("@/composition/itinerary.client", async () => {
  const { createItineraryHooks: factory } = await import("@tripory/itinerary/react");
  const unused = vi.fn();
  return {
    itinerary: factory({
      repository: {
        listMine: unused,
        getById: unused,
        create: unused,
        updateMetadata: unused,
        publish: unused,
        remove: unused,
        addWaypoint: unused,
        updateWaypoint: unused,
        deleteWaypoint: unused,
        reorderWaypoints: unused,
        setDaySubtitle: unused,
      },
      shortLinks: { resolve: (url: string) => h.resolve(url) },
    }),
  };
});

const POI = "https://www.google.com/maps/place/Brandenburg+Gate,+Pariser+Platz,+10117+Berlin,+Germany/";
const POI_PLACE: PlaceHint = { name: "Brandenburg Gate", address: "Pariser Platz, 10117 Berlin, Germany" };
const FULL = "https://www.google.com/maps/place/Ben+Thanh/@10.7725,106.698,17z/data=!3d10.7721!4d106.6980";
const SHORT = "https://maps.app.goo.gl/abc";
const SEARCH = "https://www.google.com/maps/search/29.996966,+68.748251";

const flushRef: { current: (() => Promise<LocationState>) | null } = { current: null };

function Harness({ initial = "", onPlace }: { initial?: string; onPlace: (place: PlaceHint) => void }) {
  const [raw, setRaw] = useState(initial);
  const [blurred, setBlurred] = useState(false);
  const { state, flush } = useLocationState(raw, onPlace);
  useEffect(() => {
    flushRef.current = flush;
  });
  return (
    <>
      <label htmlFor="loc">Vị trí</label>
      <LocationField
        describedById="loc-status"
        id="loc"
        onBlur={() => setBlurred(true)}
        onChange={setRaw}
        showError={blurred}
        state={state}
        value={raw}
      />
    </>
  );
}

function setup(initial = "") {
  const onPlace = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Harness initial={initial} onPlace={onPlace} />
    </QueryClientProvider>,
  );
  const input = screen.getByLabelText("Vị trí") as HTMLInputElement;
  const paste = (value: string) => fireEvent.change(input, { target: { value } });
  const blur = () => fireEvent.blur(input);
  return { input, paste, blur, onPlace };
}

const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  flushRef.current = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("shows the received coordinate immediately for a bare coordinate, without blur", () => {
  const { paste } = setup();
  paste("10.7769, 106.7009");
  expect(screen.getByText("Đã nhận: 10.7769, 106.7009")).toBeTruthy();
  const status = document.getElementById("loc-status");
  expect(status?.getAttribute("aria-live")).toBe("polite");
  expect(screen.getByLabelText("Vị trí").getAttribute("aria-describedby")).toContain("loc-status");
});

it("shows the received coordinate for a full Google Maps link", () => {
  const { paste } = setup();
  paste(FULL);
  expect(screen.getByText("Đã nhận: 10.7721, 106.6980")).toBeTruthy();
});

it("shows only the fixed hint before blur and the invalid error after blur", () => {
  const { input, paste, blur } = setup();
  expect(screen.getByText(LOCATION_HINT)).toBeTruthy();
  paste("abc");
  expect(screen.queryByText(LOCATION_INVALID)).toBeNull();
  expect(input.getAttribute("aria-invalid")).toBeNull();
  expect(screen.getByText(LOCATION_HINT)).toBeTruthy();
  blur();
  expect(screen.getByText(LOCATION_INVALID)).toBeTruthy();
  expect(input.getAttribute("aria-invalid")).toBe("true");
});

it("reports out-of-range coordinates after blur", () => {
  const { paste, blur } = setup();
  paste("95, 200");
  blur();
  expect(screen.getByText(LOCATION_OUT_OF_RANGE)).toBeTruthy();
});

it("reports a name-only link with the D-48 copy and fills the place hint once", () => {
  const { paste, blur, onPlace } = setup();
  paste(POI);
  blur();
  expect(screen.getByText(LOCATION_NO_COORDINATE)).toBeTruthy();
  expect(onPlace).toHaveBeenCalledTimes(1);
  expect(onPlace).toHaveBeenCalledWith(POI_PLACE);
  expect(screen.queryByText(/Đã nhận/)).toBeNull();
});

it("resolves a short link after 400ms and parses the returned URL", async () => {
  h.resolve.mockResolvedValue(SEARCH);
  const { paste } = setup();
  paste(SHORT);
  expect(screen.getByText("Đang đọc link…")).toBeTruthy();
  await advance(399);
  expect(h.resolve).not.toHaveBeenCalled();
  await advance(1);
  expect(h.resolve).toHaveBeenCalledTimes(1);
  expect(h.resolve).toHaveBeenCalledWith(SHORT);
  expect(screen.getByText("Đã nhận: 29.9970, 68.7483")).toBeTruthy();
  expect(screen.queryByText("Đang đọc link…")).toBeNull();
});

it("shows the resolve failure copy when the short link cannot be opened", async () => {
  h.resolve.mockRejectedValue(new Error("boom"));
  const { paste, blur } = setup();
  paste(SHORT);
  await advance(400);
  blur();
  expect(screen.getByText(LOCATION_RESOLVE_FAILED)).toBeTruthy();
});

it("fills the place hint and reports no coordinate when a short link resolves to a place without coordinates", async () => {
  h.resolve.mockResolvedValue(POI);
  const { paste, blur, onPlace } = setup();
  paste(SHORT);
  await advance(400);
  blur();
  expect(screen.getByText(LOCATION_NO_COORDINATE)).toBeTruthy();
  expect(onPlace).toHaveBeenCalledTimes(1);
  expect(onPlace).toHaveBeenCalledWith(POI_PLACE);
});

it("ignores a stale resolve result after the user typed something else", async () => {
  let release: (url: string) => void = () => undefined;
  h.resolve.mockImplementation(
    () =>
      new Promise<string>((resolve) => {
        release = resolve;
      }),
  );
  const { paste } = setup();
  paste(SHORT);
  await advance(400);
  expect(h.resolve).toHaveBeenCalledTimes(1);
  paste("1.5, 2.5");
  expect(screen.getByText("Đã nhận: 1.5000, 2.5000")).toBeTruthy();
  await act(async () => {
    release(SEARCH);
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByText("Đã nhận: 1.5000, 2.5000")).toBeTruthy();
  expect(screen.queryByText("Đã nhận: 29.9970, 68.7483")).toBeNull();
});

it("does not call the resolver while the user keeps typing within the debounce window", async () => {
  h.resolve.mockResolvedValue(SEARCH);
  const { paste } = setup();
  paste("https://maps.app.goo.gl/ab");
  await advance(300);
  paste(SHORT);
  await advance(300);
  expect(h.resolve).not.toHaveBeenCalled();
  await advance(100);
  expect(h.resolve).toHaveBeenCalledTimes(1);
  expect(h.resolve).toHaveBeenCalledWith(SHORT);
});

it("flush resolves immediately, without waiting for the debounce, and returns the final state", async () => {
  h.resolve.mockResolvedValue(SEARCH);
  const { paste } = setup();
  paste(SHORT);
  let result: LocationState | undefined;
  await act(async () => {
    result = await flushRef.current?.();
  });
  expect(h.resolve).toHaveBeenCalledTimes(1);
  expect(result?.status).toBe("ok");
  // Hết hạn debounce sau flush không gọi lần hai.
  await advance(1000);
  expect(h.resolve).toHaveBeenCalledTimes(1);
});

it("flush returns the current state for a non-short-link value", async () => {
  const { paste } = setup();
  paste("abc");
  let result: LocationState | undefined;
  await act(async () => {
    result = await flushRef.current?.();
  });
  expect(result).toEqual({ status: "error", message: LOCATION_INVALID });
  expect(h.resolve).not.toHaveBeenCalled();
});

it("uses text input attributes that stop the browser from rewriting a pasted value", () => {
  const { input } = setup();
  expect(input.type).toBe("text");
  expect(input.getAttribute("autocomplete")).toBe("off");
  expect(input.getAttribute("autocapitalize")).toBe("off");
  expect(input.getAttribute("spellcheck")).toBe("false");
});
