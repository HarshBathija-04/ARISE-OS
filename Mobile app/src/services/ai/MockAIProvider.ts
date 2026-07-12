/**
 * SOLO OS — Offline ECHO provider (default).
 *
 * Produces a narrative deterministically from the structured fact sheet. No
 * network, no key, works from day one. The output reads in ECHO's terse,
 * analytical system voice — never generic motivation, always tied to the facts
 * that the `echo-engine` computed.
 */
import type {
  AIProvider,
  AINarrationRequest,
  AINarrationResult,
  EchoReportKind,
} from './types';

const OPENERS: Record<EchoReportKind, string> = {
  MORNING: 'SYSTEM ONLINE. Operator state assessed.',
  EVENING: 'DAY CYCLE CLOSED. Recording today’s deltas.',
  WEEKLY: 'SEVEN-DAY ANALYSIS COMPLETE. Trend vector locked.',
};

function joinMetrics(req: AINarrationRequest): string {
  if (req.metrics.length === 0) return '';
  const parts = req.metrics.map((m) => `${m.label} ${m.value}`);
  return `Readout — ${parts.join(' · ')}.`;
}

function joinInsights(req: AINarrationRequest): string {
  const critical = req.insights.filter((i) => i.tone === 'critical' || i.tone === 'warning');
  const positive = req.insights.filter((i) => i.tone === 'positive');
  const lines: string[] = [];
  if (positive[0]) lines.push(positive[0].text);
  if (critical[0]) lines.push(critical[0].text);
  if (lines.length === 0 && req.insights[0]) lines.push(req.insights[0].text);
  return lines.join(' ');
}

function joinDirective(req: AINarrationRequest): string {
  const top = [...req.recommendations].sort((a, b) => a.priority - b.priority)[0];
  if (!top) return 'No outstanding directives. Hold the line.';
  return `Priority directive: ${top.title}. ${top.reason}`;
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly isLocal = true;

  async narrate(req: AINarrationRequest): Promise<AINarrationResult> {
    const text = [
      OPENERS[req.kind],
      req.headline,
      joinMetrics(req),
      joinInsights(req),
      joinDirective(req),
    ]
      .filter((s) => s && s.length > 0)
      .join(' ');

    return { text, provider: this.name, offline: true };
  }
}
