import type { AnalysisReport } from '../../types/analysis';
import { scoreTone } from '../../utils/score';
import { BulletList, Card, CopyButton, Quote, ScoreBar, ScoreRing, Stat, TagList } from '../ui';

export function QualityTab({ report }: { report: AnalysisReport }) {
  const { quality, readability } = report;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card title="Content quality">
          <div className="flex flex-col items-center">
            <ScoreRing score={quality.score} size={130} tone={scoreTone(quality.score)} label="/100" />
            <p className="mt-3 text-center text-xs text-slate-500">Average of 12 dimensions: clarity, accuracy signals, usefulness, specificity, originality, readability, flow, grammar, sentence & paragraph length, redundancy and filler.</p>
          </div>
        </Card>
        <Card title="Quality dimensions">
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {quality.dimensions.map((d) => (
              <ScoreBar key={d.label} label={d.label} score={d.score} note={d.note} />
            ))}
          </div>
        </Card>
      </div>

      <Card title={`Readability: ${readability.score}/100`} subtitle={`${readability.difficulty} · Flesch reading ease ${readability.fleschEase} · US grade level ${readability.gradeLevel}`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Reading difficulty" value={<span className="text-base">{readability.difficulty}</span>} />
          <Stat label="Avg sentence" value={`${readability.avgSentenceLength} w`} hint="Aim ~15–20" />
          <Stat label="Avg paragraph" value={`${readability.avgParagraphWords} w`} hint={`${readability.longParagraphs} over 120 words`} />
          <Stat label="Passive voice" value={`${readability.passivePercent}%`} hint={`${readability.passiveCount} sentence(s)`} />
          <Stat label="Complex sentences" value={readability.complexSentences} hint="25+ words or 4+ commas" />
          <Stat label="Grade level" value={readability.gradeLevel} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Complex terms / jargon</h4>
            <TagList items={readability.jargon} tone="fair" empty="No heavy jargon detected." />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Passive voice examples</h4>
            <BulletList items={readability.passiveExamples.map((p) => `“${p}”`)} empty="No passive constructions detected." />
          </div>
        </div>
        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">The {readability.hardest.length} hardest sentences, with simpler versions</h4>
          {readability.hardest.length ? (
            <ol className="space-y-4">
              {readability.hardest.map((h, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      #{i + 1} · {h.words} words · {h.reason}
                    </span>
                    {!h.suggestion.startsWith('Manual edit') && <CopyButton text={h.suggestion} />}
                  </div>
                  <Quote tone="warn">{h.original}</Quote>
                  <div className="mt-2">
                    {h.suggestion.startsWith('Manual edit') ? <p className="text-sm italic text-slate-600">{h.suggestion}</p> : <Quote tone="good">{h.suggestion}</Quote>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">No particularly hard sentences found.</p>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title={`Grammar & spelling (${quality.grammar.length})`} subtitle="Rule-based checks; proofread before publishing">
          {quality.grammar.length ? (
            <ul className="space-y-3">
              {quality.grammar.map((g, i) => (
                <li key={i} className="text-sm">
                  <div className="font-medium text-slate-800">{g.issue}</div>
                  <div className="mt-0.5 text-slate-500">“{g.original}”</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No common grammar or spelling issues detected.</p>
          )}
        </Card>
        <Card title={`Redundancy (${quality.redundancy.length})`}>
          <BulletList items={quality.redundancy} empty="No redundant phrases or repeated sentences." />
        </Card>
        <Card title="Filler words">
          {quality.filler.length ? (
            <TagList items={quality.filler.map((f) => `${f.phrase} ×${f.count}`)} tone="fair" />
          ) : (
            <p className="text-sm text-slate-500">Minimal filler.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
