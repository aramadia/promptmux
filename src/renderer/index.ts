// Make this a module to allow global augmentation
export {};

interface PromptResult {
  service: string;
  success: boolean;
  error?: string;
}

interface PromptMuxAPI {
  sendPrompt: (prompt: string) => Promise<PromptResult[]>;
}

declare global {
  interface Window {
    api: PromptMuxAPI;
  }
}

const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

async function sendPrompt(): Promise<void> {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  console.log('[Renderer] Sending prompt:', prompt.substring(0, 50));
  console.log('[Renderer] window.api exists:', typeof window.api);

  if (typeof window.api === 'undefined') {
    console.error('[Renderer] window.api is undefined - preload script did not load!');
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';

  try {
    const results = await window.api.sendPrompt(prompt);
    console.log('[Renderer] Got results:', results);

    results.forEach((result: PromptResult) => {
      if (result.success) {
        console.log(`${result.service}: sent successfully`);
      } else {
        console.error(`${result.service}: failed -`, result.error);
      }
    });

    promptInput.value = '';
  } catch (error) {
    console.error('[Renderer] Failed to send prompt:', error);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send to All';
  }
}

sendBtn.addEventListener('click', sendPrompt);

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendPrompt();
  }
});

console.log('[Renderer] Script loaded');
