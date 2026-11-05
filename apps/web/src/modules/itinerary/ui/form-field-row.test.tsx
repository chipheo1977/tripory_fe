import { render, screen } from "@testing-library/react";
import { Input } from "@tripory/ui-web";
import { describe, expect, it } from "vitest";
import { FormFieldRow } from "./form-field-row";

describe("FormFieldRow labelAction", () => {
  it("không có labelAction thì không render vùng nút", () => {
    const { container } = render(
      <FormFieldRow error={undefined} label="Tên">
        <Input />
      </FormFieldRow>,
    );
    expect(container.querySelector("[data-label-action]")).toBeNull();
  });

  it("render labelAction sau control (Tab vào control trước) và nhãn vẫn gắn với control", () => {
    const { container } = render(
      <FormFieldRow error={undefined} label="Link ảnh" labelAction={<button type="button">Thêm</button>}>
        <Input />
      </FormFieldRow>,
    );
    const control = screen.getByLabelText("Link ảnh");
    const action = container.querySelector("[data-label-action]");
    expect(action).not.toBeNull();
    expect(action?.textContent).toBe("Thêm");
    expect(control.compareDocumentPosition(action as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
