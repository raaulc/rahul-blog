import { useState } from 'react';
import { useStore } from '../store';
import type { View } from '../nav';
import { WEEK_DAYS, todayStr, weekDayIndex } from '../lib/date';
import {
  activeDaysInWeek,
  completionsOn,
  isQuestDone,
  periodCompletion,
  streak,
  xpThisWeek,
  xpTotal,
} from '../lib/xp';
import { levelForXp } from '../lib/levels';
import { Card, CheckBox, Note, Pill, ProgressBar, Stat } from '../components/ui';
import FocusOverlay from '../components/FocusOverlay';

export default function Home({ go }: { go: (v: View) => void }) {
  const { data, actions } = useStore();
  const [focusOpen, setFocusOpen] = useState(false);
  const today = todayStr();

  const total = xpTotal(data);
  const lvl = levelForXp(total);
  const st = streak(data);
  const weekXp = xpThisWeek(data);
  const activeDays = activeDaysInWeek(data);
  const doneToday = completionsOn(data, today);

  const dailyQuests = data.quests.filter((q) => q.cadence === 'daily');
  const focus = data.focus && data.focus.date === today ? data.focus : null;

  const toggleQuest = (questId: string) => {
    const q = data.quests.find((x) => x.id === questId);
    if (!q) return;
    if (isQuestDone(data, q.id, q.cadence)) {
      const c = periodCompletion(data, q.id, q.cadence);
      if (c) actions.undoCompletion(c.id);
    } else {
      actions.completeQuest(q.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main mission */}
      <Card accent>
        <div className="label">Main mission</div>
        {data.choose.mainMission ? (
          <p className="mt-1.5 text-[15px] font-medium leading-snug">{data.choose.mainMission}</p>
        ) : (
          <button className="btn-outline mt-2" onClick={() => go('choose')}>
            Set your main mission
          </button>
        )}
        {data.choose.currentFocus && (
          <p className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-400">
            Current focus: {data.choose.currentFocus}
          </p>
        )}
      </Card>

      {/* Today's one thing */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="label">Today&rsquo;s one thing</div>
          {focus && (
            <button className="btn-ghost -mr-2 py-1" onClick={() => actions.clearFocus()}>
              Change
            </button>
          )}
        </div>

        {focus ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-medium">{focus.title}</p>
              <p className="text-[12px] text-neutral-400">{focus.xp} XP</p>
            </div>
            <button className="btn-primary" onClick={() => setFocusOpen(true)}>
              Focus
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Pick one. It can be small.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dailyQuests.map((q) => (
                <button
                  key={q.id}
                  className="btn-outline py-1.5"
                  onClick={() => {
                    actions.setFocus(q.id);
                    setFocusOpen(true);
                  }}
                >
                  {q.title}
                </button>
              ))}
              {dailyQuests.length === 0 && (
                <button className="btn-outline" onClick={() => go('play')}>
                  Add quests
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      <Note>
        {doneToday.length === 0
          ? 'One meaningful quest is enough for today.'
          : `You've moved today (${doneToday.length} done). Anything more is a bonus.`}
      </Note>

      {st.state === 'broken' && data.completions.length > 0 && (
        <Note>Resume the game today. The goal is consistency, not perfection.</Note>
      )}
      {st.state === 'pending-today' && (
        <Note>
          Streak alive at {st.count} {st.count === 1 ? 'day' : 'days'}. One quest today keeps it
          going &mdash; no pressure to do more.
        </Note>
      )}

      {/* Today's quests */}
      <Card>
        <div className="label mb-2">Today&rsquo;s quests</div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {dailyQuests.map((q) => {
            const done = isQuestDone(data, q.id, q.cadence);
            return (
              <div key={q.id} className="flex items-center gap-3 py-2.5">
                <CheckBox checked={done} onChange={() => toggleQuest(q.id)} />
                <span className={`flex-1 text-sm ${done ? 'text-neutral-400 line-through' : ''}`}>
                  {q.title}
                </span>
                <Pill>{q.xp} XP</Pill>
              </div>
            );
          })}
          {dailyQuests.length === 0 && (
            <p className="py-2 text-sm text-neutral-400">
              No daily quests yet.{' '}
              <button className="underline" onClick={() => go('play')}>
                Add one
              </button>
              .
            </p>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Level</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">Lv {lvl.current.level}</div>
          <div className="mt-1 truncate text-[11px] text-neutral-400">{lvl.current.name}</div>
          <div className="mt-1.5">
            <ProgressBar pct={lvl.pct} />
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            {lvl.next ? `${lvl.toNext} XP to Lv ${lvl.next.level}` : 'Top level'}
          </div>
        </div>
        <Stat label="Weekly XP" value={weekXp} />
        <Stat
          label="Streak"
          value={`${st.count}d`}
          sub={st.state === 'active-today' ? 'today counted' : undefined}
        />
        <Stat label="Active days" value={`${activeDays}/7`} sub="this week" />
      </div>

      {/* Weekly shape */}
      <Card>
        <div className="label mb-2">This week&rsquo;s shape</div>
        <div className="grid grid-cols-7 gap-1">
          {WEEK_DAYS.map((day, i) => {
            const isToday = i === weekDayIndex(today);
            return (
              <div
                key={day}
                className={`rounded-md border p-1.5 text-center ${
                  isToday
                    ? 'border-indigo-600 dark:border-indigo-400'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <div className="text-[10px] uppercase text-neutral-400">{day.slice(0, 3)}</div>
                <div className="mt-0.5 text-[10px] leading-tight text-neutral-600 dark:text-neutral-300">
                  {data.choose.weekPlan[day] || '—'}
                </div>
              </div>
            );
          })}
        </div>
        <button
          className="mt-2 text-[12px] text-neutral-400 underline"
          onClick={() => go('choose')}
        >
          Edit weekly shape
        </button>
      </Card>

      {focusOpen && <FocusOverlay onClose={() => setFocusOpen(false)} />}
    </div>
  );
}
