import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Providers } from "./providers";

vi.mock("@tripory/ui-web", () => ({ Toast: () => <div data-testid="toast" /> }));
vi.mock("@/modules/identity/ui/session-effects", () => ({ SessionEffects: () => <div data-testid="effects" /> }));
vi.mock("@/modules/identity/ui/session-keeper", () => ({ SessionKeeper: () => <div data-testid="keeper" /> }));

function ReadClient() {
  const client = useQueryClient();
  const defaults = client.getDefaultOptions();
  return <p>{`retry:${String(defaults.queries?.retry)}`}</p>;
}

it("mounts the query client (retry: false), toast, session effects and keeper around children", () => {
  render(
    <Providers>
      <ReadClient />
    </Providers>,
  );

  expect(screen.getByText("retry:false")).toBeTruthy();
  expect(screen.getByTestId("toast")).toBeTruthy();
  expect(screen.getByTestId("effects")).toBeTruthy();
  expect(screen.getByTestId("keeper")).toBeTruthy();
});
