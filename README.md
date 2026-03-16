# Gemini Image Generator

SillyTavern third-party extension for AI image generation via [Gemini Gateway](https://github.com/shleeshlee/gemini-api-oneclick).

## Install

Open SillyTavern, go to **Extensions** > **Install Extension**, paste:

```
https://github.com/shleeshlee/gemini-image
```

## Uninstall

Extensions > Manage Extensions > find "Gemini Image Generator" > Delete.

## Features

- **41 built-in styles** - Gemini official styles (Cinematic, Anime, Ghibli, etc.) + common art styles
- **Aspect ratio** - 1:1 / 16:9 / 9:16 / 3:2 / 2:3
- **Quality** - Standard / HD
- **Auto-generate** - Automatically generate images for each AI reply
- **Per-swipe binding** - Each swipe keeps its own image, survives navigation
- **Prompt optimization** - Rewrite keywords into vivid narrative paragraphs via LLM
- **Style analysis** - Upload a reference image, analyze its style, save as custom preset
- **Image toolbar** - Hover to zoom / download / regenerate

## Requirements

A running [gemini-api-oneclick](https://github.com/shleeshlee/gemini-api-oneclick) gateway instance with the `/v1/images/generations` endpoint enabled.

## Setup

1. Install the extension
2. Open extension settings panel > Gemini Image Generator
3. Enable the extension
4. Set your Gateway URL and API key under "Channel Settings"
5. (Optional) Click "Fetch Models" to select specific models
6. Choose a style, ratio, and quality
7. Click "Generate for last message" or enable auto-generate
