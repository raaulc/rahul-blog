---
title: Fine-tuning Google T5-Small on Summarization
date: 2025-04-20
description: Fine-tune T5-Small on the SAMSum dialogue dataset using HuggingFace Transformers. Covers tokenization, Trainer API, gradient accumulation, and inference with pipeline.
tags: ["llm-architecture", "fine-tuning", "t5", "huggingface", "transformers"]
type: llm-architecture
---

---

## Your model has no idea what a conversation looks like. Yet.

![confused robot gif](https://media.giphy.com/media/ukGm72ZLZvYfS/giphy.gif)

Out of the box, T5-Small can do a lot. Translation. Q&A. Classification. It's been pre-trained on a massive chunk of the internet.

But give it a messy chat conversation and ask it to summarize it?

It'll struggle.

That's where **fine-tuning** comes in. We take a pre-trained model and teach it one specific skill — summarizing dialogues — by training it on examples of exactly that.

This post walks through the entire process, from loading the model to generating summaries on a Luffy & Naruto conversation.

---

## 1. What is T5? And Why Fine-Tune It?

![explaining gif](https://media.giphy.com/media/2bYewTk7K2No1NvcuK/giphy.gif)

**T5 (Text-to-Text Transfer Transformer)** treats every NLP task as a text-to-text problem.

Not "classify this" or "tag that" — just:

> *Input text → Output text*

Translation? `"translate English to French: Hello"` → `"Bonjour"`.
Summarization? `"summarize: Long article..."` → `"Short summary"`.

The trick is the **task prefix**. T5 figures out what to do from the prefix you give it.

**T5-Small** has **60M parameters** — tiny enough to fine-tune on a consumer GPU in under 20 minutes.

---

## 2. The Dataset — SAMSum

![chatting gif](https://media.giphy.com/media/DJs8z6pvCDE3dHnyPn/giphy.gif)

We're using **SAMSum** — a dataset of ~16,000 messenger-style conversations, each paired with a human-written summary.

It looks like this:

```
Dialogue:
  Amanda: I baked some cookies. Do you want some?
  Jerry: Sure! I'll come over later.
  Amanda: Great, see you then!

Summary:
  Amanda baked cookies and invited Jerry over to have some.
```

Real conversations. Real summaries. Exactly what we need to teach the model to summarize chats.

```python
dataset = load_dataset("knkarthick/samsum")
```

---

## 3. Tokenization — Teaching the Model to Read

![reading fast gif](https://media.giphy.com/media/cYftRpHujRiZEFPN7T/giphy.gif)

Before training, every piece of text needs to become numbers. But for a seq2seq model like T5, we tokenize **both the input and the output**.

Two key things here:

**The prefix** — T5 needs to know what task it's doing. We prepend `"summarize: "` to every dialogue.

```python
inputs = ["summarize: " + dialogue for dialogue in dialogues]
```

**The lengths** — Dialogues can be long (up to 1024 tokens). Summaries are short (capped at 128 tokens).

```python
input_encoding  = tokenizer(inputs,  max_length=1024, truncation=True, padding="max_length")
target_encoding = tokenizer(targets, max_length=128,  truncation=True, padding="max_length")
```

The output is three things: `input_ids`, `attention_mask`, and `labels` (the target token ids).

---

## 4. Data Collator — The Smart Batcher

![stacking gif](https://media.giphy.com/media/QB9rH7NbUQfbN7wrf3/giphy.gif)

`DataCollatorForSeq2Seq` handles padding dynamically at batch time — padding each batch only to the length of its longest sequence, not the entire dataset's max length. More efficient, less memory wasted.

```python
seq2seq_collator = DataCollatorForSeq2Seq(tokenizer, model=model)
```

One line. It just works.

---

## 5. Training Arguments — Configuring the Run

![settings gif](https://media.giphy.com/media/lo4hWSPgBJLlUjGYeK/giphy.gif)

This is where you control how training behaves. Let's break down the important ones:

```python
training_args = TrainingArguments(
    num_train_epochs=1,                  # one full pass over the data
    per_device_train_batch_size=1,       # 1 sample per step (GPU memory constraint)
    gradient_accumulation_steps=16,      # effective batch size = 1 × 16 = 16
    warmup_steps=500,                    # gradually ramp up learning rate for 500 steps
    weight_decay=0.01,                   # L2 regularization to prevent overfitting
    report_to="none"                     # don't log to wandb/tensorboard
)
```

**Gradient accumulation** is the clever trick here. The GPU can only fit 1 sample at a time, but we accumulate gradients over 16 steps before updating — simulating a batch size of 16 without needing the memory for it.

---

## 6. The Trainer — Everything in One Place

![assembling gif](https://media.giphy.com/media/ABVK96HgZvWI9SBbXr/giphy.gif)

HuggingFace's `Trainer` takes everything we've built and runs the full training loop for us.

```python
trainer = Trainer(
    model=model,
    args=training_args,
    tokenizer=tokenizer,
    data_collator=seq2seq_collator,
    train_dataset=tokenized_dataset["train"],
    eval_dataset=tokenized_dataset["validation"]
)
```

No manual epoch loops. No manual gradient zeroing. No manual loss.backward(). Just:

```python
trainer.train()
```

After ~920 steps and ~19 minutes of training, final loss: **1.66**.

---

## 7. Save & Reload

![saving gif](https://media.giphy.com/media/lZfieM3rRK5ZTMOnNd/giphy.gif)

Save the fine-tuned model and tokenizer to disk — so you never have to train again.

```python
model.save_pretrained("t5_samsum_finetuned_model")
tokenizer.save_pretrained("t5_samsum_tokenizer")
```

Reload them and wrap in a `pipeline` for dead-simple inference:

```python
summarizer = pipeline("summarization", model=model, tokenizer=tokenizer)
```

The `pipeline` handles tokenization, model call, and decoding — all under the hood.

---

## 8. Does It Work?

![drumroll gif](https://media.giphy.com/media/ItItdif4XcSiSNw9Zh/giphy.gif)

Let's test it on something the model has never seen — a conversation between Luffy and Naruto:

```
Luffy: Naruto! You won the ramen eating contest again?!
Naruto: Believe it, Luffy! Ichiraku's secret menu is my new training ground.
Luffy: I trained by eating 20 meat-on-the-bone last night.
Naruto: Hey, wanna team up for a mission? Lost treasure in the Hidden Mist village.
Luffy: Treasure?! I'm in! Let's GO!!!
Naruto: Dattebayo!!!
```

```python
result = summarizer(sample_text, max_length=100, min_length=30, do_sample=False)
```

**`do_sample=False`** means greedy decoding — always pick the highest probability token. Deterministic, consistent output every time.

The model produces a clean, coherent summary of a dialogue it has never encountered. Not bad for 60M parameters trained for one epoch.

---

## The Big Picture

![mind blown gif](https://media.giphy.com/media/rmbShHymFugZMltnsg/giphy.gif)

Here's what happened end to end:

| Step | What we did |
|------|-------------|
| Model | Loaded T5-Small (60M params) from HuggingFace |
| Dataset | SAMSum — 16k dialogue-summary pairs |
| Tokenize | Prepend `"summarize: "`, encode inputs (1024) + labels (128) |
| Collator | Dynamic padding per batch |
| Training | 1 epoch · batch size 16 (via grad accumulation) · loss: 1.66 |
| Save | Model + tokenizer saved to disk |
| Inference | `pipeline("summarization")` — one call, done |

Fine-tuning is how you take a general-purpose model and make it excellent at one specific thing. Same idea used to build every task-specific LLM you've ever used.

---

*Fine-tuned with HuggingFace Transformers · SAMSum dataset · T5-Small (60M params)*
