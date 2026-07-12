/**
 * SOLO OS — AI provider contract.
 *
 * ECHO's intelligence is DATA-DRIVEN first: the `echo-engine` computes every
 * fact, insight and recommendation deterministically from real store data. An
 * AI provider is only asked to *narrate* those already-computed facts in ECHO's
 * voice — it never invents metrics.
 *
 * The default provider is fully offline (`MockAIProvider`) and requires no key.
 * Remote providers NEVER hold an API key on the client — they POST the
 * structured facts to the Supabase `echo` edge function, which holds the key.
 */

export type EchoReportKind = 'MORNING' | 'EVENING' | 'WEEKLY';

export type InsightTone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface AINarrationMetric {
  label: string;
  value: string;
}

export interface AINarrationInsight {
  label: string;
  text: string;
  tone: InsightTone;
}

export interface AINarrationRecommendation {
  priority: number;
  title: string;
  reason: string;
}

/**
 * The structured, privacy-safe fact sheet handed to a provider. Contains no
 * sensitive shadow-habit names — the engine masks those before this is built.
 */
export interface AINarrationRequest {
  kind: EchoReportKind;
  headline: string;
  status: string;
  metrics: AINarrationMetric[];
  insights: AINarrationInsight[];
  recommendations: AINarrationRecommendation[];
}

export interface AINarrationResult {
  /** The narrative paragraph in ECHO's voice. */
  text: string;
  /** Provider that produced this (`mock`, `claude`, `openai`, `gemini`). */
  provider: string;
  /** True when produced locally with no network call. */
  offline: boolean;
}

export interface AIProvider {
  readonly name: string;
  /** True for providers that run entirely on-device with no key. */
  readonly isLocal: boolean;
  narrate(req: AINarrationRequest): Promise<AINarrationResult>;
}
