# Gemini Image Generator

SillyTavern third-party extension for AI image generation with automatic scene extraction.

> **Author:** WanWan | **License:** MIT

## Install

Open SillyTavern, go to **Extensions** > **Install Extension**, paste:

```
https://github.com/shleeshlee/gemini-image
```

## Features

### Auto Image Generation
- Extracts the most visually striking moment from each AI reply
- Flash model generates a complete English image prompt with style fusion
- Prompt safety translation — explicit content is converted to atmospheric descriptions (silhouettes, scattered clothing, moonlight, expression close-ups)
- Auto-generate on every reply, or manual trigger per message

### Image Editor
- Upload any image and edit it with natural language instructions
- Session continuity — multiple rounds of editing on the same image
- Suitable for: changing clothing, removing accessories, adjusting background, color correction
- Note: large scene changes and character replacement are unstable with current Gemini capabilities

### 17 Curated Styles
Synced from [Gemini API OneClick](https://github.com/shleeshlee/gemini-api-oneclick) gateway. Styles are fused into the prompt by the flash model, not mechanically concatenated.

| Category | Styles |
|----------|--------|
| Anime | Anime, Soft Anime, Otome CG, Fantasy Anime, Shinkai, Ghibli, Pixiv Rank, Fine Line |
| Cinematic | Cinematic, Dark, Soft Portrait, Photorealistic |
| Artistic | Oil Painting, Watercolor, Cyberpunk, Pixel Art, Gothic Clay |

### Other
- **Custom channels** — Add/delete/rename any number of API endpoints
- **Whitebox progress** — See each step: extracting prompt → generating image (~60s)
- **Pro refinement** — One-click HD polish with session affinity (hits same container)
- **Per-swipe binding** — Each swipe keeps its own image
- **Image toolbar** — Zoom / download / regenerate / Pro refine / send to editor / view prompt / delete
- **Aspect ratio** — 1:1 / 16:9 / 9:16 / 3:2 / 2:3
- **Quality** — Standard / HD

## Setup

1. Install the extension
2. Open **Gemini Image Generator** in the extensions panel
3. Enable the extension
4. Add a channel (click +), set Gateway URL and API key
5. Choose a style, ratio, and quality
6. Click **Generate for last message** or enable auto-generate

## How It Works

```
AI message
  |
Scene Extraction (strip think/OOC/meta tags)
  |
Flash Model (scene + style constraint → safe English prompt)
  |
Gemini Image Generation (text-to-image)
  |
Attached to message with per-swipe binding
```

## Image Editor Flow

```
Upload image → Type edit instruction → Gemini Edit API
  |
Result replaces preview → Continue editing (same session)
```

## Supported Backends

| Backend | Image Generation | Prompt Generation |
|---------|:---:|:---:|
| [Gemini API OneClick](https://github.com/shleeshlee/gemini-api-oneclick) | /v1/images/generations | /v1/chat/completions |
| Any OpenAI-compatible API | /v1/images/generations | /v1/chat/completions |

The extension auto-detects SSE responses and parses them correctly.
