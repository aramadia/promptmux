export interface AIService {
  name: string;
  url: string;
  partition: string;
}

export interface AIServiceSelectors {
  inputSelectors: string[];
  submitSelectors: string[];
  isContentEditable: boolean;
}

export interface PromptResult {
  service: string;
  success: boolean;
  error?: string;
}
