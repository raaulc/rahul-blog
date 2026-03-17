---
title: Fine-Tuning GPT-2 with PEFT-LoRA
date: 2026-03-17
description: Fine-tune GPT-2 on English quotes using LoRA adapters — only 0.24% of parameters trained. Covers LoRA theory, PEFT setup, FP16 training, and inference.
tags: ["llm-architecture", "fine-tuning", "lora", "peft", "gpt2"]
type: llm-architecture
---

---

## Fine-tuning a 117M parameter model. On a budget. In 4 minutes.

![efficient gif](https://media.giphy.com/media/ZVik7pIojeZ0I/giphy.gif)

Full fine-tuning GPT-2 means updating every single one of its 117 million parameters. That's expensive. Slow. And honestly, overkill.

What if you could get 90% of the result by only training **0.1% of the parameters**?

That's exactly what **LoRA** does. And in this post, we're going to use it to fine-tune GPT-2 on a dataset of English quotes — turning a generic language model into one that writes in the style of great thinkers.

---

## 1. What is LoRA?

![confused but curious gif](https://media.giphy.com/media/077i6AULCiC4Dxf9Mm/giphy.gif)

**LoRA (Low-Rank Adaptation)** is a technique for fine-tuning large models without touching their original weights.

Here's the idea:

Instead of modifying the existing weight matrix `W`, you freeze it and inject two tiny matrices `A` and `B` next to it:

```
output = W·x  +  (B·A)·x
         ↑           ↑
   frozen (no grad)  only these train
```

`A` and `B` are **low-rank** — much smaller than `W`. That's why training is so fast and cheap.

After training, you just save `A` and `B`. The base model is untouched. You can swap adapters in and out without reloading the whole model.

**PEFT** (Parameter-Efficient Fine-Tuning) is the HuggingFace library that makes LoRA (and other efficient methods) plug-and-play.

---

## 2. The Dataset — English Quotes

![quotes gif](https://media.giphy.com/media/xT9Iglju6fXgKSEFuQ/giphy.gif)

We're using the **English Quotes** dataset — 2,508 famous quotes from authors, philosophers, and thinkers.

Lines like:

> *"The only way to do great work is to love what you do."*
> *"In the middle of every difficulty lies opportunity."*

We split it 90/10 into train and validation:

```python
dataset_split = dataset["train"].train_test_split(test_size=0.1, seed=42)
```

2,257 quotes for training. 251 for validation. Small dataset — perfect for a quick LoRA run.

---

## 3. Tokenizer — One Quirk to Know

![gotcha gif](https://media.giphy.com/media/1msBlkFW4VHDRleNNW/giphy.gif)

GPT-2 has no pad token by default. Batching requires all sequences to be the same length, which means padding — so we assign the `eos_token` as a fake pad token:

```python
tokenizer.pad_token = tokenizer.eos_token
```

One line. Without it, training crashes.

For tokenization, we pad and truncate everything to **64 tokens** and set `labels = input_ids`. For causal language modelling, the model learns to predict the next token — the Trainer handles the 1-position label shift internally.

```python
def tokenize(batch):
    tokenized = tokenizer(batch["quote"], padding="max_length", truncation=True, max_length=64)
    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized
```

---

## 4. Load GPT-2 in FP16

![loading gif](https://media.giphy.com/media/Fn2S3MQ0gWgOe/giphy.gif)

We load GPT-2 in **half precision (FP16)** — uses half the memory of FP32, trains faster on modern GPUs.

```python
model = AutoModelForCausalLM.from_pretrained(
    "gpt2",
    torch_dtype=torch.float16,
    device_map="auto"
)
```

`device_map="auto"` lets HuggingFace figure out GPU placement automatically. On multi-GPU setups it splits layers across cards.

---

## 5. LoRA Config — The Key Settings

![settings gif](https://media.giphy.com/media/xT9IgIzmCUAHKhKE8o/giphy.gif)

This is where we define the adapter:

```python
lora_config = LoraConfig(
    r=8,                        # rank — size of the low-rank matrices
    lora_alpha=16,              # scaling factor (effective lr multiplier)
    target_modules=["c_attn"],  # inject into GPT-2's attention layers
    lora_dropout=0.05,          # regularization
    bias="none",
    task_type="CAUSAL_LM"
)
```

**`r=8`** — Each adapter is two matrices of shape `(d × 8)` and `(8 × d)` instead of `(d × d)`. Much smaller.

**`target_modules=["c_attn"]`** — We only inject LoRA into the attention projection (`c_attn` is GPT-2's combined QKV matrix). The FFN layers stay completely frozen.

**`get_peft_model`** freezes all original weights and wraps the model with LoRA layers:

```python
model = get_peft_model(model, lora_config)
# trainable params: 294,912 || all params: 124,734,720 || trainable%: 0.24
```

Only **0.24%** of parameters are being trained. Everything else is frozen.

---

## 6. Training

![training gif](https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif)

**5 epochs. Learning rate 2e-4. Batch size 8 (4 × grad accumulation 2). FP16.**

```python
trainer.train()
```

Done in **~217 seconds**. Final training loss: **1.75**.

Compare that to full fine-tuning which would take hours on the same hardware.

---

## 7. Save Only the Adapter

![saving gif](https://media.giphy.com/media/26BoEiQmzfg2rrkqA/giphy.gif)

This is the beauty of LoRA. When you save, you only save the adapter — not the full 548MB GPT-2 base model.

```python
model.save_pretrained("lora-gpt2")
tokenizer.save_pretrained("lora-gpt2")
```

The `lora-gpt2/` folder contains just a few MB of adapter weights. The base model is separate and reusable across different LoRA checkpoints.

---

## 8. Inference — Load Base + Adapter

![drumroll gif](https://media.giphy.com/media/l0Iy5BxBa5LNBM16I/giphy.gif)

To run inference, reload the base model and attach the adapter with `PeftModel`:

```python
base_model = AutoModelForCausalLM.from_pretrained("gpt2", ...)
model = PeftModel.from_pretrained(base_model, "lora-gpt2")
```

Then wrap it in a `text-generation` pipeline and generate:

```python
prompt = "The secret to happiness is"
outputs = text_gen(prompt, max_new_tokens=70, do_sample=True, temperature=0.7)
```

Output:
```
The secret to happiness is not fear, but determination, determination and the
willingness to work hard. You don't have to be a doctor to do this, but you can do it.
```

Sounds like something you'd read on a motivational poster. The quotes dataset is clearly shaping the output.

---

## The Big Picture

![mind blown gif](https://media.giphy.com/media/OK27newijj2goq6Nea/giphy.gif)

| Step | What we did |
|------|-------------|
| Model | GPT-2 (117M params) loaded in FP16 |
| Dataset | 2,508 English quotes, 90/10 split |
| Tokenize | Pad to 64 tokens, labels = input_ids |
| LoRA | r=8, target `c_attn` — only 0.24% params trained |
| Train | 5 epochs, ~217s, loss: 1.75 |
| Save | Adapter only — a few MB, not 548MB |
| Inference | Load base + adapter via PeftModel |

LoRA changes the economics of fine-tuning. You don't need 8 A100s and 3 days. You need one GPU, a few hundred examples, and about 4 minutes.

---

*Fine-tuned with PEFT-LoRA · English Quotes dataset · GPT-2 (117M params)*
