import * as UI from "@mmo-claw/ui";

interface PagePlaceholderProps {
  title: string;
  description: string;
}

export const PagePlaceholder = ({ title, description }: PagePlaceholderProps): JSX.Element => {
  return (
    <UI.Card>
      <UI.CardTitle>{title}</UI.CardTitle>
      <UI.CardDescription>{description}</UI.CardDescription>
      <p className="desktop-muted">
        Placeholder view is wired. Feature-specific implementation will be layered on top.
      </p>
    </UI.Card>
  );
};
