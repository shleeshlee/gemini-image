# Gemini Image Generator

SillyTavern third-party extension for AI image generation. Works with any OpenAI-compatible image generation API.

> **Author:** WanWan | **License:** MIT

## Install

Open SillyTavern, go to **Extensions** > **Install Extension**, paste:

```
https://github.com/shleeshlee/gemini-image
```

## Uninstall

Extensions > Manage Extensions > find "Gemini Image Generator" > Delete.

## Features

- **Any backend** — Works with any OpenAI-compatible API. Style prompts are applied client-side, no special backend support needed
- **Multi-channel** — Switch between Gemini and Grok with independent URL / API key / model config per channel
- **41 built-in styles** — Each with multi-dimension descriptors (linework, coloring, lighting, texture, anatomy, atmosphere). Anime presets tuned with proven style templates
- **Self-contained style system** — Style prefix/suffix applied on the client side, works with Gemini, Grok, or any other backend
- **Smart scene extraction** — Reads AI's thinking chain (`<think>` tags) for story context + plot direction, combines with scene text for accurate visual prompts
- **Prompt optimization** — Expands brief descriptions into vivid scene narratives without overriding style settings
- **Style analysis** — Upload a reference image, analyze its rendering style across 6 dimensions (linework/coloring/lighting/texture/anatomy/atmosphere), save as custom preset
- **Aspect ratio** — 1:1 / 16:9 / 9:16 / 3:2 / 2:3
- **Quality** — Standard / HD
- **Auto-generate** — Automatically generate images for each AI reply
- **Per-swipe binding** — Each swipe keeps its own image, survives navigation
- **Custom image guide** — User-defined prompt prefix for every generation
- **Dual model selection** — Separate model choices for prompt optimization and image generation
- **Image toolbar** — Hover to zoom / download / regenerate / view prompt / delete

## Supported Backends

| Backend | Image Generation | Prompt Optimization | Style Analysis |
|---------|:---:|:---:|:---:|
| [Gemini API OneClick](https://github.com/shleeshlee/gemini-api-oneclick) | /v1/images/generations | /v1/chat/completions | /v1/chat/completions |
| [Grok2API](https://github.com/9blockgame/grok2api) | /v1/images/generations | /v1/chat/completions (SSE) | /v1/chat/completions (SSE) |
| Any OpenAI-compatible API | /v1/images/generations | /v1/chat/completions | /v1/chat/completions |

The extension auto-detects SSE responses and parses them correctly.

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
AI message
  ↓
Scene Extraction
  ├── <think> chain → [Context] (story recap, plot direction, character info)
  └── body text    → [Scene]   (current visual moment)
  ↓
Keyword Extraction (Context + Scene → visual prompt)
  ↓
Prompt Optimization (optional, expands scene details)
  ↓
Image Guide prefix (user-defined)
  ↓
Style Wrapping (prefix + prompt + suffix, applied client-side)
  ↓
Backend API → Generated Image (base64)
  ↓
Attached to message with per-swipe binding
```

## Built-in Styles

41 styles with detailed prompt descriptors. Anime-series styles use multi-dimension descriptors tuned from real artwork analysis:

| Style | Description |
|-------|------------|
| Anime | Refined lineart, cel-shading, expressive eyes with layered catchlights |
| Ghibli | Pseudo-painterly rendering, warm natural tones, atmospheric depth |
| Otome CG | Polished digital bishoujo, smooth airbrushed skin, tyndall lighting |
| Fantasy Anime | Watercolor-like pastels, ethereal bloom, lush fantasy environments |
| Shinkai | Crisp lineart, vivid cold-warm grading, transparent sky with sunlight rays |
| Soft Anime | Watercolor aesthetic, paper grain texture, airy storybook atmosphere |
| + 35 more | Cinematic, Cyberpunk, Oil Painting, Pixel Art, Watercolor, etc. |
