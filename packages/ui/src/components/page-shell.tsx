import * as React from "react";
import type { PropsWithChildren } from "react";
import { cn } from "../utils/cn";

export interface PageShellProps {
  title: string;
  description?: string;
  className?: string;
}

export const PageShell = ({
  title,
  description,
  className,
  children,
}: PropsWithChildren<PageShellProps>): JSX.Element => {
  return (
    <main className={cn("ui-page-shell", className)}>
      <header className={cn("ui-page-shell__header")}>
        <h1 className={cn("ui-page-shell__title")}>{title}</h1>
        {description ? (
          <p className={cn("ui-page-shell__description")}>{description}</p>
        ) : null}
      </header>
      {children}
    </main>
  );
};
