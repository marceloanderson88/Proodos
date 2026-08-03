"use client";

import type { ButtonVariant } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  message,
  variant = "danger",
}: {
  children: React.ReactNode;
  message: string;
  variant?: ButtonVariant;
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
