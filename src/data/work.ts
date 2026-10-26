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
  status: 'live' | 'complete';
  metrics?: Metric[];
  external?: boolean;
}

const radarDays = Object.keys(import.meta.glob('./papers/*.json')).length;

export const selected: WorkItem[] = [
  {
    slug: 'realtime-recs',
    href: '/projects/realtime-recs',
    title: 'Real time game recommender',
    summary:
      'A two stage recommender I took from a Python research prototype to a TypeScript service. It updates as players play, stays inside a latency budget, applies guardrails and is tested to match the prototype.',
    stack: ['TypeScript', 'Python', 'LightGBM', 'Node'],
    status: 'live',
    metrics: [
      { value: '+23%', label: 'better NDCG@10 than the best single model' },
      { value: '4 ms', label: 'p99 latency inside the service' },
      { value: '34', label: 'tests, including parity with Python' },
    ],
  },
  {
    slug: 'ai-paper-radar',
    href: '/projects/ai-paper-radar',
    title: 'AI paper radar',
    summary:
      'A daily pipeline that scores every new AI paper on arXiv for relevance and novelty, ranks them and publishes the list with a full archive.',
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
      'Experiments with a model that answers with calibrated yes or no, choice and score values instead of text, so code can act on the answer without parsing it.',
    stack: ['Jev', 'Python'],
    status: 'complete',
  },
];

export const experiments: WorkItem[] = [
  {
    slug: 'five-trolleys-jev',
    href: '/projects/five-trolleys-jev',
    title: 'Five trolleys',
    summary: 'Five ethical dilemmas run through a typed decision API, with the framework, difficulty and a yes or no verdict for each.',
    stack: ['Jev', 'Python'],
    status: 'complete',
  },
  {
    slug: 'daily-media-update',
    href: '/projects/daily-media-update',
    title: 'Daily morning briefing',
    summary: 'An automated audio briefing written from my email, reminders and AI news, then read aloud by text to speech.',
    stack: ['GPT-4o', 'OpenAI TTS', 'Python'],
    status: 'complete',
  },
  {
    slug: 'self-rag-pipeline',
    href: '/projects/self-rag-pipeline',
    title: 'Self RAG pipeline',
    summary: 'A RAG workflow that grades the documents it retrieves, checks its answer for hallucinations and validates it before replying.',
    stack: ['LangGraph', 'Groq', 'Chroma'],
    status: 'complete',
  },
  {
    slug: 'ai-anime-chatbot-with-rag',
    href: '/projects/ai-anime-chatbot-with-rag',
    title: 'RAG chatbot with web search',
    summary: 'Scrapes a page into a vector store, adds web search, and says whether each answer came from the page or the search.',
    stack: ['LangChain', 'FAISS', 'Groq'],
    status: 'complete',
  },
  {
    slug: 'quiz-generator-with-llama',
    href: '/projects/quiz-generator-with-llama',
    title: 'Quiz generator',
    summary: 'Turns any text into multiple choice questions as structured JSON, with a difficulty setting and automatic scoring.',
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
    title: 'Fine tuning GPT 2 with LoRA',
    summary: 'Parameter efficient fine tuning that trains only 0.24% of the parameters.',
    stack: ['PEFT', 'PyTorch'],
    status: 'complete',
  },
  {
    slug: 'finetune-t5-small-summarization',
    href: '/projects/finetune-t5-small-summarization',
    title: 'T5 small for summarisation',
    summary: 'Sequence to sequence fine tuning for summarising dialogue.',
    stack: ['Transformers'],
    status: 'complete',
  },
  {
    slug: 'variational-autoencoders-mnist',
    href: '/projects/variational-autoencoders-mnist',
    title: 'Conditional VAE',
    summary: 'Generates digits on demand, with reparameterisation and KL divergence written from scratch.',
    stack: ['PyTorch'],
    status: 'complete',
  },
  {
    slug: 'next-word-prediction-lstm',
    href: '/projects/next-word-prediction-lstm',
    title: 'Next word prediction with an LSTM',
    summary: 'Autoregressive text generation written from scratch.',
    stack: ['PyTorch'],
    status: 'complete',
  },
];

export const career = [
  { years: '2026 to now', org: 'Flutter UK & Ireland', role: 'AI Engineer, Automation Transformation and AI' },
  { years: '2023 to 2026', org: 'Flutter UK & Ireland', role: 'Software Engineer' },
  { years: '2020 to 2023', org: 'Marks & Spencer', role: 'Associate Consultant' },
  { years: '2017 to 2019', org: 'Best Buy', role: 'Assistant Consultant, leading the connected apps team' },
  { years: '2012 to 2016', org: 'Capgemini', role: 'Technical Lead' },
  { years: '2010 to 2012', org: 'Early career', role: 'Software engineer, Ahmedabad' },
];
