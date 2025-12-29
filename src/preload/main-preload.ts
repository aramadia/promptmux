import { contextBridge, ipcRenderer } from 'electron';
import { PromptResult } from '../shared/types';

contextBridge.exposeInMainWorld('api', {
  sendPrompt: (prompt: string): Promise<PromptResult[]> => {
    return ipcRenderer.invoke('send-prompt', prompt);
  },
});
