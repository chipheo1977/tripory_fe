import { Button, type ButtonProps } from "@tripory/ui-web";
import { Plus } from "lucide-react";
import type { Ref } from "react";

type AddButtonProps = Readonly<
  Omit<ButtonProps, "children" | "icon" | "iconPosition" | "ref"> & {
    label: string;
    ref?: Ref<HTMLButtonElement>;
  }
>;

export function AddButton({ label, variant = "primary", ...props }: AddButtonProps) {
  return (
    <Button {...props} icon={Plus} variant={variant}>
      {label}
    </Button>
  );
}
