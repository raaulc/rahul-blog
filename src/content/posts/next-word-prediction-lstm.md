---
title: Next Word Prediction using LSTM
date: 2025-01-15
description: Build a next word prediction model from scratch using an LSTM in PyTorch, trained on Medium article titles. The same core idea behind every language model.
tags: ["llm-architecture", "pytorch", "lstm", "deep-learning"]
type: llm-architecture
---

---

## Your phone is reading your mind. Or is it?

You start typing *"I'll be there in a..."* and your keyboard immediately suggests **minute**. **sec**. **bit**.

How does it know?

It doesn't. It just learned patterns from millions of sentences — and it's doing one thing really well:

> **Given what came before, guess what comes next.**

That's it. That's the whole idea. And in this post, we are going to build exactly that — from scratch — using an LSTM in PyTorch.

---

## Wait. What even IS next word prediction?

Think of it like this.

You're playing a word game. Someone says:

> *"A Step-by-Step Implementation of ____"*

You'd probably say **gradient** or **neural** or **backpropagation**, right? Because you've read enough tech articles to know what words usually follow that phrase.

That's exactly what we're training our model to do. Read thousands of sentences. Learn the patterns. Fill in the blank.

---

## 1. The Data — Medium Article Titles

We're not training on Shakespeare. We're training on **6,508 Medium article titles**.

Titles like:

- *A Beginner's Guide to Word Embedding with Gensim*
- *Hands-on Graph Neural Networks with PyTorch*
- *How to Use ggplot2 in Python*

Why titles? They're short. They're clean. They follow predictable patterns. Perfect training data for a first LSTM project.

We grab the `title` column and smash all titles into one big newline-separated document.

```python
document = '\n'.join(df['title'].dropna().astype(str))
```

Simple. Now we have one massive string of text to learn from.

---

## 2. Tokenization — Breaking Text into Pieces

Neural networks don't understand words. They understand **numbers**.

So the first job is to split the text into tokens (words), and then map every token to a unique number.

```
"How to Use ggplot2" → ["how", "to", "use", "ggplot2"] → [4, 7, 22, 309]
```

We use NLTK's `word_tokenize` and build a vocabulary from scratch:

```python
vocab = {'<unk>': 0}

for token in Counter(tokens).keys():
    if token not in vocab:
        vocab[token] = len(vocab)
```

After scanning all titles → **8,347 unique tokens** in our vocabulary.

---

## 3. Building Training Sequences — The Secret Sauce

This is where the magic happens. Pay attention.

For every sentence, we don't just use it once. We break it into **every possible prefix**:

```
sentence → [1, 2, 3, 4, 5]

training examples:
  [1, 2]          → predict 2 given 1
  [1, 2, 3]       → predict 3 given 1,2
  [1, 2, 3, 4]    → predict 4 given 1,2,3
  [1, 2, 3, 4, 5] → predict 5 given 1,2,3,4
```

Every example: **input = all tokens except last, label = last token**.

From 6,508 titles we squeeze out **55,467 training sequences**. That's 8x more data without collecting a single extra sentence.

---

## 4. Padding — Making Everything the Same Size

Our sequences have different lengths. The longest is **51 tokens**. Neural networks need fixed-size inputs.

Solution? **Left-pad with zeros.**

```
[1, 2]          → [0, 0, 0, ..., 0, 1, 2]       ← 51 tokens total
[1, 2, 3, 4]    → [0, 0, 0, ..., 0, 1, 2, 3, 4]  ← 51 tokens total
```

Then we split into X and y:

```python
X = padded[:, :-1]  # everything except last token  → input
y = padded[:, -1]   # only the last token            → what to predict
```

---

## 5. The LSTM Model — Here's the Brain

Three layers. That's all.

```
Token Indices
      ↓
[ Embedding Layer ]   vocab → 100 dimensions
      ↓
[   LSTM Layer    ]   100 → 150 hidden dims
      ↓
[   Linear Layer  ]   150 → vocab_size (8347)
      ↓
Predicted Next Word
```

**Embedding Layer** — Turns token indices into dense vectors. Words with similar meanings end up with similar vectors. The model learns this automatically.

**LSTM Layer** — Reads the sequence and remembers context. After processing all input tokens, the **final hidden state** is a compact summary of everything the model just read.

**Linear Layer** — Takes that summary and produces a score for every word in the vocabulary. Highest score = predicted next word.

```python
class LSTMModel(nn.Module):

    def __init__(self, vocab_size):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, 100)
        self.lstm = nn.LSTM(100, 150, batch_first=True)
        self.fc = nn.Linear(150, vocab_size)

    def forward(self, x):
        embedded = self.embedding(x)
        _, (final_hidden_state, _) = self.lstm(embedded)
        output = self.fc(final_hidden_state.squeeze(0))
        return output
```

---

## 6. Training — Letting the Model Learn

**50 epochs. Adam optimizer. CrossEntropyLoss.**

For every batch the loop does four things:

1. Forward pass → get predictions
2. Compute loss → how wrong were we?
3. Backward pass → figure out what to fix
4. Update weights → get slightly better

```python
for epoch in range(epochs):
    total_loss = 0
    for batch_x, batch_y in dataloader:
        optimizer.zero_grad()
        output = model(batch_x)
        loss = criterion(output, batch_y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    print(f"Epoch: {epoch + 1}, Loss: {total_loss:.4f}")
```

Watch the loss fall:

```
Epoch 1  → Loss: 10989
Epoch 10 → Loss: 3063
Epoch 25 → Loss: 1022
Epoch 50 → Loss: 879
```

The model is learning. Fast.

---

## 7. Making Predictions

The `prediction` function takes any text, tokenizes and pads it, runs it through the model, and returns the input with the predicted next word appended.

```python
prediction(model, vocab, "Databricks: How to Save Files in")
# → "Databricks: How to Save Files in csv"

prediction(model, vocab, "A Step-by-Step Implementation of")
# → "A Step-by-Step Implementation of gradient"
```

It works.

---

## 8. Autoregressive Generation — The Full Loop

Now the fun part. We feed each prediction back as the next input — this is called **autoregressive generation**. The same trick used by GPT.

```python
input_text = "A Step-by-Step Implementation of"

for i in range(10):
    input_text = prediction(model, vocab, input_text)
    print(input_text)
```

Output:
```
A Step-by-Step Implementation of gradient
A Step-by-Step Implementation of gradient descent
A Step-by-Step Implementation of gradient descent and
A Step-by-Step Implementation of gradient descent and backpropagation
A Step-by-Step Implementation of gradient descent and backpropagation has
...
```

One word at a time. Just like your keyboard. Just like ChatGPT.

---

## The Big Picture

Here's what you just built:

| Step | What happened |
|------|--------------|
| Load data | 6,508 Medium titles as training corpus |
| Tokenize | Every word → unique integer |
| Build sequences | 55,467 input-output pairs via prefix generation |
| Pad | All sequences padded to length 51 |
| Model | Embedding → LSTM → Linear |
| Train | 50 epochs, loss drops from 10k → 879 |
| Predict | Autoregressive next-word generation |

This is the **exact same core idea** behind every language model ever built. The scale is different. The architecture evolves. But the task — **predict the next token** — never changes.

You just built the foundation of modern AI.

---

*Built with PyTorch · Trained on Medium article titles · LSTM from scratch*
