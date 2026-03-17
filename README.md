# Gemini Image Generator

SillyTavern third-party extension for AI image generation. Supports [Gemini API OneClick](https://github.com/shleeshlee/gemini-api-oneclick) gateway and [Grok2API](https://github.com/9blockgame/grok2api).

> **Author:** WanWan | **License:** MIT

## Install

Open SillyTavern, go to **Extensions** > **Install Extension**, paste:

```
https://github.com/shleeshlee/gemini-image
```

## Uninstall

Extensions > Manage Extensions > find "Gemini Image Generator" > Delete.

## Features

- **Multi-channel** — Switch between Gemini and Grok with independent URL / API key / model config per channel
- **Custom image guide** — User-defined prompt prefix for every generation (style, tone, quality instructions)
- **41 built-in styles** — Gemini official styles (Cinematic, Anime, Ghibli, etc.) + common art styles
- **Aspect ratio** — 1:1 / 16:9 / 9:16 / 3:2 / 2:3
- **Quality** — Standard / HD
- **Auto-generate** — Automatically generate images for each AI reply
- **Per-swipe binding** — Each swipe keeps its own image, survives navigation
- **Smart prompt optimization** — Expands brief descriptions into vivid scene narratives without overriding style settings
- **Style analysis** — Upload a reference image, analyze its artistic rendering style, save as custom preset
- **Dual model selection** — Separate model choices for prompt optimization and image generation
- **Image toolbar** — Hover to zoom / download / regenerate / view prompt / delete

## Supported Backends

| Backend | Image Generation | Prompt Optimization | Style Analysis |
|---------|:---:|:---:|:---:|
| [Gemini API OneClick](https://github.com/shleeshlee/gemini-api-oneclick) | /v1/images/generations | /v1/chat/completions | /v1/chat/completions |
| [Grok2API](https://github.com/9blockgame/grok2api) | /v1/images/generations | /v1/chat/completions (SSE) | /v1/chat/completions (SSE) |

Both backends use OpenAI-compatible API format. The extension auto-detects SSE responses and parses them correctly.

## Setup

1. Install the extension (see above)
2. Open extension settings panel > **Gemini Image Generator**
3. Enable the extension
4. Select your **channel** (Gemini or Grok)
5. Set the **Gateway URL** and **API key** for the selected channel
6. (Optional) Click **Fetch Models** to select specific models
7. (Optional) Write a **custom image guide** — this text is prepended to every image prompt
8. Choose a style, ratio, and quality
9. Click **Generate for last message** or enable auto-generate

Each channel saves its own URL, API key, and model selections independently. Switching channels instantly loads the saved config.

## How It Works

```
AI message text
  ↓
Keyword Extraction (scene → visual prompt)
  ↓
Prompt Optimization (optional, expands scene details)
  ↓
Image Guide prefix (user-defined)
  ↓
Style Wrapping (built-in or custom style)
  ↓
Backend API → Generated Image (base64)
  ↓
Attached to message with per-swipe binding
```
