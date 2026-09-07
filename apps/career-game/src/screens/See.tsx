import { useStore } from '../store';
import { Card, Field, Input, Note, SectionTitle, TextArea } from '../components/ui';

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={it}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            className="btn-ghost px-2"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button className="btn-outline" onClick={() => onChange([...items, ''])}>
        + Add
      </button>
    </div>
  );
}

export default function See() {
  const { data, actions } = useStore();
  const see = data.see;

  return (
    <div className="space-y-4">
      <SectionTitle hint="Look at where you are, where this road ends, and where you want to go instead. Edit anything — it saves automatically.">
        See
      </SectionTitle>

      <Card>
        <Field label="Current situation">
          <TextArea
            value={see.currentSituation}
            onChange={(e) => actions.updateSee({ currentSituation: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <Field
          label="Anti-vision — 5 years if nothing changes"
          hint="Be specific and a little uncomfortable. This is the pull, not the plan."
        >
          <TextArea
            value={see.antiVision}
            onChange={(e) => actions.updateSee({ antiVision: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <Field label="Vision — what you want it to look like">
          <TextArea
            value={see.vision}
            onChange={(e) => actions.updateSee({ vision: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <div className="label mb-2">Stories I&rsquo;m retiring</div>
        <EditableList
          items={see.oldStories}
          onChange={actions.setOldStories}
          placeholder="e.g. I start things and don't finish."
        />
      </Card>

      <Card>
        <div className="label mb-2">Stories I&rsquo;m building</div>
        <EditableList
          items={see.newStories}
          onChange={actions.setNewStories}
          placeholder="e.g. I finish small things consistently."
        />
      </Card>

      <Note>
        You don&rsquo;t change a story by arguing with it. You change it by collecting small pieces
        of evidence in <span className="font-medium">Play</span>.
      </Note>
    </div>
  );
}
