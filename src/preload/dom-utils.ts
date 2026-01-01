export async function waitForElement(
  selectors: string[],
  timeout: number = 10000,
): Promise<Element | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && isElementVisible(element)) {
          console.log("[PromptMux] Found element with selector:", selector);
          return element;
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(
    "[PromptMux] Could not find element. Tried selectors:",
    selectors,
  );
  console.log(
    "[PromptMux] Available contenteditable elements:",
    Array.from(document.querySelectorAll('[contenteditable="true"]')).map(
      (el) => ({
        tag: el.tagName,
        class: el.className,
        id: el.id,
      }),
    ),
  );
  console.log(
    "[PromptMux] Available textareas:",
    Array.from(document.querySelectorAll("textarea")).map((el) => ({
      id: el.id,
      class: el.className,
      placeholder: el.placeholder,
    })),
  );

  return null;
}

function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none"
  );
}

export function injectTextIntoElement(
  element: Element,
  text: string,
  _isContentEditable: boolean,
): boolean {
  const el = element as HTMLElement;

  // Detect element type
  const tagName = el.tagName.toLowerCase();
  const isTextarea = tagName === "textarea";
  const isInput = tagName === "input";
  const isEditable = el.getAttribute("contenteditable") === "true";
  const isProseMirror = el.classList.contains("ProseMirror");

  console.log("[PromptMux] Injecting into:", {
    tagName,
    isTextarea,
    isInput,
    isEditable,
    isProseMirror,
    className: el.className,
    id: el.id,
  });

  try {
    el.focus();

    if (isTextarea || isInput) {
      // For textarea/input elements
      const input = el as HTMLTextAreaElement | HTMLInputElement;

      // Use native setter to bypass React/Vue controlled inputs
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        isTextarea
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        "value",
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, text);
      } else {
        input.value = text;
      }

      // Dispatch events
      input.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true }),
      );
      input.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true }),
      );

      console.log("[PromptMux] Injected into textarea/input");
      return true;
    } else if (isEditable) {
      // For contenteditable elements (ProseMirror, Quill, etc.)

      if (isProseMirror) {
        // ProseMirror wraps content in <p> tags
        el.innerHTML = `<p>${escapeHtml(text)}</p>`;
      } else {
        // Try execCommand first (works with many editors)
        el.textContent = "";
        const execResult = document.execCommand("insertText", false, text);
        console.log("[PromptMux] execCommand result:", execResult);

        if (!execResult || !el.textContent) {
          // Fallback: Direct text insertion
          el.textContent = text;
        }
      }

      // Dispatch comprehensive events to notify the framework
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          data: text,
          inputType: "insertText",
        }),
      );

      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

      console.log(
        "[PromptMux] Injected into contenteditable, innerHTML:",
        el.innerHTML?.substring(0, 100),
      );
      return true;
    }
  } catch (error) {
    console.error("[PromptMux] Injection error:", error);
  }

  return false;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export async function triggerSubmit(
  submitSelectors: string[],
): Promise<boolean> {
  // Wait a bit for the UI to process the input
  await new Promise((resolve) => setTimeout(resolve, 500));

  for (const selector of submitSelectors) {
    try {
      const button = document.querySelector(selector) as HTMLButtonElement;
      if (button) {
        console.log(
          "[PromptMux] Found submit button:",
          selector,
          "disabled:",
          button.disabled,
        );
        if (!button.disabled) {
          button.click();
          console.log("[PromptMux] Clicked submit button");
          return true;
        }
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  console.log(
    "[PromptMux] No enabled submit button found. Available buttons:",
    Array.from(document.querySelectorAll("button"))
      .slice(0, 10)
      .map((b) => ({
        text: b.textContent?.substring(0, 30),
        ariaLabel: b.getAttribute("aria-label"),
        disabled: b.disabled,
        testId: b.getAttribute("data-testid"),
      })),
  );

  return false;
}
