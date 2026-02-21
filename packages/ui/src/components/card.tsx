import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "../utils/cn";

export const Card = ({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>): JSX.Element => {
  return (
    <div
      className={cn("ui-card", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle = ({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>): JSX.Element => {
  return (
    <h3 className={cn("ui-card__title", className)} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>): JSX.Element => {
  return (
    <p className={cn("ui-card__description", className)} {...props}>
      {children}
    </p>
  );
};
