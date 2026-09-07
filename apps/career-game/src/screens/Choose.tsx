import { useStore } from '../store';
import { WEEK_DAYS } from '../lib/date';
import { Card, Field, Input, Note, SectionTitle, TextArea } from '../components/ui';

export default function Choose() {
  const { data, actions } = useStore();
  const c = data.choose;

  return (
    <div className="space-y-4">
      <SectionTitle hint="One main mission at a time. Everything below is just that mission cut into smaller pieces.">
        Choose
      </SectionTitle>

      <Card accent>
        <Field label="Main mission">
          <Input
            value={c.mainMission}
            placeholder="e.g. Become interview-ready for Staff Engineer roles at a top company."
            className="text-[15px]"
            onChange={(e) => actions.updateChoose({ mainMission: e.target.value })}
          />
        </Field>
        <div className="mt-3">
          <Field label="Current focus" hint="A short phrase. What this season is really about.">
            <Input
              value={c.currentFocus}
              placeholder="e.g. Build consistency."
              onChange={(e) => actions.updateChoose({ currentFocus: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Note>
        Tempted to add a second mission? It&rsquo;s probably a 90-day goal. Put it below, or park it
        for later.
      </Note>

      <Card>
        <Field label="1-year goal">
          <TextArea
            value={c.oneYearGoal}
            placeholder="e.g. Be interview-ready and actively interviewing for Staff Engineer roles."
            onChange={(e) => actions.updateChoose({ oneYearGoal: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <Field label="Current 90-day goal">
          <TextArea
            value={c.ninetyDayGoal}
            placeholder="e.g. Build strong coding + system design foundations."
            onChange={(e) => actions.updateChoose({ ninetyDayGoal: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <Field label="This month&rsquo;s mission">
          <TextArea
            value={c.monthlyMission}
            placeholder="e.g. Complete 20 coding sessions and 8 system design sessions."
            onChange={(e) => actions.updateChoose({ monthlyMission: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <div className="label mb-2">Weekly shape</div>
        <div className="space-y-2">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[12px] uppercase text-neutral-400">{day}</span>
              <Input
                value={c.weekPlan[day]}
                placeholder="—"
                onChange={(e) => actions.setWeekPlanDay(day, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
