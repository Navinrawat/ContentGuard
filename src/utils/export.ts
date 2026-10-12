// Report exporters: standalone HTML, Markdown and JSON.

import type { AnalysisReport, Severity } from '../types/analysis';
import { CONTENT_TYPE_LABELS, INDUSTRY_LABELS } from '../engine/lexicon';
import { AI_DISCLAIMER } from '../components/Disclaimer';
import { SEVERITY_META } from './score';

const ORDER: Severity[] = ['must', 'should', 'consider', 'good'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fileBase(r: AnalysisReport) {
  const slug = (r.input.primaryKeyword || CONTENT_TYPE_LABELS[r.input.contentType]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `contentguard-${slug}-${r.createdAt.slice(0, 10)}`;
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(r: AnalysisReport) {
  download(`${fileBase(r)}.json`, JSON.stringify(r, null, 2), 'application/json');
}

export function toMarkdown(r: AnalysisReport): string {
  const s = r.scores;
  const L: string[] = [];
  L.push(`# ContentGuard AI: Content Audit Report`, '');
  L.push(`**Content type:** ${CONTENT_TYPE_LABELS[r.input.contentType]}  `);
  L.push(`**Industry:** ${INDUSTRY_LABELS[r.input.industry]}  `);
  if (r.input.primaryKeyword) L.push(`**Primary keyword:** ${r.input.primaryKeyword}  `);
  if (r.input.targetLocation) L.push(`**Location:** ${r.input.targetLocation}  `);
  if (r.input.websiteUrl) L.push(`**Website:** ${r.input.websiteUrl}  `);
  L.push(`**Generated:** ${new Date(r.createdAt).toLocaleString()} (${r.engine.label})`, '');
  L.push(`## Score summary`, '', '| Metric | Score |', '|---|---|');
  L.push(`| Overall Content Score | ${s.overall}/100 |`, `| SEO Score | ${s.seo}/100 |`, `| AI-Likeness | ${s.aiLikeness}% (${r.ai.band}, confidence ${r.ai.confidence}) |`);
  L.push(`| Human Writing Score | ${s.human}/100 |`, `| Search Intent Score | ${s.searchIntent}/100 |`, `| Readability Score | ${s.readability}/100 |`);
  L.push(`| E-E-A-T Score | ${s.eeat}/100 |`, `| Originality/Specificity | ${s.originality}/100 |`, `| Content Quality | ${s.quality}/100 |`);
  L.push(`| Spam Risk | ${s.spamRisk} |`, `| Compliance Risk | ${s.complianceRisk} |`, '');
  L.push(`> ${AI_DISCLAIMER}`, '');

  L.push(`## AI content analysis`, '', `AI-likeness: **${r.ai.band}**. Estimated AI probability: **${r.ai.score}%**. Confidence: **${r.ai.confidence}**`, '');
  L.push('**Why this score was given**', '', ...r.ai.reasons.map((x) => `- ${x}`), '');
  if (r.ai.examples.length) L.push('**Examples**', '', ...r.ai.examples.map((e) => `- _${e.signal}_: "${e.text}"`), '');

  L.push(`## E-E-A-T`, '', `Experience ${r.eeat.experience} · Expertise ${r.eeat.expertise} · Authoritativeness ${r.eeat.authoritativeness} · Trustworthiness ${r.eeat.trustworthiness}`, '');
  L.push(...r.eeat.signals.map((x) => `- ${x.found ? '✅' : '❌'} ${x.label}${x.found ? '' : `: ${x.recommendation}`}`), '');

  L.push(`## Final action plan`, '');
  for (const sev of ORDER) {
    const items = r.issues.filter((i) => i.severity === sev);
    if (!items.length) continue;
    L.push(`### ${SEVERITY_META[sev].emoji} ${SEVERITY_META[sev].label.toUpperCase()} (${items.length})`, '');
    for (const i of items) {
      L.push(`**${i.title}**`);
      if (i.original) L.push(`- Original: "${i.original}"`);
      L.push(`- Issue: ${i.problem}`, `- Why it matters: ${i.explanation}`, `- Recommended action: ${i.suggestion}`);
      if (i.rewrite) L.push(`- Suggested: ${i.rewrite}`);
      L.push('');
    }
  }

  if (r.compliance.flags.length) {
    L.push(`## Compliance review (${r.compliance.mode})`, '', ...r.compliance.notes.map((n) => `_${n}_`), '');
    for (const f of r.compliance.flags) L.push(`- **${f.issue}** (Risk: ${f.risk})`, `  - Original: "${f.original}"`, `  - Suggested safer version: ${f.saferVersion}`);
    L.push('');
  }

  if (r.claims.length) {
    L.push(`## Claims`, '', '| Statement | Type | Risk | Evidence needed |', '|---|---|---|---|');
    for (const c of r.claims) L.push(`| ${c.original.replace(/\|/g, '\\|')} | ${c.types.join(', ')} | ${c.risk} | ${c.evidenceNeeded ? 'Yes' : 'No'} |`);
    L.push('');
  }

  const w = r.rewrites;
  L.push(`## SEO rewrite suggestions`, '');
  L.push(`1. **SEO title:** ${w.seoTitle}`, `2. **Meta description:** ${w.metaDescription}`, `3. **H1:** ${w.h1}`, `4. **H2 structure:**`);
  L.push(...w.h2Structure.map((h) => `   - ${h}`));
  L.push(`5. **Missing topics:** ${w.missingTopics.join('; ') || 'None'}`, `6. **FAQ suggestions:**`, ...w.faqs.map((f) => `   - ${f}`));
  L.push(`7. **Internal links:**`, ...w.internalLinks.map((l) => `   - "${l.anchor}" → ${l.target} (${l.reason})`));
  L.push(`8. **External sources:**`, ...w.externalSources.map((x) => `   - ${x.source}: ${x.useFor}`));
  if (w.cta) L.push(`9. **CTA:** ${w.cta}`);
  L.push('', '---', '_Generated by ContentGuard AI. Compliance findings are potential risks for human review, not legal advice._');
  return L.join('\n');
}

export function exportMarkdown(r: AnalysisReport) {
  download(`${fileBase(r)}.md`, toMarkdown(r), 'text/markdown');
}

export function toHTML(r: AnalysisReport): string {
  const s = r.scores;
  const color = (sev: Severity) => ({ must: '#dc2626', should: '#ea580c', consider: '#ca8a04', good: '#059669' })[sev];
  const scoreCard = (label: string, value: string) => `<div class="card"><div class="lbl">${esc(label)}</div><div class="val">${esc(value)}</div></div>`;
  const issues = ORDER.map((sev) => {
    const items = r.issues.filter((i) => i.severity === sev);
    if (!items.length) return '';
    return `<h3 style="color:${color(sev)}">${SEVERITY_META[sev].emoji} ${SEVERITY_META[sev].label.toUpperCase()} (${items.length})</h3>${items
      .map(
        (i) => `<div class="issue" style="border-left-color:${color(sev)}">
  <div class="it">${esc(i.title)}</div>
  ${i.original ? `<div class="q">“${esc(i.original)}”</div>` : ''}
  <p><b>Issue:</b> ${esc(i.problem)}</p>
  <p><b>Why it matters:</b> ${esc(i.explanation)}</p>
  <p><b>Recommended action:</b> ${esc(i.suggestion)}</p>
  ${i.rewrite ? `<div class="q good"><b>Suggested:</b> ${esc(i.rewrite)}</div>` : ''}
</div>`,
      )
      .join('')}`;
  }).join('');

  const w = r.rewrites;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ContentGuard AI Report: ${esc(r.input.primaryKeyword || CONTENT_TYPE_LABELS[r.input.contentType])}</title>
<style>
body{font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;background:#f8fafc;margin:0;padding:32px 16px;line-height:1.55}
.wrap{max-width:960px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px}
h1{margin:0 0 4px;font-size:24px} h2{margin-top:32px;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:6px} h3{font-size:15px;margin-top:20px}
.meta{color:#64748b;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:16px}
.card{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}.lbl{font-size:12px;color:#64748b}.val{font-size:20px;font-weight:700}
.note{background:#eef2ff;border:1px solid #c7d2fe;color:#312e81;border-radius:8px;padding:10px 12px;font-size:13px;margin-top:16px}
.issue{border:1px solid #e2e8f0;border-left:4px solid;border-radius:8px;padding:10px 14px;margin:8px 0;font-size:14px}.issue p{margin:4px 0}
.it{font-weight:600}.q{background:#f1f5f9;border-radius:6px;padding:6px 10px;margin:6px 0;font-style:italic}.q.good{background:#ecfdf5;font-style:normal}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f8fafc}
ul{padding-left:20px}li{margin:3px 0}
@media print{body{background:#fff;padding:0}.wrap{border:none}}
</style></head><body><div class="wrap">
<h1>ContentGuard AI: Content Audit Report</h1>
<div class="meta">${esc(CONTENT_TYPE_LABELS[r.input.contentType])} · ${esc(INDUSTRY_LABELS[r.input.industry])}${r.input.primaryKeyword ? ` · “${esc(r.input.primaryKeyword)}”` : ''}${r.input.targetLocation ? ` · ${esc(r.input.targetLocation)}` : ''}${r.input.websiteUrl ? ` · ${esc(r.input.websiteUrl)}` : ''}<br>Generated ${esc(new Date(r.createdAt).toLocaleString())} · ${r.stats.words} words · ${esc(r.engine.label)}</div>
<div class="grid">
${scoreCard('Overall Content Score', `${s.overall}/100`)}${scoreCard('SEO Score', `${s.seo}/100`)}${scoreCard('AI-Likeness', `${s.aiLikeness}% · ${r.ai.band}`)}${scoreCard('Human Writing', `${s.human}/100`)}${scoreCard('Search Intent', `${s.searchIntent}/100`)}
${scoreCard('Readability', `${s.readability}/100`)}${scoreCard('E-E-A-T', `${s.eeat}/100`)}${scoreCard('Originality', `${s.originality}/100`)}${scoreCard('Spam Risk', s.spamRisk)}${scoreCard('Compliance Risk', s.complianceRisk)}
</div>
<div class="note"><b>AI detection disclaimer:</b> ${esc(AI_DISCLAIMER)}</div>
<h2>AI content analysis</h2>
<p>AI-likeness: <b>${r.ai.band}</b> · Estimated AI probability: <b>${r.ai.score}%</b> · Confidence: <b>${r.ai.confidence}</b></p>
<ul>${r.ai.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<h2>E-E-A-T</h2>
<p>Experience ${r.eeat.experience} · Expertise ${r.eeat.expertise} · Authoritativeness ${r.eeat.authoritativeness} · Trustworthiness ${r.eeat.trustworthiness}</p>
<ul>${r.eeat.signals.map((x) => `<li>${x.found ? '✅' : '❌'} ${esc(x.label)}${x.found ? '' : `: ${esc(x.recommendation)}`}</li>`).join('')}</ul>
<h2>Final action plan</h2>${issues}
${r.claims.length ? `<h2>Claims requiring evidence</h2><table><tr><th>Statement</th><th>Type</th><th>Risk</th><th>Suggested modification</th></tr>${r.claims.map((c) => `<tr><td>${esc(c.original)}</td><td>${esc(c.types.join(', '))}</td><td>${c.risk}</td><td>${esc(c.suggestion)}</td></tr>`).join('')}</table>` : ''}
<h2>SEO rewrite suggestions</h2>
<p><b>SEO title:</b> ${esc(w.seoTitle)}<br><b>Meta description:</b> ${esc(w.metaDescription)}<br><b>H1:</b> ${esc(w.h1)}</p>
<h3>Suggested H2 structure</h3><ol>${w.h2Structure.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
<h3>FAQ suggestions</h3><ul>${w.faqs.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
<h3>Internal linking</h3><ul>${w.internalLinks.map((l) => `<li>“${esc(l.anchor)}” → ${esc(l.target)}: ${esc(l.reason)}</li>`).join('')}</ul>
<h3>External sources</h3><ul>${w.externalSources.map((x) => `<li>${esc(x.source)}: ${esc(x.useFor)}</li>`).join('')}</ul>
${w.cta ? `<h3>CTA suggestion</h3><p>${esc(w.cta)}</p>` : ''}
<p class="meta" style="margin-top:32px">Compliance findings are potential risks for human review, not legal advice. Generated by ContentGuard AI.</p>
</div></body></html>`;
}

export function exportHTML(r: AnalysisReport) {
  download(`${fileBase(r)}.html`, toHTML(r), 'text/html');
}

export function printReport(r: AnalysisReport) {
  const w = window.open('', '_blank');
  if (!w) return exportHTML(r);
  w.document.write(toHTML(r));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
