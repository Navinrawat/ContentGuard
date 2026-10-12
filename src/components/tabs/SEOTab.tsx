import type { AnalysisReport } from '../../types/analysis';
import { TONE_STYLES, riskTone, scoreTone } from '../../utils/score';
import { BulletList, Card, CheckList, CopyButton, Quote, RiskBadge, ScoreRing, Stat, TagList, ToneBadge, cx } from '../ui';

export function SEOTab({ report }: { report: AnalysisReport }) {
  const { seo, keyword, pageType } = report;
  const passed = seo.checks.filter((c) => c.status === 'pass').length;
  const scored = seo.checks.filter((c) => c.status !== 'na').length;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="SEO score">
          <div className="flex items-center gap-4">
            <ScoreRing score={seo.score} size={96} tone={scoreTone(seo.score)} />
            <div className="text-sm text-slate-600">
              <div>
                <strong className="text-slate-900">{passed}</strong> of {scored} checks passed
              </div>
              <div className="mt-1 text-xs text-slate-500">Weighted pass / improve / fail across modern on-page SEO principles.</div>
            </div>
          </div>
        </Card>
        <Card title="Search intent" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            <ScoreRing score={seo.searchIntent.score} size={80} tone={scoreTone(seo.searchIntent.score)} />
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Stat label="Detected intent" value={<span className="text-base">{seo.searchIntent.detected}</span>} />
              <Stat label="Expected for page type" value={<span className="text-base">{seo.searchIntent.expected}</span>} />
            </div>
          </div>
          <div className="mt-4">
            <BulletList items={seo.searchIntent.notes} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="What is good">
          <BulletList items={seo.good.slice(0, 8)} empty="Nothing notable yet." />
        </Card>
        <Card title="What is missing">
          <BulletList items={seo.missing} empty="Nothing major missing." />
        </Card>
        <Card title="What should be changed">
          <BulletList items={seo.changes} empty="No changes required." />
        </Card>
      </div>

      {keyword ? (
        <Card title="Keyword analysis" subtitle="No fixed density target: natural language and intent come first">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-500">Primary keyword:</span>
                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-sm font-medium text-white">{keyword.keyword}</span>
                <RiskBadge risk={keyword.stuffingRisk} prefix="Stuffing risk" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Exact matches" value={keyword.exactCount} />
                <Stat label="Variant matches" value={keyword.partialCount} />
                <Stat label="Exact-match share" value={`${keyword.density}%`} hint="Informational only" />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estimated natural usage</div>
                <p className="text-sm leading-relaxed text-slate-700">{keyword.naturalUsage}</p>
              </div>
              {keyword.secondary.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Secondary keywords</div>
                  <ul className="space-y-1">
                    {keyword.secondary.map((s) => (
                      <li key={s.keyword} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{s.keyword}</span>
                        <ToneBadge tone={s.count ? 'good' : 'fair'}>{s.count ? `${s.count}× used` : 'Not used'}</ToneBadge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Keyword placement</div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['Title / H1', keyword.placement.title],
                      ['Introduction', keyword.placement.introduction],
                      ['H2 / H3', keyword.placement.h2],
                      ['Body', keyword.placement.body],
                      ['Conclusion', keyword.placement.conclusion],
                      ['FAQ', keyword.placement.faq],
                    ] as const
                  ).map(([label, ok]) => (
                    <div key={label} className={cx('rounded-lg border px-3 py-2', ok ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50')}>
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className={cx('text-sm font-semibold', ok ? 'text-emerald-700' : 'text-slate-500')}>{ok ? '✓ Yes' : '✕ No'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Related terms / entities found</div>
                <TagList items={keyword.relatedFound} tone="good" />
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Related terms / entities missing</div>
                <TagList items={keyword.relatedMissing} tone="fair" />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Keyword analysis">
          <p className="text-sm text-slate-500">Add a primary keyword in the input panel to see keyword placement, stuffing risk and related-term coverage.</p>
        </Card>
      )}

      <Card title="SEO checklist" subtitle="25 modern on-page checks">
        <CheckList checks={seo.checks} columns={2} />
      </Card>

      <Card title={`${pageType.title}: ${pageType.score}/100`} subtitle={pageType.overlyPromotional ? 'This page reads as overly promotional' : undefined}>
        <CheckList checks={pageType.checks} columns={2} />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <ListBlock title="Missing topics" items={pageType.missingTopics} />
          <ListBlock title="Suggested H2s" items={pageType.suggestedH2s} copy />
          <ListBlock title="Suggested FAQs" items={pageType.suggestedFaqs} copy />
          <ListBlock title="Featured snippet opportunities" items={pageType.snippetOpportunities} />
        </div>
        {pageType.promotionalPhrases.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Promotional wording flagged ({pageType.promotionalPhrases.length})</h4>
            <p className="mb-3 text-xs text-slate-500">Not removed automatically. Each needs evidence or qualification.</p>
            <div className="space-y-3">
              {pageType.promotionalPhrases.map((p, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <ToneBadge tone="warn">{p.phrase}</ToneBadge>
                  <div className="mt-2">
                    <Quote tone="warn">“{p.sentence}”</Quote>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{p.why}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Heading outline">
          {report.document.headings.length ? (
            <ul className="space-y-1.5">
              {report.document.headings.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ paddingLeft: (Number(h.type[1]) - 1) * 16 }}>
                  <span className="mt-0.5 rounded bg-slate-100 px-1.5 font-mono text-[10px] text-slate-500">{h.type.toUpperCase()}</span>
                  <span className="text-slate-800">{h.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No headings detected.</p>
          )}
          {seo.headingIssues.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Heading issues</div>
              <BulletList items={seo.headingIssues.map((h) => `“${h.text}”: ${h.problem}`)} />
            </div>
          )}
        </Card>
        <Card title="Entities & questions">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entities covered</div>
              <TagList items={seo.entitiesFound} tone="good" />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entities to consider</div>
              <TagList items={seo.entitiesMissing} tone="fair" />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">PAA / question opportunities</div>
              <BulletList items={seo.questionOpportunities} empty="Common questions already covered." />
            </div>
            {seo.duplicateSections.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-600">Duplicate sections</div>
                <BulletList items={seo.duplicateSections} />
              </div>
            )}
          </div>
        </Card>
      </div>
      <p className={cx('text-xs', TONE_STYLES[riskTone(report.spam.risk)].text)}>Spam risk {report.spam.risk}: {report.spam.reasons.join(' ')}</p>
    </div>
  );
}

function ListBlock({ title, items, copy }: { title: string; items: string[]; copy?: boolean }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {copy && items.length > 0 && <CopyButton text={items.join('\n')} label="Copy all" />}
      </div>
      <BulletList items={items} />
    </div>
  );
}
