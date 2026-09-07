import { useState } from 'react';
import { useStore } from '../store';
import {
  CADENCES,
  CATEGORIES,
  type Cadence,
  type Category,
  type Quest,
} from '../lib/types';
import { todayStr } from '../lib/date';
import {
  completionsOn,
  isQuestDone,
  periodCompletion,
  streak,
  xpThisMonth,
  xpThisWeek,
  xpToday,
  xpTotal,
} from '../lib/xp';
import { levelForXp } from '../lib/levels';
import {
  Card,
  CheckBox,
  Input,
  Note,
  Pill,
  ProgressBar,
  Select,
  Stat,
} from '../components/ui';
import FocusOverlay from '../components/FocusOverlay';

const categoryLabel = (v: Category) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
const cadenceLabel = (v: Cadence) => CADENCES.find((c) => c.value === v)?.label ?? v;

function QuestRow({
  quest,
  onFocus,
}: {
  quest: Quest;
  onFocus: () => void;
}) {
  const { data, actions } = useStore();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(quest.title);
  const [xp, setXp] = useState(quest.xp);
  const [cadence, setCadence] = useState<Cadence>(quest.cadence);
  const [category, setCategory] = useState<Category>(quest.category);

  const done = isQuestDone(data, quest.id, quest.cadence);

  const toggle = () => {
    if (done) {
      const c = periodCompletion(data, quest.id, quest.cadence);
      if (c) actions.undoCompletion(c.id);
    } else {
      actions.completeQuest(quest.id);
    }
  };

  const save = () => {
    actions.updateQuest(quest.id, {
      title: title.trim() || quest.title,
      xp: Math.max(0, Math.round(xp)),
      cadence,
      category,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2 py-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 text-sm">
            <span className="text-neutral-500">XP</span>
            <input
              type="number"
              min={0}
              value={xp}
              onChange={(e) => setXp(Math.max(0, Number(e.target.value)))}
              className="input w-20 py-1"
            />
          </label>
          <Select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Cadence)}
            className="w-auto py-1"
          >
            {CADENCES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-auto py-1"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={save}>
            Save
          </button>
          <button className="btn-ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button
            className="btn-ghost ml-auto text-red-600 dark:text-red-400"
            onClick={() => actions.deleteQuest(quest.id)}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="pt-0.5">
        <CheckBox checked={done} onChange={toggle} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done ? 'text-neutral-400 line-through' : ''}`}>{quest.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Pill>{quest.xp} XP</Pill>
          <Pill>{cadenceLabel(quest.cadence)}</Pill>
          <Pill>{categoryLabel(quest.category)}</Pill>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button className="btn-ghost px-2 py-1 text-[13px]" onClick={onFocus}>
          Focus
        </button>
        <button
          className="btn-ghost px-2 py-1 text-[13px]"
          onClick={() => {
            setTitle(quest.title);
            setXp(quest.xp);
            setCadence(quest.cadence);
            setCategory(quest.category);
            setEditing(true);
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function AddQuest() {
  const { actions } = useStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [xp, setXp] = useState(10);
  const [cadence, setCadence] = useState<Cadence>('daily');
  const [category, setCategory] = useState<Category>('other');

  if (!open) {
    return (
      <button className="btn-outline w-full" onClick={() => setOpen(true)}>
        + Add quest
      </button>
    );
  }

  return (
    <Card className="space-y-2">
      <Input
        autoFocus
        value={title}
        placeholder="Quest name — keep it small and concrete"
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-sm">
          <span className="text-neutral-500">XP</span>
          <input
            type="number"
            min={0}
            value={xp}
            onChange={(e) => setXp(Math.max(0, Number(e.target.value)))}
            className="input w-20 py-1"
          />
        </label>
        <Select
          value={cadence}
          onChange={(e) => setCadence(e.target.value as Cadence)}
          className="w-auto py-1"
        >
          {CADENCES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-auto py-1"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={!title.trim()}
          onClick={() => {
            actions.addQuest({ title: title.trim(), xp, cadence, category });
            setTitle('');
            setXp(10);
            setCadence('daily');
            setCategory('other');
            setOpen(false);
          }}
        >
          Add
        </button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

export default function Play() {
  const { data, actions } = useStore();
  const [focusOpen, setFocusOpen] = useState(false);
  const today = todayStr();

  const total = xpTotal(data);
  const lvl = levelForXp(total);
  const st = streak(data);
  const doneToday = completionsOn(data, today);

  const groups: { key: Cadence; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'once', label: 'One-time' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Today" value={xpToday(data)} />
        <Stat label="Week" value={xpThisWeek(data)} />
        <Stat label="Month" value={xpThisMonth(data)} />
        <Stat label="Total" value={total} />
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="label">Level {lvl.current.level}</div>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              {lvl.current.name}
            </p>
          </div>
          <span className="text-[12px] text-neutral-400">
            {lvl.next ? `${lvl.toNext} XP to Lv ${lvl.next.level}` : 'Top level'}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar pct={lvl.pct} />
        </div>
      </Card>

      <Card>
        <div className="label">Streak</div>
        <p className="mt-1 text-sm">
          <span className="text-lg font-semibold tabular-nums">{st.count}</span>{' '}
          {st.count === 1 ? 'day' : 'days'}
          {st.state === 'active-today' && (
            <span className="text-neutral-400"> · today counted</span>
          )}
        </p>
        {st.state === 'broken' && data.completions.length > 0 && (
          <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Resume the game today. The goal is consistency, not perfection.
          </p>
        )}
        {st.state === 'pending-today' && (
          <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Still alive. One quest today keeps it going.
          </p>
        )}
      </Card>

      <Note>
        {doneToday.length === 0
          ? 'One meaningful quest is enough for today. You do not need to clear the list.'
          : 'Enough for today is done. Keep going only if it feels good.'}
      </Note>

      {groups.map((g) => {
        const list = data.quests.filter((q) => q.cadence === g.key);
        if (list.length === 0) return null;
        return (
          <Card key={g.key}>
            <div className="label mb-1">{g.label}</div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {list.map((q) => (
                <QuestRow
                  key={q.id}
                  quest={q}
                  onFocus={() => {
                    actions.setFocus(q.id);
                    setFocusOpen(true);
                  }}
                />
              ))}
            </div>
          </Card>
        );
      })}

      <AddQuest />

      {doneToday.length > 0 && (
        <Card>
          <div className="label mb-2">Completed today</div>
          <div className="space-y-1.5">
            {doneToday
              .slice()
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-neutral-500 line-through dark:text-neutral-400">
                    {c.title}
                  </span>
                  <Pill>{c.xp} XP</Pill>
                  <button
                    className="btn-ghost px-2 py-0.5 text-[13px]"
                    onClick={() => actions.undoCompletion(c.id)}
                  >
                    Undo
                  </button>
                </div>
              ))}
          </div>
        </Card>
      )}

      {focusOpen && <FocusOverlay onClose={() => setFocusOpen(false)} />}
    </div>
  );
}
