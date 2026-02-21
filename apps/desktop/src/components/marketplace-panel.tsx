import { useEffect, useState } from "react";

import type { RuntimeTool } from "@mmo-claw/ipc";
import * as UI from "../ui";

const renderOperationMessage = (
  toolLabel: string,
  action: "install" | "uninstall",
  message: string,
): string => {
  return `${toolLabel} ${action}: ${message}`;
};

export const MarketplacePanel = (): JSX.Element => {
  const [tools, setTools] = useState<RuntimeTool[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    "Loading runtime tools...",
  );

  useEffect(() => {
    const loadTools = async () => {
      const response = await window.desktopApi.listRuntimeTools();
      if (!response.ok) {
        setStatusMessage(response.error.message);
        return;
      }

      setTools(response.data);
      setStatusMessage("Runtime tool catalog loaded.");
    };

    void loadTools();
  }, []);

  const runAction = async (
    tool: RuntimeTool,
    action: "install" | "uninstall",
  ): Promise<void> => {
    const response =
      action === "install"
        ? await window.desktopApi.installRuntimeTool({ toolId: tool.id })
        : await window.desktopApi.uninstallRuntimeTool({ toolId: tool.id });

    if (!response.ok) {
      setStatusMessage(
        renderOperationMessage(
          tool.displayName,
          action,
          response.error.message,
        ),
      );
      return;
    }

    setStatusMessage(
      renderOperationMessage(tool.displayName, action, response.data.message),
    );
  };

  return (
    <div className="desktop-stack">
      {tools.map((tool) => (
        <UI.Card key={tool.id}>
          <UI.CardTitle>{tool.displayName}</UI.CardTitle>
          <UI.CardDescription>{tool.packageName}</UI.CardDescription>
          <div className="desktop-row">
            <UI.Button onClick={() => void runAction(tool, "install")}>
              Install
            </UI.Button>
            <UI.Button
              variant="outline"
              onClick={() => void runAction(tool, "uninstall")}
            >
              Uninstall
            </UI.Button>
          </div>
        </UI.Card>
      ))}
      <p className="desktop-muted">{statusMessage}</p>
    </div>
  );
};
