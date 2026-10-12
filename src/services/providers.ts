// Analysis provider abstraction.
// The UI only talks to `AnalysisProvider`. Swap or chain providers without touching components.

import type { AnalysisInput, AnalysisReport } from '../types/analysis';
import { HEURISTIC_ENGINE, runHeuristicAnalysis } from '../engine';
import { buildLLMRequest, mergeLLMResult, type LLMAnalysisResult } from './llmContract';

export interface AnalysisProvider {
  id: string;
  label: string;
  analyze(input: AnalysisInput, signal?: AbortSignal): Promise<AnalysisReport>;
}

/** Runs entirely in the browser. No API credentials required. */
export const heuristicProvider: AnalysisProvider = {
  id: HEURISTIC_ENGINE.id,
  label: 'Heuristic engine (local)',
  async analyze(input) {
    // Yield to the event loop so the UI can paint its loading state.
    await new Promise((r) => setTimeout(r, 350));
    return runHeuristicAnalysis(input);
  },
};

/**
 * Hybrid provider: runs the heuristic engine, then asks the backend (which holds the
 * Anthropic credentials) for Claude's review and merges it in. Falls back to the
 * heuristic report if the backend fails, recording why in the engine label.
 */
export function createLLMProvider(endpoint: string, model?: string | null): AnalysisProvider {
  return {
    id: 'llm-hybrid',
    label: `Heuristic + Claude review${model ? ` (${model})` : ''}`,
    async analyze(input, signal) {
      const base = runHeuristicAnalysis(input);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildLLMRequest(input, base)),
          signal,
        });
        if (!res.ok) {
          const msg = (await res.json().catch(() => null))?.error;
          throw new Error(msg || `Backend responded ${res.status}`);
        }
        return mergeLLMResult(base, (await res.json()) as LLMAnalysisResult);
      } catch (err) {
        if (signal?.aborted) throw err;
        console.warn('[ContentGuard] Claude review failed, using heuristic result.', err);
        const reason = err instanceof Error ? err.message : 'unknown error';
        return { ...base, engine: { id: base.engine.id, label: `${base.engine.label} (Claude review unavailable: ${reason})` } };
      }
    },
  };
}

/**
 * Pick a provider at startup: an explicit VITE_ANALYSIS_API_URL wins; otherwise ask the
 * bundled backend whether Claude review is configured; otherwise run locally.
 */
export async function resolveProvider(): Promise<AnalysisProvider> {
  const explicit = import.meta.env.VITE_ANALYSIS_API_URL;
  if (explicit) return createLLMProvider(explicit);
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const status = (await res.json()) as { llm: boolean; model: string | null };
      if (status.llm) return createLLMProvider('/api/analyze', status.model);
    }
  } catch {
    // No backend (e.g. static hosting): local engine only.
  }
  return heuristicProvider;
}
