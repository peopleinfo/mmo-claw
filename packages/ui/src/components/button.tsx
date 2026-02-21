import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "../utils/cn";

type ButtonVariant = "default" | "outline" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassMap: Record<ButtonVariant, string> = {
  default: "ui-button--default",
  outline: "ui-button--outline",
  ghost: "ui-button--ghost",
};

export const Button = ({
  children,
  className,
  variant = "default",
  ...props
}: PropsWithChildren<ButtonProps>): JSX.Element => {
  return (
    <button
      className={cn(
        "ui-button",
        variantClassMap[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
