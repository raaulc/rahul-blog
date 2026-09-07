import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Input, Note } from './ui';

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FocusOverlay({ onClose }: { onClose: () => void }) {
  const { data, actions } = useStore();
  const focus = data.focus;

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [targetMin, setTargetMin] = useState<number | ''>('');
  const [smaller, setSmaller] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftXp, setDraftXp] = useState<number>(0);
  const tick = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (focus) {
      setDraftTitle(focus.title);
      setDraftXp(focus.xp);
    }
  }, [focus?.questId]);

  useEffect(() => {
    if (running) {
      tick.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!focus) return null;

  const targetSeconds = targetMin === '' ? 0 : targetMin * 60;
  const targetReached = targetSeconds > 0 && elapsed >= targetSeconds;

  const applySmaller = () => {
    actions.reduceFocus({ title: draftTitle.trim() || focus.title, xp: draftXp });
    setSmaller(false);
  };

  const halve = () => {
    const next = Math.max(1, Math.round(focus.xp / 2));
    setDraftXp(next);
    actions.reduceFocus({ xp: next });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <div className="flex items-center justify-between">
          <span className="label">Focus</span>
          <button className="btn-ghost -mr-2" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-wide text-neutral-400">today&rsquo;s one thing</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{focus.title}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{focus.xp} XP</p>

          <div className="mt-8 font-mono text-5xl tabular-nums">{mmss(elapsed)}</div>
          {targetReached && (
            <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
              Target reached. Stop whenever you like.
            </p>
          )}

          <div className="mt-5 flex items-center gap-2">
            {!running ? (
              <button className="btn-primary px-6" onClick={() => setRunning(true)}>
                {elapsed === 0 ? 'Start' : 'Resume'}
              </button>
            ) : (
              <button className="btn-outline px-6" onClick={() => setRunning(false)}>
                Pause
              </button>
            )}
            {elapsed > 0 && (
              <button
                className="btn-ghost"
                onClick={() => {
                  setRunning(false);
                  setElapsed(0);
                }}
              >
                Reset
              </button>
            )}
          </div>

          <label className="mt-4 flex items-center gap-2 text-[13px] text-neutral-500 dark:text-neutral-400">
            optional target
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="min"
              value={targetMin}
              onChange={(e) =>
                setTargetMin(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))
              }
              className="input w-20 py-1 text-center"
            />
          </label>
        </div>

        {smaller ? (
          <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium">Make it smaller</p>
            <Note>
              Shrink it until it&rsquo;s almost too easy. A finished 10&nbsp;minutes beats an
              abandoned 45.
            </Note>
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="e.g. 10 minutes system design"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={draftXp}
                onChange={(e) => setDraftXp(Math.max(0, Number(e.target.value)))}
                className="input w-24"
              />
              <span className="text-sm text-neutral-500">XP</span>
              <button className="btn-ghost ml-auto" onClick={halve}>
                Halve XP
              </button>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={applySmaller}>
                Use smaller version
              </button>
              <button className="btn-ghost" onClick={() => setSmaller(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button
              className="btn-primary col-span-1"
              onClick={() => {
                actions.completeFocus(elapsed > 0 ? `${Math.round(elapsed / 60)} min` : undefined);
                onClose();
              }}
            >
              Complete
            </button>
            <button className="btn-outline" onClick={() => setSmaller(true)}>
              Make smaller
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                actions.clearFocus();
                onClose();
              }}
            >
              Skip
            </button>
          </div>
        )}
        <p className="mt-3 text-center text-[12px] text-neutral-400">
          Skipping has no penalty. Come back when it&rsquo;s smaller.
        </p>
      </div>
    </div>
  );
}
