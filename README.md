# ContentGuard AI

A content audit and SEO analysis tool for agencies. You paste page copy (blog, service, landing, location, product, homepage or about page) and get a scored, tabbed report. It covers AI-likeness, human writing quality, SEO, search intent, E-E-A-T, readability, claims, healthcare compliance risk and a prioritised action plan.

> AI-likeness is an estimated linguistic signal, not proof of AI authorship. No AI detector can reliably determine authorship with 100% accuracy.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
```

Click **Load sample** to try two demo pages: a heavily promotional dermatology service page and a strong, expert-written dental blog.

## How it works

The analysis runs fully in the browser through a **heuristic engine**. It needs no API keys. It makes real measurements on your text: sentence-length variation, transition density, stock-phrase rate, Flesch scores, keyword placement, topic coverage, claim patterns and more. It does not produce random scores.

```
src/
  types/analysis.ts      AnalysisReport contract shared by the UI and all providers
  engine/                Pure TypeScript analysis modules (no DOM, also runs server-side)
    text.ts              Parsing (HTML / Markdown / plain text → blocks), tokenising, stats
    lexicon.ts           Phrase lists, topic templates, industry entities and sources (tune here)
    aiDetection.ts       12 weighted signals with guardrails (no high score from 1–2 signals)
    humanWriting.ts      Experience, examples, specifics, opinion, rhythm
    seo.ts               25 SEO checks, keyword analysis, intent, coverage, PAA, snippets
    readability.ts       Flesch, grade, passive voice, jargon, hardest sentences + simplifier
    eeat.ts              Experience / Expertise / Authoritativeness / Trust signals
    claims.ts            9 claim types, risk and evidence-needed
    compliance.ts        Healthcare (or general advertising) compliance-risk flags
    saferWording.ts      Rule-based safer rewrites (never invents evidence; uses [placeholders])
    quality.ts           12 quality dimensions, grammar/spelling rules, spam risk
    pageType.ts          Blog / Service-page / other page-type checks
    rewrites.ts          Title, meta, H1, H2 structure, FAQs, links, sources, CTA
    recommendations.ts   Master issue list → Must / Should / Consider / Good
    index.ts             Orchestrator + score summary
  services/
    providers.ts         AnalysisProvider interface: heuristic (default) and LLM-hybrid
    llmContract.ts       System prompt, request/response schema, merge logic for an LLM backend
  components/            Dashboard, rich-text editor, tabs, issue cards, annotated content
  utils/export.ts        HTML / Markdown / JSON / print exports
```

## Claude review (optional)

The local engine always runs. If the server has Anthropic credentials, Claude also reviews the page and its findings are merged into the report:

1. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. If you use an `ant auth login` profile instead of a key, set `CONTENTGUARD_LLM=on`.
2. Run `npm run dev` (the API is served by the Vite dev server), or `npm run build && npm start` for production (port 8787, or set `PORT`).

The browser checks `/api/status` at startup. The header shows **Engine: Heuristic + Claude review** when the review is on.

What Claude adds:
- A second AI-likeness estimate, blended 50/50 with the heuristic score.
- Page-specific editor notes, shown on the Overview tab.
- Missing topics, an H2 outline and FAQs written for this keyword and audience.
- An SEO title and meta description.
- Claims and compliance-risk wording the rules missed.

How it is called and checked:
- The server calls `claude-opus-5-5` with structured JSON output and `fallbacks: "default"` (a declined request is re-run on Anthropic's recommended fallback model).
- The server validates the response before returning it. Scores are clamped, and any claim or flag whose quoted sentence is not actually on the page is dropped.
- If the call fails (no credentials, rate limit, refusal), the report falls back to the local result, and the report header says why.

Settings live in `.env.example`: `CONTENTGUARD_MODEL`, `CONTENTGUARD_EFFORT` (default `medium`; `high` is slower but more thorough) and `CONTENTGUARD_LLM=off`. The prompt and response schema are in `src/services/llmContract.ts`. The server code is in `server/`.

`npx tsx server/selftest.ts` checks the merge and validation logic offline, without making an API call.

## Scoring notes

- **Overall score** is a weighted blend of SEO, intent, human writing, readability, E-E-A-T, originality, quality and page-type scores. Spam and compliance risk subtract from it. AI-likeness is **not** a penalty; it is shown as a diagnostic only.
- **Keyword analysis** reports usage and stuffing risk, and never sets a target density.
- **Compliance** findings are worded as "Potential compliance risk" or "Requires verification" and are not legal advice. Healthcare-specific checks run for Healthcare, Dental, Dermatology, Cosmetic Surgery and Orthopedic. Other industries get a lighter general advertising-claims review.
- E-E-A-T signals are detected only in the pasted content. Author boxes or schema elsewhere on the live page will not be seen.
