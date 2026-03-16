# Gemini Image Generator

SillyTavern third-party extension for AI image generation via [Gemini API OneClick](https://github.com/shleeshlee/gemini-api-oneclick) gateway.

> **Author:** WanWan | **License:** MIT

## Install

Open SillyTavern, go to **Extensions** > **Install Extension**, paste:

```
https://github.com/shleeshlee/gemini-image
```

## Uninstall

Extensions > Manage Extensions > find "Gemini Image Generator" > Delete.

## Features

- **41 built-in styles** — Gemini official styles (Cinematic, Anime, Ghibli, etc.) + common art styles
- **Aspect ratio** — 1:1 / 16:9 / 9:16 / 3:2 / 2:3
- **Quality** — Standard / HD
- **Auto-generate** — Automatically generate images for each AI reply
- **Per-swipe binding** — Each swipe keeps its own image, survives navigation
- **Smart prompt optimization** — Expands brief descriptions into vivid scene narratives without overriding style settings
- **Style analysis** — Upload a reference image, analyze its artistic rendering style, save as custom preset
- **U-shape style wrapping** — Style descriptors wrap around the content prompt (before + after) for better Gemini compliance
- **Dual model selection** — Separate model choices for prompt optimization and image generation
- **Image toolbar** — Hover to zoom / download / regenerate

## Prerequisites

This extension requires a running [Gemini API OneClick](https://github.com/shleeshlee/gemini-api-oneclick) gateway.

### Setting up the Gateway

1. Deploy the gateway on your server:
   ```bash
   bash <(curl -Ls https://raw.githubusercontent.com/shleeshlee/gemini-api-oneclick/main/scripts/install.sh)
   ```
2. Follow the 5-step wizard to configure containers, API key, and port
3. Deploy your Gemini cookies via the gateway management panel
4. Make sure the gateway is accessible from your SillyTavern instance

For detailed gateway setup, see the [Gemini API OneClick README](https://github.com/shleeshlee/gemini-api-oneclick#readme).

## Setup

1. Install the extension (see above)
2. Open extension settings panel > **Gemini Image Generator**
3. Enable the extension
4. Set your **Gateway URL** (e.g. `https://your-domain.com` or `http://your-ip:9880`) and **API key**
5. (Optional) Click **Fetch Models** to select specific models for prompt optimization and image generation
6. Choose a style, ratio, and quality
7. Click **Generate for last message** or enable auto-generate

## How It Works

```
User prompt ("a girl with long hair")
  ↓
Prompt Optimization (optional, expands scene details only)
  ↓
U-shape Style Wrapping: [style] + [content] + [style]
  ↓
Gateway → Container → Gemini Web API → Generated Image
  ↓
Attached to AI message with per-swipe binding
```
