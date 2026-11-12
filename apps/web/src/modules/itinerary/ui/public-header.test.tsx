import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DraftStrip } from "./draft-strip";
import { EditLink } from "./edit-link";
import { PublicHeader } from "./public-header";

const ID = "3f2a6c1e-8b7d-4e21-9c55-0a1b2c3d4e5f";
const originalMatchMedia = window.matchMedia;

function installMatchMedia(fromMd: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: fromMd && query.includes("768px"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("PublicHeader", () => {
  it("orders logo, toggle, actions and account, with no h1 and no back button", () => {
    render(
      <PublicHeader
        account={<i data-testid="c" />}
        actions={<i data-testid="a" />}
        toggle={<i data-testid="t" />}
      />,
    );

    const logo = screen.getByRole("link", { name: "Tripory" });
    expect(logo.getAttribute("href")).toBe("/");
    const order = [logo, screen.getByTestId("t"), screen.getByTestId("a"), screen.getByTestId("c")];
    for (let i = 0; i < order.length - 1; i += 1) {
      expect(order[i]!.compareDocumentPosition(order[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryByRole("button", { name: /quay lại|back/i })).toBeNull();
  });

  it("is a single banner row (min-h-header) with the three-column grid from lg", () => {
    render(<PublicHeader />);

    const row = screen.getByRole("banner").firstElementChild as HTMLElement;
    expect(row.className).toContain("min-h-header");
    expect(row.className).toContain("lg:grid-cols-[1fr_auto_1fr]");
  });

  it("renders only the logo when no slot is given (403)", () => {
    render(<PublicHeader />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("EditLink", () => {
  it("links to the editor with an accessible name", () => {
    installMatchMedia(true);
    render(<EditLink collapse={false} itineraryId={ID} visible />);

    const link = screen.getByRole("link", { name: "Sửa lịch trình" });
    expect(link.getAttribute("href")).toBe(`/itineraries/${ID}/edit`);
  });

  it("collapses the label to screen-reader text below md", () => {
    installMatchMedia(false);
    render(<EditLink collapse itineraryId={ID} visible />);

    expect(screen.getByText("Sửa").className).toContain("sr-only");
  });

  it("shows the label from md even when collapsible", () => {
    installMatchMedia(true);
    render(<EditLink collapse itineraryId={ID} visible />);

    expect(screen.getByText("Sửa").className).not.toContain("sr-only");
  });

  it("always shows the label when not collapsible", () => {
    installMatchMedia(false);
    render(<EditLink collapse={false} itineraryId={ID} visible />);

    expect(screen.getByText("Sửa").className).not.toContain("sr-only");
  });

  it("renders nothing when not visible", () => {
    installMatchMedia(true);
    const { container } = render(<EditLink collapse={false} itineraryId={ID} visible={false} />);

    expect(container.firstChild).toBeNull();
  });
});

describe("DraftStrip", () => {
  it("shows the draft notice with the en dash and an edit link", () => {
    installMatchMedia(true);
    const { container } = render(<DraftStrip itineraryId={ID} visible />);

    expect(screen.getByText("Bản nháp – chỉ bạn thấy")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sửa lịch trình" }).getAttribute("href")).toBe(`/itineraries/${ID}/edit`);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("is not a live region", () => {
    installMatchMedia(true);
    const { container } = render(<DraftStrip itineraryId={ID} visible />);

    expect(container.querySelector("[aria-live], [role=status], [role=alert]")).toBeNull();
  });

  it("renders nothing when not visible", () => {
    installMatchMedia(true);
    const { container } = render(<DraftStrip itineraryId={ID} visible={false} />);

    expect(container.firstChild).toBeNull();
  });
});
