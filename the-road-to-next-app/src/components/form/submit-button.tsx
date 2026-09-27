"use client";

import { LucideLoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  label?: string;
  icon?: React.ReactNode;
  variant?:
    "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  isDisabled?: boolean;
};

export const SubmitButton = ({
  label,
  icon,
  variant,
  size,
  isDisabled = false,
}: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending || isDisabled}
      type="submit"
      variant={variant}
      size={size}
    >
      {pending ? (
        <LucideLoaderCircle className="h-4 w-4 animate-spin" />
      ) : icon ? (
        <span className="[&>svg]:size-4">{icon}</span>
      ) : null}
      {label}
    </Button>
  );
};
