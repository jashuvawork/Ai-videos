import { createProviders } from "@/providers";
import { contentSafetyPrompt } from "@/lib/prompts";

const BLOCKED_PATTERNS = [
  /\b(child\s*porn|csam)\b/i,
  /\bhow\s+to\s+(make|build)\s+(a\s+)?bomb\b/i,
  /\b(kill|murder)\s+(instructions|how\s+to)\b/i,
];

export interface SafetyResult {
  safe: boolean;
  issues: string[];
  suggestion?: string;
}

export class ContentSafetyService {
  async checkInput(text: string): Promise<SafetyResult> {
    const issues: string[] = [];

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(text)) {
        issues.push("Content contains prohibited material");
      }
    }

    if (text.length > 5000) {
      issues.push("Input exceeds maximum length");
    }

    if (issues.length > 0) {
      return {
        safe: false,
        issues,
        suggestion: "Please revise your idea to remove prohibited content and try again.",
      };
    }

    return { safe: true, issues: [] };
  }

  async checkPrompt(prompt: string): Promise<SafetyResult> {
    const inputCheck = await this.checkInput(prompt);
    if (!inputCheck.safe) return inputCheck;

    // Additional prompt-specific checks
    if (/nude|naked|nsfw|explicit/i.test(prompt)) {
      return {
        safe: false,
        issues: ["Visual prompt contains inappropriate content"],
        suggestion: "Please use family-friendly visual descriptions.",
      };
    }

    return { safe: true, issues: [] };
  }
}
