import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  CareerData,
  Cadence,
  Category,
  Quest,
  SeeData,
  ChooseData,
  Theme,
  VideoTopic,
  WeekDay,
  WeeklyReviewAnswers,
} from './lib/types';
import { clearData, importJson as parseImport, loadData, saveData } from './lib/storage';
import { seedData } from './lib/seed';
import { todayStr } from './lib/date';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
const stamp = () => new Date().toISOString();

export type TopicStep = 'learned' | 'canExplain' | 'recorded' | 'published';

export interface Actions {
  updateSee: (patch: Partial<SeeData>) => void;
  setOldStories: (v: string[]) => void;
  setNewStories: (v: string[]) => void;

  updateChoose: (patch: Partial<ChooseData>) => void;
  setWeekPlanDay: (day: WeekDay, value: string) => void;

  addQuest: (q: { title: string; xp: number; cadence: Cadence; category: Category }) => void;
  updateQuest: (id: string, patch: Partial<Omit<Quest, 'id'>>) => void;
  deleteQuest: (id: string) => void;

  completeQuest: (questId: string, opts?: { xp?: number; title?: string; note?: string }) => void;
  undoCompletion: (completionId: string) => void;

  setFocus: (questId: string) => void;
  reduceFocus: (patch: { title?: string; xp?: number }) => void;
  clearFocus: () => void;
  completeFocus: (note?: string) => void;

  addTopic: (topic: string) => void;
  toggleTopicStep: (id: string, step: TopicStep) => void;
  deleteTopic: (id: string) => void;

  saveWeeklyReview: (weekStart: string, answers: WeeklyReviewAnswers, reflection: string) => void;

  setTheme: (t: Theme) => void;
  importJson: (text: string) => void;
  resetAll: () => void;
}

interface StoreValue {
  data: CareerData;
  actions: Actions;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CareerData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Apply theme to <html>, remember choice.
  useEffect(() => {
    const t = data.settings.theme;
    const dark =
      t === 'dark' ||
      (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('career-game:theme', t);
    } catch {
      /* ignore */
    }
  }, [data.settings.theme]);

  // Track system theme while in 'system' mode.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (data.settings.theme === 'system') {
        document.documentElement.classList.toggle('dark', mq.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [data.settings.theme]);

  const patch = useCallback((fn: (d: CareerData) => CareerData) => setData(fn), []);

  const actions = useMemo<Actions>(
    () => ({
      updateSee: (p) =>
        patch((d) => ({ ...d, see: { ...d.see, ...p, updatedAt: stamp() } })),
      setOldStories: (v) =>
        patch((d) => ({ ...d, see: { ...d.see, oldStories: v, updatedAt: stamp() } })),
      setNewStories: (v) =>
        patch((d) => ({ ...d, see: { ...d.see, newStories: v, updatedAt: stamp() } })),

      updateChoose: (p) =>
        patch((d) => ({ ...d, choose: { ...d.choose, ...p, updatedAt: stamp() } })),
      setWeekPlanDay: (day, value) =>
        patch((d) => ({
          ...d,
          choose: {
            ...d.choose,
            weekPlan: { ...d.choose.weekPlan, [day]: value },
            updatedAt: stamp(),
          },
        })),

      addQuest: (q) =>
        patch((d) => ({
          ...d,
          quests: [...d.quests, { ...q, id: uid('q'), createdAt: stamp() }],
        })),
      updateQuest: (id, p) =>
        patch((d) => ({
          ...d,
          quests: d.quests.map((q) => (q.id === id ? { ...q, ...p } : q)),
        })),
      deleteQuest: (id) =>
        patch((d) => ({
          ...d,
          quests: d.quests.filter((q) => q.id !== id),
          focus: d.focus && d.focus.questId === id ? null : d.focus,
        })),

      completeQuest: (questId, opts) =>
        patch((d) => {
          const q = d.quests.find((x) => x.id === questId);
          if (!q) return d;
          return {
            ...d,
            completions: [
              ...d.completions,
              {
                id: uid('c'),
                questId,
                title: opts?.title ?? q.title,
                xp: Math.max(0, Math.round(opts?.xp ?? q.xp)),
                category: q.category,
                date: todayStr(),
                at: stamp(),
                note: opts?.note,
              },
            ],
          };
        }),
      undoCompletion: (completionId) =>
        patch((d) => ({
          ...d,
          completions: d.completions.filter((c) => c.id !== completionId),
        })),

      setFocus: (questId) =>
        patch((d) => {
          const q = d.quests.find((x) => x.id === questId);
          if (!q) return d;
          return { ...d, focus: { date: todayStr(), questId, title: q.title, xp: q.xp } };
        }),
      reduceFocus: (p) =>
        patch((d) =>
          d.focus
            ? {
                ...d,
                focus: {
                  ...d.focus,
                  ...(p.title !== undefined ? { title: p.title } : {}),
                  ...(p.xp !== undefined ? { xp: Math.max(0, Math.round(p.xp)) } : {}),
                },
              }
            : d,
        ),
      clearFocus: () => patch((d) => ({ ...d, focus: null })),
      completeFocus: (note) =>
        patch((d) => {
          if (!d.focus) return d;
          const q = d.quests.find((x) => x.id === d.focus!.questId);
          return {
            ...d,
            completions: [
              ...d.completions,
              {
                id: uid('c'),
                questId: d.focus.questId,
                title: d.focus.title,
                xp: d.focus.xp,
                category: q?.category ?? 'other',
                date: todayStr(),
                at: stamp(),
                note,
              },
            ],
            focus: null,
          };
        }),

      addTopic: (topic) =>
        patch((d) => ({
          ...d,
          topics: [
            ...d.topics,
            {
              id: uid('t'),
              topic,
              learned: false,
              canExplain: false,
              recorded: false,
              published: false,
              createdAt: stamp(),
            },
          ],
        })),
      toggleTopicStep: (id, step) =>
        patch((d) => ({
          ...d,
          topics: d.topics.map((t) => (t.id === id ? { ...t, [step]: !t[step] } : t)),
        })),
      deleteTopic: (id) =>
        patch((d) => ({ ...d, topics: d.topics.filter((t) => t.id !== id) })),

      saveWeeklyReview: (weekStart, answers, reflection) =>
        patch((d) => {
          const existing = d.weeklyReviews.find((w) => w.weekStart === weekStart);
          const record = {
            id: existing?.id ?? uid('w'),
            weekStart,
            answers,
            reflection,
            updatedAt: stamp(),
          };
          return {
            ...d,
            weeklyReviews: existing
              ? d.weeklyReviews.map((w) => (w.weekStart === weekStart ? record : w))
              : [...d.weeklyReviews, record],
          };
        }),

      setTheme: (t) => patch((d) => ({ ...d, settings: { ...d.settings, theme: t } })),
      importJson: (text) => setData(parseImport(text)),
      resetAll: () => {
        clearData();
        setData(seedData());
      },
    }),
    [patch],
  );

  return <StoreContext.Provider value={{ data, actions }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used within <StoreProvider>');
  return v;
}
