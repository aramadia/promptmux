import { contextBridge } from "electron";
import {
  waitForElement,
  injectTextIntoElement,
  triggerSubmit,
} from "./dom-utils";
import { AI_SELECTORS } from "../shared/selectors";

const selectors = AI_SELECTORS.claude;

contextBridge.exposeInMainWorld("promptMux", {
  injectPrompt: async (text: string): Promise<boolean> => {
    console.log("[PromptMux][Claude] Starting injection...");
    try {
      const input = await waitForElement(selectors.inputSelectors);
      if (!input) {
        console.error("[PromptMux][Claude] Could not find input element");
        return false;
      }

      const injected = injectTextIntoElement(
        input,
        text,
        selectors.isContentEditable,
      );
      if (!injected) {
        console.error("[PromptMux][Claude] Failed to inject text");
        return false;
      }

      const submitted = await triggerSubmit(selectors.submitSelectors);
      if (!submitted) {
        console.warn(
          "[PromptMux][Claude] Could not find submit button, trying Enter key",
        );
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          }),
        );
      }

      console.log("[PromptMux][Claude] Injection complete");
      return true;
    } catch (error) {
      console.error("[PromptMux][Claude] Injection error:", error);
      return false;
    }
  },
});
