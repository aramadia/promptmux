import { ipcMain } from "electron";
import { getAIViews } from "./window-manager";
import { PromptResult } from "../shared/types";

export function setupIpcHandlers(): void {
  ipcMain.handle(
    "send-prompt",
    async (_, prompt: string): Promise<PromptResult[]> => {
      console.log("[Main] Received send-prompt:", prompt.substring(0, 50));
      const views = getAIViews();
      console.log("[Main] Found views:", views.length);
      const results: PromptResult[] = [];

      const promises = views.map(async (aiView) => {
        try {
          console.log(`[Main] Checking promptMux on ${aiView.service}...`);
          // First check if promptMux exists
          const hasPromptMux = await aiView.view.webContents.executeJavaScript(
            `typeof window.promptMux`,
          );
          console.log(`[Main] ${aiView.service} has promptMux:`, hasPromptMux);

          if (hasPromptMux === "undefined") {
            return {
              service: aiView.service,
              success: false,
              error: "promptMux not found - preload script may not have loaded",
            };
          }

          console.log(`[Main] Injecting into ${aiView.service}...`);
          const success = await aiView.view.webContents.executeJavaScript(
            `window.promptMux.injectPrompt(${JSON.stringify(prompt)})`,
          );
          console.log(`[Main] ${aiView.service} result:`, success);
          return {
            service: aiView.service,
            success: success === true,
          };
        } catch (error) {
          console.error(`[Main] ${aiView.service} error:`, error);
          return {
            service: aiView.service,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      const settledResults = await Promise.allSettled(promises);

      for (const result of settledResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            service: "unknown",
            success: false,
            error: result.reason?.message || "Promise rejected",
          });
        }
      }

      return results;
    },
  );

  ipcMain.handle("new-chat", async (): Promise<PromptResult[]> => {
    console.log("[Main] Received new-chat request");
    const views = getAIViews();
    const results: PromptResult[] = [];

    const promises = views.map(async (aiView) => {
      try {
        console.log(`[Main] Reloading ${aiView.service} to ${aiView.url}`);
        await aiView.view.webContents.loadURL(aiView.url);
        return {
          service: aiView.service,
          success: true,
        };
      } catch (error) {
        console.error(`[Main] ${aiView.service} reload error:`, error);
        return {
          service: aiView.service,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const settledResults = await Promise.allSettled(promises);

    for (const result of settledResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          service: "unknown",
          success: false,
          error: result.reason?.message || "Promise rejected",
        });
      }
    }

    return results;
  });
}
