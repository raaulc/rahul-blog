---
title: Quiz Generator with LLaMA 4
date: 2026-01-18
description: Build an MCQ quiz generator in ~100 lines — paste any text, pick a difficulty, and LLaMA 4 via Groq returns 5 multiple choice questions as structured JSON. Auto-scoring included.
tags: ["rag-system", "llama", "groq", "streamlit", "prompt-engineering"]
type: rag-system
---

---

## What if an AI could turn any text into a quiz in seconds?

![quiz excited gif](https://media.giphy.com/media/YwN32FEspx881B8TxE/giphy.gif)

Paste any content — a Wikipedia paragraph, a study note, a textbook excerpt — and get 5 multiple choice questions with difficulty control, auto-scoring, and instant feedback.

That's what we're building. One prompt, one JSON response, one Streamlit app.

---

## 1. The Idea — Prompt Engineering as the Core Logic

![thinking hard gif](https://media.giphy.com/media/DfSXiR60W9MVq/giphy.gif)

There's no fine-tuning here. No training. The entire "quiz generation" is a single, carefully constructed prompt sent to LLaMA 4 via Groq:

```python
prompt = f"""
    Text: {text_content}

    You are an expert quiz generator. Based on the above text_content,
    create 5 multiple choice questions with difficulty level '{quiz_level}'.

    Respond with ONLY valid JSON matching the format below.

    {json.dumps(sample_format, indent=2)}
"""
```

The model is constrained to output structured JSON — no explanation, no preamble. That's the entire engine.

---

## 2. The JSON Schema — Forcing Structured Output

![writing test gif](https://media.giphy.com/media/WUZShKJSZsc6untjmD/giphy.gif)

The prompt includes an explicit sample format the model must match:

```python
sample_format = {
    "mcqs": [
        {
            "mcq": "Sample question?",
            "options": {
                "a": "Option A",
                "b": "Option B",
                "c": "Option C",
                "d": "Option D"
            },
            "correct": "a"
        }
    ]
}
```

Every question has four options and a `correct` key pointing to the right letter. When parsed, `q["options"][q["correct"]]` gives the correct answer text directly — no mapping needed.

---

## 3. LLaMA 4 via Groq — Fast Inference

![fast speed gif](https://media.giphy.com/media/DlXbiu2ZgpHlC/giphy.gif)

Groq runs LLaMA 4 Scout on custom LPU hardware — inference is orders of magnitude faster than standard GPU serving:

```python
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

response = client.chat.completions.create(
    model="meta-llama/llama-4-scout-17b-16e-instruct",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3
)

content = response.choices[0].message.content.strip()
```

`temperature=0.3` keeps answers deterministic and factually grounded — you don't want a creative quiz generator hallucinating wrong answers.

---

## 4. Parsing the Response — Stripping Code Fences

![correct answer gif](https://media.giphy.com/media/ummeQH0c3jdm2o3Olp/giphy.gif)

LLMs sometimes wrap JSON in markdown code fences. Strip those before parsing:

```python
import re

content = re.sub(r"^```json|```$", "", content, flags=re.MULTILINE).strip()
questions = json.loads(content).get("mcqs", [])
```

If `json.loads` fails, the app surfaces an error — no silent failures.

---

## 5. The Quiz UI — Radio Buttons + Submit

![score results gif](https://media.giphy.com/media/6u6F5XIZlQP6GXMppy/giphy.gif)

Each question renders as a Streamlit radio group. Answers are collected, then checked on submit:

```python
for q in questions:
    opts = list(q["options"].values())
    selected = st.radio(q["mcq"], opts, index=None)
    selected_options.append(selected)
    correct_answers.append(q["options"][q["correct"]])

if st.button("Submit Answers"):
    score = 0
    for i, q in enumerate(questions):
        if selected_options[i] == correct_answers[i]:
            score += 1
    st.success(f"You scored {score} / {len(questions)}")
```

`index=None` means no option is pre-selected — the user must make an active choice for each question.

---

## 6. Caching — Don't Regenerate on Every Rerun

![brain explode gif](https://media.giphy.com/media/F458eKi7tpSqQ/giphy.gif)

Streamlit reruns the entire script on every interaction. Without caching, every button click would re-call the LLM:

```python
@st.cache_data
def fetch_questions_raw(text_content, quiz_level):
    ...
```

`@st.cache_data` memoises the function by its inputs. Same text + same difficulty = instant return from cache, no extra API call.

---

## The Full Pipeline

| Step | What happens |
|------|-------------|
| Input | User pastes any text + picks Easy / Medium / Hard |
| Prompt | Structured prompt with JSON schema sent to LLaMA 4 |
| Inference | Groq returns 5 MCQs as JSON in under a second |
| Parse | Strip code fences → `json.loads` → list of question dicts |
| UI | 5 radio groups, one per question |
| Score | Submit → compare selections to correct answers → show result |
| Cache | Same input? Served from cache, no LLM call |

The whole thing is ~100 lines. No vector store, no embeddings, no retrieval — just a well-crafted prompt and fast inference.

---

*Built with Groq · LLaMA 4 Scout · Streamlit · Python*
