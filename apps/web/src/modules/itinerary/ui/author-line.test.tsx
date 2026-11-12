import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthorLine } from "./author-line";

describe("AuthorLine", () => {
  it("shows the name of another author without the owner badge", () => {
    render(<AuthorLine avatarUrl={null} displayName="Lan" isOwner={false} />);

    expect(screen.getByText("Lan")).toBeTruthy();
    expect(screen.queryByText("Lịch trình của bạn")).toBeNull();
  });

  it("adds the owner badge next to the author", () => {
    render(<AuthorLine avatarUrl={null} displayName="Lan" isOwner />);

    expect(screen.getByText("Lan")).toBeTruthy();
    expect(screen.getByText("Lịch trình của bạn")).toBeTruthy();
  });

  it("shows only the badge when there is no author but the viewer owns it", () => {
    const { container } = render(<AuthorLine avatarUrl={null} displayName={null} isOwner />);

    expect(screen.getByText("Lịch trình của bạn")).toBeTruthy();
    expect(container.querySelector("[role=img]")).toBeNull();
  });

  it("renders nothing when there is no author and the viewer is not the owner", () => {
    const { container } = render(<AuthorLine avatarUrl={null} displayName={null} isOwner={false} />);

    expect(container.firstChild).toBeNull();
  });

  it("falls back to the initials when there is no avatar url", () => {
    const { container } = render(<AuthorLine avatarUrl={null} displayName="Lan Trần" isOwner={false} />);

    expect(container.textContent).toContain("LT");
  });

  it("hides the avatar from assistive tech and never prints an email", () => {
    const { container } = render(<AuthorLine avatarUrl="https://cdn.tripory.vn/a.png" displayName="Lan" isOwner={false} />);

    expect(container.querySelector("[aria-hidden=true] [role=img]")).not.toBeNull();
    expect(container.textContent).not.toContain("@");
  });
});
