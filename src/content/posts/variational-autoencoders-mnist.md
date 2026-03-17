---
title: Variational Autoencoders on MNIST
date: 2026-03-17
description: Build a Conditional VAE in PyTorch that generates handwritten digits on demand. Covers the reparameterisation trick, KL divergence loss, and conditional generation.
tags: ["llm-architecture", "vae", "generative-models", "pytorch", "mnist"]
type: llm-architecture
---

---

## What if you could just… invent new handwriting?

![excited gif](https://media.giphy.com/media/PUBxelwT57jsQ/giphy.gif)

Not copy it. Not trace it. Genuinely **generate** a brand new handwritten digit that has never existed before — but looks completely real.

That's what a Variational Autoencoder does. And in this post, we're going to build one from scratch in PyTorch, trained on MNIST, that can generate any digit on demand.

---

## 1. What Even Is an Autoencoder?

![thinking gif](https://media.giphy.com/media/toXKzaJP3WIgM/giphy.gif)

Before we get to the *variational* part, let's understand the base concept.

An **autoencoder** is a neural network with two jobs:

```
Input image (784 pixels)
        ↓
   [ Encoder ]  →  Latent vector z (small, compressed)
        ↓
   [ Decoder ]  →  Reconstructed image (784 pixels)
```

You train it to reconstruct its own input. The encoder is forced to compress the image into a small bottleneck — and the decoder learns to rebuild it from that compressed form.

The problem? The latent space is **patchy**. Points between encoded examples decode into garbage. You can't sample freely. You can't generate.

---

## 2. The Variational Trick

![settings gif](https://media.giphy.com/media/ArCYM3Lw29e2nE1K1O/giphy.gif)

Instead of encoding an image to a **single point** `z`, a VAE encodes it to a **distribution**: a mean `μ` and a variance `σ²`.

```
Input image
     ↓
  Encoder
     ↓
  μ  and  logvar   ← two separate outputs
     ↓
  Sample z = μ + ε × σ   where ε ~ N(0,1)
     ↓
  Decoder → reconstructed image
```

This is the **reparameterisation trick** — it makes sampling differentiable so gradients can flow back through it.

Because training forces the distributions to overlap and stay close to a standard Gaussian, the latent space becomes **smooth and continuous**. Any random point you sample will decode into something meaningful.

---

## 3. Making It Conditional

![reading gif](https://media.giphy.com/media/g2lH60ZcvUGL6/giphy.gif)

A standard VAE generates random digits — you have no control over which one comes out.

A **Conditional VAE (CVAE)** fixes this. We append a one-hot class label to both the encoder input and the decoder input:

```python
def one_hot(labels, num_classes=10):
    return F.one_hot(labels, num_classes).float()
```

Now the model knows *which digit* it's encoding and which one it should generate. Tell it `digit=7`, it generates a 7.

---

## 4. The Dataset — MNIST

![loading gif](https://media.giphy.com/media/GQty4dYXeVkOeMzqVx/giphy.gif)

60,000 grayscale images of handwritten digits, 28×28 pixels, 10 classes.

```python
train_dataset = datasets.MNIST(root='./data', train=True, download=True, transform=transforms.ToTensor())
train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)
```

Each pixel value is between 0 and 1 (after ToTensor). This is important — the decoder uses Sigmoid as its final activation, which also outputs values in [0,1].

---

## 5. The CVAE Architecture

![robot gif](https://media.giphy.com/media/o2ITDLRkP2oGk/giphy.gif)

Three parts. Clean and simple.

**Encoder:**
```
Input: 784 (image) + 10 (label) = 794 dims
  → Linear(794, 400) → ReLU
  → fc_mu:     Linear(400, 20)   ← mean
  → fc_logvar: Linear(400, 20)   ← log variance
```

**Reparameterise:**
```python
std = torch.exp(0.5 * logvar)
eps = torch.randn_like(std)
z   = mu + eps * std
```

**Decoder:**
```
Input: 20 (z) + 10 (label) = 30 dims
  → Linear(30, 400) → ReLU
  → Linear(400, 784) → Sigmoid
  → reshape to (1, 28, 28)
```

The label is concatenated at *both* ends — encoder and decoder — so the model conditions its entire process on which digit it's working with.

---

## 6. The Loss Function — Two Terms

![training gif](https://media.giphy.com/media/HMzHH3J2RbHzPbRJH5/giphy.gif)

The VAE loss is the sum of two things:

```python
BCE = F.binary_cross_entropy(recon_x, x, reduction='sum')
KLD = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
loss = BCE + KLD
```

**BCE (Reconstruction Loss)** — how well the decoder rebuilt the original image. Lower = better reconstruction.

**KL Divergence** — how close the learned distribution is to `N(0,1)`. This is the regulariser. Without it, the encoder could just memorise exact points and the latent space would collapse back into a regular autoencoder.

The two terms are in tension — BCE wants to memorise, KLD wants to generalise. The balance between them is what creates a smooth, generative latent space.

---

## 7. Training

![working gif](https://media.giphy.com/media/Jl1Q9APSZVA3ATKrdM/giphy.gif)

100 epochs. Adam. lr=1e-3. Batch size 128.

```python
for epoch in range(epochs):
    for imgs, labels in train_loader:
        labels_onehot = one_hot(labels).to(device)
        optimizer.zero_grad()
        recon, mu, logvar = model(imgs, labels_onehot)
        loss = loss_function(recon, imgs, mu, logvar)
        loss.backward()
        optimizer.step()
```

Watch the loss drop:

```
Epoch   1  → Loss: 162.79
Epoch  11  → Loss: 102.25
Epoch  21  → Loss:  99.71
Epoch  51  → Loss:  97.11
Epoch  91  → Loss:  95.72
```

---

## 8. Generate on Demand

![wow gif](https://media.giphy.com/media/99tK62nC8tb9e/giphy.gif)

Sample a random `z` from `N(0,1)`, condition on a digit, decode:

```python
def show_generated_digit(model, digit=4):
    z = torch.randn(1, latent_dim).to(device)
    labels = one_hot(torch.tensor([digit]), num_classes).to(device)
    generated = model.decode(z, labels).cpu()
    plt.imshow(generated[0].squeeze(), cmap='gray')
    plt.show()
```

Pass `digit=4` → get a 4. `digit=7` → get a 7. Every call returns a different sample because `z` is random each time.

The model has learned the *concept* of each digit — not just the training images.

---

## The Big Picture

![mind blown gif](https://media.giphy.com/media/3OSo3PPaXdw0U/giphy.gif)

| Step | What we did |
|------|-------------|
| Dataset | MNIST — 60k handwritten digit images |
| Model | Conditional VAE — encoder + reparameterise + decoder |
| Conditioning | One-hot labels appended at encoder and decoder inputs |
| Loss | BCE (reconstruction) + KL Divergence (regularisation) |
| Train | 100 epochs · Adam · loss: 162 → 95 |
| Generate | Sample z ~ N(0,1), condition on digit, decode |

VAEs sit at the intersection of deep learning and probabilistic modelling. The latent space isn't just a compressed representation — it's a **learned probability distribution** over the space of possible images.

Everything after this — diffusion models, GANs, multimodal generators — builds on this same foundational idea.

---

*Built with PyTorch · MNIST dataset · Conditional VAE from scratch*
