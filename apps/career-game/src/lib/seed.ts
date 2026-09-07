import type { CareerData } from './types';

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/**
 * Initial sample data. XP history starts empty on purpose — the point of the
 * app is to build real evidence, not inherit a fake streak.
 */
export function seedData(): CareerData {
  const now = new Date().toISOString();
  return {
    version: 1,
    see: {
      currentSituation:
        'Senior engineer, comfortable but coasting. I learn a lot but rarely ship my own things. I think about interviewing and about making videos, but keep postponing both.',
      antiVision:
        'Five years from now: same role, same company, same band. I still "could" go for Staff. Thirty half-finished side projects, zero published videos. I tell people I ran out of time.',
      vision:
        'Interview-ready and actively interviewing for Staff Engineer roles at a top company. I publish a short technical video most weeks. I finish small things by default. People come to me for system design.',
      oldStories: [
        "I start things and don't finish.",
        "I'm not good at interviews.",
        'I keep thinking about making videos but never publish.',
      ],
      newStories: [
        'I finish small things consistently.',
        'I am rebuilding my interview skills.',
        'I publish before I feel perfectly ready.',
      ],
      updatedAt: now,
    },
    choose: {
      mainMission: 'Become interview-ready for Staff Engineer roles at a top technology company.',
      currentFocus: 'Build consistency.',
      oneYearGoal: 'Be interview-ready and actively interviewing for Staff Engineer roles.',
      ninetyDayGoal: 'Build strong coding + system design foundations.',
      monthlyMission: 'Complete 20 coding sessions and 8 system design sessions.',
      weekPlan: {
        monday: 'Coding',
        tuesday: 'System design',
        wednesday: 'Coding',
        thursday: 'System design',
        friday: 'Coding',
        saturday: 'Record one short technical explanation',
        sunday: 'Rest / weekly review',
      },
      updatedAt: now,
    },
    quests: [
      { id: id('q'), title: '20 minutes coding', xp: 10, cadence: 'daily', category: 'coding', createdAt: now },
      { id: id('q'), title: '20 minutes system design', xp: 10, cadence: 'daily', category: 'system-design', createdAt: now },
      { id: id('q'), title: 'Write or review one Staff-level career story', xp: 10, cadence: 'daily', category: 'story', createdAt: now },
      { id: id('q'), title: 'Record a 3–5 minute technical explanation', xp: 20, cadence: 'weekly', category: 'video', createdAt: now },
      { id: id('q'), title: 'Publish one technical video', xp: 30, cadence: 'weekly', category: 'video', createdAt: now },
      { id: id('q'), title: 'Contact one useful person (recruiter / engineer)', xp: 15, cadence: 'weekly', category: 'outreach', createdAt: now },
    ],
    completions: [],
    focus: null,
    weeklyReviews: [],
    topics: [
      { id: id('t'), topic: 'Consistent Hashing', learned: true, canExplain: true, recorded: true, published: false, createdAt: now },
      { id: id('t'), topic: 'Idempotency keys in payment APIs', learned: true, canExplain: false, recorded: false, published: false, createdAt: now },
      { id: id('t'), topic: 'How a write-ahead log works', learned: false, canExplain: false, recorded: false, published: false, createdAt: now },
    ],
    settings: { theme: 'system' },
  };
}
