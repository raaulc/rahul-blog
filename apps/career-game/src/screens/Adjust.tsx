import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { WeeklyReviewAnswers } from '../lib/types';
import { addDays, prettyWeekRange, todayStr, weekStartStr } from '../lib/date';
import { weeklyStats } from '../lib/xp';
import { exportJson } from '../lib/storage';
import { Card, Field, Note, SectionTitle, Stat, TextArea } from '../components/ui';

const EMPTY: WeeklyReviewAnswers = {
  wanted: '',
  actuallyPrioritized: '',
  worked: '',
  avoidedBecause: '',
  tooBig: '',
  timingBad: '',
  makeSmaller: '',
  oneThing: '',
};

const QUESTIONS: { key: keyof WeeklyReviewAnswers; q: string }[] = [
  { key: 'wanted', q: 'What did I say I wanted this week?' },
  { key: 'actuallyPrioritized', q: 'What did my actions show I actually prioritized?' },
  { key: 'worked', q: 'What worked?' },
  { key: 'avoidedBecause', q: 'What made me avoid the work?' },
  { key: 'tooBig', q: 'Was the task too big?' },
  { key: 'timingBad', q: 'Was the timing bad?' },
  { key: 'makeSmaller', q: 'What should I make smaller next week?' },
  { key: 'oneThing', q: 'What is the ONE most important thing next week?' },
];

export default function Adjust() {
  const { data, actions } = useStore();
  const [weekStart, setWeekStart] = useState(() => weekStartStr(todayStr()));
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const existing = data.weeklyReviews.find((w) => w.weekStart === weekStart);
  const [answers, setAnswers] = useState<WeeklyReviewAnswers>(existing?.answers ?? EMPTY);
  const [reflection, setReflection] = useState(existing?.reflection ?? '');
  const [savedAt, setSavedAt] = useState<string | null>(existing ? existing.updatedAt : null);

  // when the selected week changes, reload its saved content
  const loadWeek = (ws: string) => {
    setWeekStart(ws);
    const rev = data.weeklyReviews.find((w) => w.weekStart === ws);
    setAnswers(rev?.answers ?? EMPTY);
    setReflection(rev?.reflection ?? '');
    setSavedAt(rev ? rev.updatedAt : null);
  };

  const stats = useMemo(() => weeklyStats(data, weekStart), [data, weekStart]);
  const isThisWeek = weekStart === weekStartStr(todayStr());

  const save = () => {
    actions.saveWeeklyReview(weekStart, answers, reflection);
    setSavedAt(new Date().toISOString());
  };

  const download = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `career-game-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <SectionTitle hint="Once a week, look at what actually happened and shrink next week's plan. Not a report card.">
        Adjust
      </SectionTitle>

      <Card>
        <div className="flex items-center justify-between">
          <button className="btn-ghost px-2" onClick={() => loadWeek(addDays(weekStart, -7))}>
            ← prev
          </button>
          <div className="text-center">
            <div className="text-sm font-medium">{prettyWeekRange(weekStart)}</div>
            <div className="text-[11px] text-neutral-400">
              {isThisWeek ? 'this week' : 'past week'}
            </div>
          </div>
          <button
            className="btn-ghost px-2 disabled:opacity-30"
            disabled={isThisWeek}
            onClick={() => loadWeek(addDays(weekStart, 7))}
          >
            next →
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Quests done" value={stats.questsCompleted} />
        <Stat label="XP" value={stats.xp} />
        <Stat label="Active days" value={`${stats.activeDays}/7`} />
        <Stat label="Coding" value={stats.codingSessions} />
        <Stat label="System design" value={stats.systemDesignSessions} />
        <Stat label="Videos recorded" value={stats.videosRecorded} sub="all-time" />
        <Stat label="Videos published" value={stats.videosPublished} sub="all-time" />
      </div>

      <Note>
        Plan → Act → Observe → Adjust → Try Again. A plan that failed is data, not a verdict. If
        &ldquo;45 minutes after work&rdquo; keeps failing, the fix is &ldquo;20 minutes before
        work&rdquo; &mdash; not &ldquo;I&rsquo;m lazy.&rdquo;
      </Note>

      <Card className="space-y-3">
        {QUESTIONS.map(({ key, q }) => (
          <Field key={key} label={q}>
            <TextArea
              value={answers[key]}
              onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
            />
          </Field>
        ))}
        <Field label="Weekly reflection">
          <TextArea
            value={reflection}
            placeholder="A few honest sentences."
            onChange={(e) => setReflection(e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save}>
            Save review
          </button>
          {savedAt && (
            <span className="text-[12px] text-neutral-400">
              saved {new Date(savedAt).toLocaleString()}
            </span>
          )}
        </div>
      </Card>

      {data.weeklyReviews.length > 0 && (
        <Card>
          <div className="label mb-2">Past reviews</div>
          <div className="space-y-1">
            {data.weeklyReviews
              .slice()
              .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
              .map((w) => (
                <button
                  key={w.id}
                  className="flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => loadWeek(w.weekStart)}
                >
                  <span className="shrink-0 text-[12px] tabular-nums text-neutral-400">
                    {prettyWeekRange(w.weekStart)}
                  </span>
                  <span className="truncate text-[13px]">
                    {w.answers.oneThing || w.reflection || '—'}
                  </span>
                </button>
              ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="label mb-2">Data</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={download}>
            Export JSON
          </button>
          <button className="btn-outline" onClick={() => setShowImport((s) => !s)}>
            Import
          </button>
          <button
            className="btn-ghost text-red-600 dark:text-red-400"
            onClick={() => {
              if (confirm('Reset all Career Game data to the starting sample?')) actions.resetAll();
            }}
          >
            Reset
          </button>
        </div>
        {showImport && (
          <div className="mt-3 space-y-2">
            <TextArea
              value={importText}
              placeholder="Paste an exported career-game JSON here"
              onChange={(e) => setImportText(e.target.value)}
            />
            <button
              className="btn-primary"
              disabled={!importText.trim()}
              onClick={() => {
                try {
                  actions.importJson(importText);
                  setImportText('');
                  setShowImport(false);
                } catch {
                  alert('That did not parse as valid JSON.');
                }
              }}
            >
              Load
            </button>
          </div>
        )}
        <p className="mt-2 text-[12px] text-neutral-400">
          Everything is stored in this browser only (localStorage). Export is your backup.
        </p>
      </Card>
    </div>
  );
}
