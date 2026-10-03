import Anthropic from "npm:@anthropic-ai/sdk@^0.131.0";

export const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

/** Override with the CLAUDE_MODEL secret if needed. */
export const MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5-5";

/**
 * Server-side refusal fallback: if the model's safety classifier declines, the API re-runs the
 * request on Anthropic's recommended fallback model inside the same call.
 */
export const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};

export class RefusalError extends Error {}

export function textOf(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
