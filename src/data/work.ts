// Single source for the work page and the homepage's selected work.
// Metrics must be measured numbers from the project itself, never estimates.

export interface Metric {
  value: string;
  label: string;
}

export interface WorkItem {
  slug: string;
  href: string;
  title: string;
  summary: string;
  stack: string[];
  status: 'live' | 'complete' | 'in progress';
  metrics?: Metric[];
  external?: boolean;
}

const radarDays = Object.keys(import.meta.glob('./papers/*.json')).length;

export const selected: WorkItem[] = [
  {
    slug: 'realtime-recs',
    href: '/projects/realtime-recs',
    title: 'Real-time game recommender',
    summary:
      'A two-stage recommender taken from a Python research prototype to a TypeScript service: real-time updates from play events, a latency budget, guardrails and a parity test against the prototype.',
    stack: ['TypeScript', 'Python', 'LightGBM', 'AWS (next)'],
    status: 'in progress',
    metrics: [
      { value: '+23%', label: 'NDCG@10 over best single model' },
      { value: '4 ms', label: 'p99 in-process latency' },
      { value: '34', label: 'tests incl. Python parity' },
    ],
  },
  {
    slug: 'ai-paper-radar',
    href: '/projects/ai-paper-radar',
    title: 'AI paper radar',
    summary:
      'A daily ranking pipeline over new arXiv AI papers. Each paper is scored for relevance and novelty with a typed-decision model, ranked, and published with a browsable archive.',
    stack: ['Python', 'Jev', 'GitHub Actions'],
    status: 'live',
    metrics: [
      { value: `${radarDays}`, label: 'daily rankings published' },
      { value: '4', label: 'arXiv categories scored' },
      { value: '0', label: 'manual steps per day' },
    ],
  },
  {
    slug: 'jev',
    href: '/jev',
    title: 'Typed AI decisions with Jev',
    summary:
      'Experiments with a model that returns calibrated yes/no, choice and score answers instead of text, so software can act on them directly without parsing.',
    stack: ['Jev', 'Python'],
    status: 'complete',
  },
];

export const experiments: WorkItem[] = [
  {
    slug: 'five-trolleys-jev',
    href: '/projects/five-trolleys-jev',
    title: 'Five trolleys',
    summary: 'Five ethical dilemmas run through a typed-decision API: framework, difficulty and a yes/no verdict for each.',
    stack: ['Jev', 'Python'],
    status: 'complete',
  },
  {
    slug: 'daily-media-update',
    href: '/projects/daily-media-update',
    title: 'Daily morning briefing',
    summary: 'A fully automated audio briefing written from email, reminders and AI news, read aloud by text-to-speech.',
    stack: ['GPT-4o', 'OpenAI TTS', 'Python'],
    status: 'complete',
  },
  {
    slug: 'self-rag-pipeline',
    href: '/projects/self-rag-pipeline',
    title: 'Self-RAG pipeline',
    summary: 'A RAG workflow that grades its own retrieved documents, checks its answer for hallucinations and validates it before returning.',
    stack: ['LangGraph', 'Groq', 'Chroma'],
    status: 'complete',
  },
  {
    slug: 'ai-anime-chatbot-with-rag',
    href: '/projects/ai-anime-chatbot-with-rag',
    title: 'RAG chatbot with web search',
    summary: 'Scrapes a URL into a vector store, augments with web search, and cites whether each answer came from retrieval or search.',
    stack: ['LangChain', 'FAISS', 'Groq'],
    status: 'complete',
  },
  {
    slug: 'quiz-generator-with-llama',
    href: '/projects/quiz-generator-with-llama',
    title: 'Quiz generator',
    summary: 'Generates multiple-choice questions from any text as structured JSON, with difficulty control and auto-scoring.',
    stack: ['Llama 4', 'Groq', 'Streamlit'],
    status: 'complete',
  },
  {
    slug: 'presentations',
    href: '/presentations',
    title: 'System design walkthroughs',
    summary: 'Slide walkthroughs of agentic AI pipelines and their architecture.',
    stack: ['Architecture'],
    status: 'complete',
  },
];

export const notebooks: WorkItem[] = [
  {
    slug: 'fine-tuning-gpt2-peft-lora',
    href: '/projects/fine-tuning-gpt2-peft-lora',
    title: 'Fine-tuning GPT-2 with LoRA',
    summary: 'Parameter-efficient fine-tuning: 0.24% of parameters trained.',
    stack: ['PEFT', 'PyTorch'],
    status: 'complete',
  },
  {
    slug: 'finetune-t5-small-summarization',
    href: '/projects/finetune-t5-small-summarization',
    title: 'T5-small for summarisation',
    summary: 'Seq2seq fine-tuning on dialogue summarisation.',
    stack: ['Transformers'],
    status: 'complete',
  },
  {
    slug: 'variational-autoencoders-mnist',
    href: '/projects/variational-autoencoders-mnist',
    title: 'Conditional VAE',
    summary: 'Generating digits on demand; reparameterisation and KL divergence from scratch.',
    stack: ['PyTorch'],
    status: 'complete',
  },
  {
    slug: 'next-word-prediction-lstm',
    href: '/projects/next-word-prediction-lstm',
    title: 'Next-word prediction with an LSTM',
    summary: 'Autoregressive generation from scratch.',
    stack: ['PyTorch'],
    status: 'complete',
  },
];

export const career = [
  { years: '2026 –', org: 'Flutter UK & Ireland', role: 'AI Engineer, Automation Transformation and AI' },
  { years: '2023 – 2026', org: 'Flutter UK & Ireland', role: 'Software Engineer' },
  { years: '2020 – 2023', org: 'Marks & Spencer', role: 'Associate Consultant' },
  { years: '2017 – 2019', org: 'Best Buy', role: 'Assistant Consultant, leading the connected apps team' },
  { years: '2012 – 2016', org: 'Capgemini', role: 'Technical Lead' },
  { years: '2010 – 2012', org: 'Early career', role: 'Software engineer, Ahmedabad' },
];
