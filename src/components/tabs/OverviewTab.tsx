import type { AnalysisReport } from '../../types/analysis';
import { CONTENT_TYPE_LABELS, INDUSTRY_LABELS } from '../../engine/lexicon';
import { AnnotatedContent } from '../AnnotatedContent';
import { IssueCard } from '../IssueCard';
import { BulletList, Card, ScoreBar, Stat } from '../ui';

export function OverviewTab({ report, locate, onLocate, onViewAll }: { report: AnalysisReport; locate: string | null; onLocate: (t: string) => void; onViewAll: () => void }) {
  const { scores, stats, input } = report;
  const top = report.issues.filter((i) => i.severity === 'must' || i.severity === 'should').slice(0, 6);

  const strongest = [
    { k: 'SEO', v: scores.seo },
    { k: 'Human writing', v: scores.human },
    { k: 'Search intent', v: scores.searchIntent },
    { k: 'Readability', v: scores.readability },
    { k: 'E-E-A-T', v: scores.eeat },
    { k: 'Originality', v: scores.originality },
    { k: 'Content quality', v: scores.quality },
  ].sort((a, b) => b.v - a.v);

  const summary: string[] = [
    `This ${CONTENT_TYPE_LABELS[input.contentType].toLowerCase()} (${stats.words} words, ${INDUSTRY_LABELS[input.industry]}) scores ${scores.overall}/100 overall.`,
    `Strongest area: ${strongest[0].k} (${strongest[0].v}). Weakest: ${strongest[strongest.length - 1].k} (${strongest[strongest.length - 1].v}).`,
    `AI-likeness is estimated at ${scores.aiLikeness}% (${report.ai.band}, ${report.ai.confidence.toLowerCase()} confidence). Treat this as a writing-quality signal, not proof of authorship.`,
    report.compliance.flags.length
      ? `${report.compliance.flags.length} ${report.compliance.applicable ? 'potential compliance risk' : 'advertising-claim'} flag(s); overall compliance risk ${scores.complianceRisk}.`
      : 'No compliance-risk wording detected.',
    `${report.claims.filter((c) => c.evidenceNeeded).length} claim(s) need supporting evidence. Spam / over-optimisation risk: ${scores.spamRisk}.`,
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card title="Executive summary" subtitle="What an editor or client should know first">
          <BulletList items={summary} />
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Words" value={stats.words.toLocaleString()} />
            <Stat label="Sentences" value={stats.sentences} />
            <Stat label="Paragraphs" value={stats.paragraphs} />
            <Stat label="Headings" value={stats.headings} />
            <Stat label="Links" value={stats.links} />
            <Stat label="Read time" value={`${stats.readingTimeMin} min`} />
          </div>
        </Card>
        <Card title="Score breakdown">
          <div className="space-y-3">
            <ScoreBar label="SEO" score={scores.seo} />
            <ScoreBar label="Search intent" score={scores.searchIntent} />
            <ScoreBar label="Human writing" score={scores.human} />
            <ScoreBar label="Readability" score={scores.readability} />
            <ScoreBar label="E-E-A-T" score={scores.eeat} />
            <ScoreBar label="Originality / specificity" score={scores.originality} />
            <ScoreBar label="Content quality" score={scores.quality} />
            <ScoreBar label={report.pageType.title.replace(' Analysis', '')} score={report.pageType.score} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">AI-likeness is shown separately and is not used as a penalty in the overall score.</p>
        </Card>
      </div>

      {report.llmNotes && report.llmNotes.length > 0 && (
        <Card title="Editor notes from Claude review" subtitle="Page-specific observations. Verify before sharing with the client.">
          <BulletList items={report.llmNotes} />
        </Card>
      )}

      <Card
        title="Top priority issues"
        subtitle="Click an issue to see the original text, problem and suggested fix"
        action={
          <button type="button" onClick={onViewAll} className="text-sm font-medium text-indigo-600 hover:underline">
            View full action plan →
          </button>
        }
      >
        {top.length ? (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {top.map((i) => (
              <IssueCard key={i.id} issue={i} onLocate={onLocate} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No must-fix or high-priority issues. See Recommendations for refinements.</p>
        )}
      </Card>

      <AnnotatedContent report={report} locate={locate} />
    </div>
  );
}
