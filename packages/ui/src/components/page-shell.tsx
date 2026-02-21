import type { PropsWithChildren } from "react";

export interface PageShellProps {
  title: string;
  description?: string;
}

export const PageShell = ({
  title,
  description,
  children,
}: PropsWithChildren<PageShellProps>): JSX.Element => {
  return (
    <main className="ui-page-shell">
      <header className="ui-page-shell__header">
        <h1 className="ui-page-shell__title">{title}</h1>
        {description ? <p className="ui-page-shell__description">{description}</p> : null}
      </header>
      {children}
    </main>
  );
};
