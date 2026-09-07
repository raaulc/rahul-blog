import { useState } from 'react';
import { useStore, type TopicStep } from '../store';
import type { VideoTopic } from '../lib/types';
import { Card, CheckBox, Input, Note, SectionTitle } from '../components/ui';

const STEPS: { key: TopicStep; label: string }[] = [
  { key: 'learned', label: 'Learned' },
  { key: 'canExplain', label: 'Can explain' },
  { key: 'recorded', label: 'Recorded' },
  { key: 'published', label: 'Published' },
];

function nextStep(topics: VideoTopic[]): string | null {
  for (const t of topics) {
    if (!t.learned) return `Learn: ${t.topic}`;
    if (!t.canExplain) return `Get to where you can explain it: ${t.topic}`;
    if (!t.recorded) return `Record 3–5 min: ${t.topic}`;
    if (!t.published) return `Publish: ${t.topic}`;
  }
  return null;
}

export default function Learn() {
  const { data, actions } = useStore();
  const [newTopic, setNewTopic] = useState('');
  const step = nextStep(data.topics);

  return (
    <div className="space-y-4">
      <SectionTitle hint="Learn → Explain → Record → Publish. Publishing is a sequence of small steps, not one big task.">
        Learn
      </SectionTitle>

      {step && (
        <Card accent>
          <div className="label">Your next small step</div>
          <p className="mt-1 text-[15px] font-medium">{step}</p>
        </Card>
      )}

      <Card>
        <div className="flex gap-2">
          <Input
            value={newTopic}
            placeholder="Add a topic — e.g. Consistent Hashing"
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTopic.trim()) {
                actions.addTopic(newTopic.trim());
                setNewTopic('');
              }
            }}
          />
          <button
            className="btn-primary shrink-0"
            disabled={!newTopic.trim()}
            onClick={() => {
              actions.addTopic(newTopic.trim());
              setNewTopic('');
            }}
          >
            Add
          </button>
        </div>
      </Card>

      <div className="space-y-3">
        {data.topics.map((t) => {
          const doneCount = STEPS.filter((s) => t[s.key]).length;
          return (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-medium">{t.topic}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] text-neutral-400">{doneCount}/4</span>
                  <button
                    className="btn-ghost px-2 py-0.5"
                    aria-label="Delete topic"
                    onClick={() => actions.deleteTopic(t.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STEPS.map((s) => (
                  <CheckBox
                    key={s.key}
                    size="sm"
                    checked={t[s.key]}
                    label={s.label}
                    onChange={() => actions.toggleTopicStep(t.id, s.key)}
                  />
                ))}
              </div>
            </Card>
          );
        })}
        {data.topics.length === 0 && (
          <Note>No topics yet. Add the first thing you keep meaning to explain.</Note>
        )}
      </div>

      <Note>
        You&rsquo;ve wanted to make videos for years. The task isn&rsquo;t &ldquo;make a
        video&rdquo; &mdash; it&rsquo;s tick the next box.
      </Note>
    </div>
  );
}
