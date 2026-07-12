/**
 * AI provider abstraction. The System works fully without any AI key
 * (a local, data-driven insight engine does the analysis). When a provider is
 * configured, it can rewrite/expand the insights into prose.
 *
 * Swap providers via env: AI_PROVIDER = none | anthropic | openai | gemini
 */

export interface AiMessage {
  role: "system" | "user";
  content: string;
}

export interface AiProvider {
  readonly name: string;
  generate(messages: AiMessage[]): Promise<string | null>;
}

class NoopProvider implements AiProvider {
  readonly name = "none";
  async generate(): Promise<string | null> {
    return null;
  }
}

class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  constructor(private apiKey: string, private model: string) {}
  async generate(messages: AiMessage[]): Promise<string | null> {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const user = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.[0]?.text ?? null;
  }
}

class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  constructor(private apiKey: string, private model: string) {}
  async generate(messages: AiMessage[]): Promise<string | null> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  }
}

class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  constructor(private apiKey: string, private model: string) {}
  async generate(messages: AiMessage[]): Promise<string | null> {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const user = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // API key passed as a header (kept out of the URL / logs).
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.6 },
      }),
      // Never let a slow model hang a page render.
      signal: AbortSignal.timeout(20_000),
    }).catch(() => null);

    if (!res || !res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }
}

/** Sensible default model per provider when AI_MODEL is unset. */
function defaultModel(provider: string): string {
  switch (provider) {
    case "gemini":
      return "gemini-flash-latest";
    case "openai":
      return "gpt-4o-mini";
    case "anthropic":
      return "claude-opus-4-8";
    default:
      return "";
  }
}

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? "none";
  const key = process.env.AI_API_KEY ?? "";
  const model = process.env.AI_MODEL || defaultModel(provider);
  if (!key || provider === "none") return new NoopProvider();
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(key, model);
    case "openai":
      return new OpenAiProvider(key, model);
    case "gemini":
      return new GeminiProvider(key, model);
    default:
      return new NoopProvider();
  }
}
