import { AIServiceSelectors } from "./types";

export const AI_SELECTORS: Record<string, AIServiceSelectors> = {
  chatgpt: {
    inputSelectors: [
      "#prompt-textarea",
      'div[contenteditable="true"].ProseMirror',
      'div.ProseMirror[contenteditable="true"]',
      'textarea[placeholder*="Message"]',
      'textarea[data-id="root"]',
      "form textarea",
      'div[contenteditable="true"]',
    ],
    submitSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      "form button:not([disabled])",
    ],
    isContentEditable: true,
  },

  gemini: {
    inputSelectors: [
      ".ql-editor.textarea",
      "rich-textarea .ql-editor",
      'div.ql-editor[contenteditable="true"]',
      'rich-textarea div[contenteditable="true"]',
      'div[contenteditable="true"][aria-label*="Enter"]',
      'div[contenteditable="true"]',
      "textarea",
    ],
    submitSelectors: [
      "button.send-button",
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[mattooltip*="Send"]',
      ".send-button",
    ],
    isContentEditable: true,
  },

  claude: {
    inputSelectors: [
      'div[contenteditable="true"].ProseMirror',
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][data-placeholder]',
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"]',
      "textarea",
    ],
    submitSelectors: [
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      "fieldset button:not([disabled])",
      'button[type="submit"]',
    ],
    isContentEditable: true,
  },
};
