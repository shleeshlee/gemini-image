import { extension_settings, getContext } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const EXT_NAME = 'gemini-image';

// 生图并发控制：每个 messageIndex 只允许一个请求
const _pendingGens = new Set();

const STYLES = {
    'none': '无风格（原始提示词）',
    'Monochrome': 'Monochrome / 黑白',
    'Color Block': 'Color Block / 色块',
    'Runway': 'Runway / 时装',
    'Screen Print': 'Screen Print / 丝印',
    'Colorful': 'Colorful / 缤纷',
    'Gothic Clay': 'Gothic Clay / 哥特黏土',
    'Explosive': 'Explosive / 爆裂',
    'Salon': 'Salon / 沙龙',
    'Sketch': 'Sketch / 素描',
    'Cinematic': 'Cinematic / 电影',
    'Steampunk': 'Steampunk / 蒸汽朋克',
    'Sunrise': 'Sunrise / 日出',
    'Myth Fighter': 'Myth Fighter / 神话战士',
    'Surreal': 'Surreal / 超现实',
    'Dark': 'Dark / 暗黑',
    'Enamel Pin': 'Enamel Pin / 徽章',
    'Cyborg': 'Cyborg / 赛博格',
    'Soft Portrait': 'Soft Portrait / 柔光肖像',
    'Retro Cartoon': 'Retro Cartoon / 复古卡通',
    'Oil Painting': 'Oil Painting / 油画',
    'Anime': 'Anime / 动漫',
    'Photorealistic': 'Photorealistic / 写实',
    'Watercolor': 'Watercolor / 水彩',
    'Pixel Art': 'Pixel Art / 像素',
    'Kawaii': 'Kawaii / 可爱',
    'Ghibli': 'Ghibli / 吉卜力',
    'Civilization': 'Civilization / 文明',
    'Metallic': 'Metallic / 金属',
    'Memo': 'Memo / 备忘',
    'Glam': 'Glam / 华丽',
    'Crochet': 'Crochet / 钩编',
    'Cyberpunk': 'Cyberpunk / 赛博朋克',
    'Video Game': 'Video Game / 电子游戏',
    'Cosmos': 'Cosmos / 宇宙',
    'Action Hero': 'Action Hero / 动作英雄',
    'Stardust': 'Stardust / 星尘',
    'Jellytoon': 'Jellytoon / 果冻卡通',
    'Racetrack': 'Racetrack / 赛道',
    'ASMR Apple': 'ASMR Apple / ASMR 微距',
    'Red Carpet': 'Red Carpet / 红毯',
    'Popcorn': 'Popcorn / 爆米花',
    'Otome CG': 'Otome CG / 乙女CG',
    'Fantasy Anime': 'Fantasy Anime / 幻想动漫',
    'Shinkai': 'Shinkai / 新海诚',
    'Soft Anime': 'Soft Anime / 柔和动漫',
};

// Style prompt descriptors — applied client-side so the extension works with any backend
// Each style has prefix (before content) and suffix (after content)
const STYLE_PROMPTS = {
    'Monochrome': {prefix: 'Monochrome style, black and white with dramatic contrast', suffix: 'deep shadows and bright highlights, film noir aesthetic, highly detailed'},
    'Color Block': {prefix: 'Color Block style, bold flat areas of saturated color, graphic design inspired', suffix: 'strong geometric shapes, clean edges, highly detailed'},
    'Runway': {prefix: 'Fashion runway style, high-fashion editorial look', suffix: 'dramatic poses, luxury aesthetic, magazine quality, highly detailed'},
    'Screen Print': {prefix: 'Screen print style, Andy Warhol inspired, halftone dots', suffix: 'limited color palette, pop art aesthetic, bold graphic quality'},
    'Colorful': {prefix: 'Extremely colorful and vibrant, rainbow palette', suffix: 'maximum saturation, joyful and energetic, highly detailed'},
    'Gothic Clay': {prefix: 'Gothic claymation style, stop-motion clay figures', suffix: 'dark and eerie, Tim Burton inspired, textured surfaces, highly detailed'},
    'Explosive': {prefix: 'Explosive action style, dramatic impact', suffix: 'debris and particles, high-energy dynamic composition, cinematic lighting, highly detailed'},
    'Salon': {prefix: 'Salon portrait style, elegant and refined', suffix: 'soft glamour lighting, classic beauty photography, smooth skin texture, highly detailed'},
    'Sketch': {prefix: 'Detailed pencil sketch on paper, graphite shading', suffix: 'fine crosshatch linework, hand-drawn feel, visible paper texture'},
    'Cinematic': {prefix: 'Cinematic style, movie still aesthetic, dramatic Rembrandt lighting', suffix: 'anamorphic lens feel, volumetric light rays, film grain, atmospheric haze, highly detailed'},
    'Steampunk': {prefix: 'Steampunk style, Victorian-era machinery', suffix: 'brass gears and pipes, industrial revolution meets fantasy, warm amber lighting, highly detailed'},
    'Sunrise': {prefix: 'Golden sunrise style, warm golden hour light', suffix: 'long shadows, atmospheric haze, serene and hopeful mood, highly detailed'},
    'Myth Fighter': {prefix: 'Epic mythological warrior style, ancient Greek/Norse aesthetic', suffix: 'dramatic battle poses, ornate armor, heroic composition, cinematic lighting, highly detailed'},
    'Surreal': {prefix: 'Surrealist style, Salvador Dali inspired', suffix: 'impossible geometry, dreamlike distortions, melting forms, ethereal lighting'},
    'Dark': {prefix: 'Dark moody style, deep shadows, minimal cold lighting', suffix: 'noir atmosphere, misty volumetric haze, subtle rim light on edges, mysterious and brooding, highly detailed'},
    'Enamel Pin': {prefix: 'Enamel pin style, flat vector illustration, bold outlines', suffix: 'limited colors, cute collectible aesthetic, clean graphic quality'},
    'Cyborg': {prefix: 'Cyborg style, human-machine hybrid, visible circuitry', suffix: 'bioluminescent elements, sci-fi realism, cold blue rim lighting, highly detailed'},
    'Soft Portrait': {prefix: 'Soft portrait style, gentle diffused lighting, shallow depth of field', suffix: 'warm skin tones, smooth skin texture, dreamy bokeh highlights, intimate atmosphere, highly detailed'},
    'Retro Cartoon': {prefix: '1930s retro cartoon style, rubber hose animation', suffix: 'black and white with halftone, Fleischer Studios inspired, playful and nostalgic'},
    'Oil Painting': {prefix: 'Oil painting style, rich impasto brushstrokes, semi-painterly rendering', suffix: 'Rembrandt-style golden lighting, classical composition, visible canvas texture, museum quality, highly detailed'},
    'Anime': {prefix: 'High-quality digital anime illustration with refined lineart and confident varied line weight, elegant anime proportions with large expressive eyes featuring layered catchlights and iris detail', suffix: 'soft cel-shading with smooth gradient blending, refined facial features, graceful slender hands, silky hair with highlight streaks, cinematic lighting, soft shadows'},
    'Photorealistic': {prefix: 'Photorealistic, ultra detailed like a DSLR photograph', suffix: 'natural lighting, sharp focus, 85mm lens, shallow depth of field, highly detailed'},
    'Watercolor': {prefix: 'Detailed watercolor painting, soft translucent washes', suffix: 'visible paper texture, gentle color bleeding, warm tyndall effect lighting, delicate brushwork, highly detailed'},
    'Pixel Art': {prefix: 'Pixel art style, retro 16-bit video game aesthetic', suffix: 'clean pixel boundaries, limited palette, nostalgic, charming'},
    'Kawaii': {prefix: 'Kawaii style, adorable chibi proportions, pastel colors', suffix: 'round soft shapes, sparkles and hearts, cute and expressive'},
    'Ghibli': {prefix: 'High-quality anime illustration with pseudo-painterly rendering and semi-thick brush strokes, refined anime proportions with expressive eyes and soft facial features', suffix: 'vivid color grading with warm natural tones, expressive shadows with soft textured lighting, silky hair with natural highlight streaks, painterly anime background with atmospheric depth, dramatic atmosphere'},
    'Civilization': {prefix: 'Ancient civilization epic style, grand architecture', suffix: 'marble and gold, historical drama aesthetic, cinematic lighting, highly detailed'},
    'Metallic': {prefix: 'Metallic chrome style, reflective surfaces, liquid metal', suffix: 'futuristic industrial aesthetic, cold blue lighting, highly detailed'},
    'Memo': {prefix: 'Memo style, playful and expressive, close-up character study', suffix: 'natural and candid feel, warm soft lighting, highly detailed'},
    'Glam': {prefix: 'Glamorous style, sparkle and shine, luxury fashion', suffix: 'dramatic beauty lighting, editorial elegance, highly detailed'},
    'Crochet': {prefix: 'Crochet knitted style, soft yarn textures', suffix: 'handcrafted warmth, cozy stop-motion aesthetic, soft lighting, highly detailed'},
    'Cyberpunk': {prefix: 'Cyberpunk style, neon-lit streets, holographic signs', suffix: 'rain reflections, futuristic dystopia, volumetric neon lighting, highly detailed'},
    'Video Game': {prefix: 'Retro video game style, pixel art animation', suffix: '8-bit/16-bit aesthetic, arcade feel, nostalgic'},
    'Cosmos': {prefix: 'Cosmic space style, nebulae and stars, infinite depth', suffix: 'astronomical wonder, sci-fi grandeur, ethereal lighting, highly detailed'},
    'Action Hero': {prefix: 'Action hero blockbuster style, intense close-ups', suffix: 'dramatic slow motion, gritty and cinematic, volumetric lighting, highly detailed'},
    'Stardust': {prefix: 'Stardust fairy tale style, magical sparkles', suffix: 'enchanted garden, soft dreamy atmosphere, romantic fantasy, ethereal glow, highly detailed'},
    'Jellytoon': {prefix: 'Jellytoon style, 3D animated character, soft rounded forms', suffix: 'vibrant Pixar-like aesthetic, cute and expressive, soft studio lighting'},
    'Racetrack': {prefix: 'Racetrack style, miniature tilt-shift effect', suffix: 'toy-like world, bright saturated colors, playful perspective'},
    'ASMR Apple': {prefix: 'ASMR macro style, extreme close-up detail', suffix: 'satisfying textures, crisp focus, sensory-rich, highly detailed'},
    'Red Carpet': {prefix: 'Red carpet documentary style, paparazzi flash', suffix: 'celebrity glamour, dramatic entrances, cinematic, highly detailed'},
    'Popcorn': {prefix: 'Popcorn fun style, playful stop-motion', suffix: 'whimsical food art, creative and surprising compositions'},
    'Otome CG': {prefix: 'High-quality otome game CG illustration with refined lineart and delicate tapered strokes, elegant bishoujo anime proportions with large expressive eyes featuring complex layered irises and bright catchlights, refined soft facial features', suffix: 'smooth digital cel-shading with warm peach and cool blue accents, silky fine-line hair highlights with glossy sheen, smooth airbrushed skin rendering, tyndall effect lighting, sentimental romantic atmosphere with shallow depth-of-field, elegant jewelry and fabric details'},
    'Fantasy Anime': {prefix: 'High-quality fantasy anime illustration with refined lineart and varied line weights, elegant anime proportions with large detailed eyes featuring layered catchlights, refined facial features, graceful slender gestures', suffix: 'soft watercolor-like coloring with desaturated pastel tones and subtle color bleeding, ethereal diffused lighting with soft bloom effect, floating particles and magical light motes, lush fully-realized fantasy environment with atmospheric depth and dreamy haze'},
    'Shinkai': {prefix: 'High-quality digital anime illustration with crisp refined lineart and delicate tapered ends, thin internal detailing and slightly weighted outer silhouettes, elegant anime proportions with large intensely detailed eyes featuring complex iris patterns and multiple catchlights', suffix: 'saturated palette with vivid cold-warm color grading, smooth digital gradients with soft-edged cel-shading, dramatic cinematic rim lighting with subtle bloom effect, silky hair with sharp high-contrast highlights, luminous transparent sky with detailed cloud layers and sunlight rays piercing through, wistful and nostalgic atmosphere'},
    'Soft Anime': {prefix: 'High-quality digital anime illustration with soft watercolor aesthetic, refined sketchy lineart with varied line weights and delicate tapered strokes blending into soft coloring, elegant bishoujo anime proportions with large expressive eyes featuring complex layered irises and bright catchlights', suffix: 'desaturated pastel palette with gentle wet-on-wet transitions and subtle color bleeding, light cel-shading with warm peach and cool blue shadow accents, soft diffused ambient light with ethereal high-key glow, traditional watercolor paper grain texture, silky fine-line hair highlights, minimalist airy storybook atmosphere with floating particles'},
};

const RATIOS = {
    '1024x1024': '1:1 正方形',
    '1280x720': '16:9 横屏',
    '720x1280': '9:16 竖屏',
    '1792x1024': '3:2 横屏',
    '1024x1792': '2:3 竖屏',
};

const QUALITY_OPTIONS = {
    'standard': '标准',
    'hd': 'HD 高清',
};

const CHANNEL_DEFAULTS = {
    gemini: { prompt_model: '', image_model: '', default_prompt_model: 'gemini-3.0-flash', default_image_model: 'gemini-3.0-flash' },
    grok:   { prompt_model: '', image_model: '', default_prompt_model: 'grok-3', default_image_model: 'grok-imagine-1.0' },
};

const defaultSettings = {
    enabled: false,
    channel: 'gemini',
    // 每个渠道独立存储 URL/Key/模型
    channels: {
        gemini: { api_url: '', api_key: '', prompt_model: '', image_model: '' },
        grok:   { api_url: '', api_key: '', prompt_model: '', image_model: '' },
    },
    auto_generate: false,
    style: 'none',
    ratio: '1024x1024',
    quality: 'standard',
    custom_style: '',
    custom_styles: [],
    optimize_prompt: false,
    image_guide: '',
    extract_prompt: 'Extract visual elements from this story scene for image generation.\n\nThe input may have two parts:\n- [Context]: AI\'s internal thinking — contains story recap and plot direction, use it to understand WHO the characters are and WHAT is happening\n- [Scene]: The actual story text — extract the visual moment from here\n\nOutput a concise English image prompt (max 150 words) describing:\n- Characters: appearance, expression, pose, clothing\n- Action: what is happening in this moment\n- Environment: location, time of day, weather, key objects\n\nDo NOT specify art style, rendering technique, lighting method, or color palette — these are controlled separately.\nOutput ONLY the image prompt, nothing else.\n\n{{text}}',
};

function loadSettings() {
    extension_settings[EXT_NAME] = extension_settings[EXT_NAME] || {};
    for (const [key, val] of Object.entries(defaultSettings)) {
        if (extension_settings[EXT_NAME][key] === undefined) {
            extension_settings[EXT_NAME][key] = typeof val === 'object' && !Array.isArray(val) ? JSON.parse(JSON.stringify(val)) : val;
        }
    }
    // 迁移旧版单渠道配置
    const st = extension_settings[EXT_NAME];
    if (st.api_url && !st.channels?.gemini?.api_url) {
        if (!st.channels) st.channels = JSON.parse(JSON.stringify(defaultSettings.channels));
        st.channels.gemini.api_url = st.api_url;
        st.channels.gemini.api_key = st.api_key || '';
        st.channels.gemini.prompt_model = st.prompt_model || '';
        st.channels.gemini.image_model = st.image_model || '';
        delete st.api_url; delete st.api_key; delete st.prompt_model; delete st.image_model;
    }
    if (!st.channels) st.channels = JSON.parse(JSON.stringify(defaultSettings.channels));
    for (const ch of ['gemini', 'grok']) {
        if (!st.channels[ch]) st.channels[ch] = { api_url: '', api_key: '', prompt_model: '', image_model: '' };
    }
    if (!st.channel) st.channel = 'gemini';
    const ratioMap = { '1:1': '1024x1024', '16:9': '1280x720', '9:16': '720x1280', '3:2': '1792x1024', '2:3': '1024x1792' };
    const cur = st.ratio;
    if (ratioMap[cur]) st.ratio = ratioMap[cur];
}

function s() { return extension_settings[EXT_NAME]; }

/** 当前渠道配置 */
function ch() { const st = s(); return st.channels[st.channel] || st.channels.gemini; }

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function getModel(purpose) {
    const settings = s();
    const chConf = ch();
    const defaults = CHANNEL_DEFAULTS[settings.channel] || CHANNEL_DEFAULTS.gemini;
    const explicit = purpose === 'prompt' ? chConf.prompt_model : chConf.image_model;
    return explicit || (purpose === 'prompt' ? defaults.default_prompt_model : defaults.default_image_model);
}

/** 解析 SSE 流，收集完整文本（grok2api chat/completions 始终返回 SSE） */
async function parseSSEResponse(resp) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留未完成的行

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
                const parsed = JSON.parse(data);
                // 标准 chat completions SSE: choices[0].delta.content
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) fullContent += delta;
                // 也尝试非流式格式（某些情况）
                const msg = parsed.choices?.[0]?.message?.content;
                if (msg) fullContent = msg;
            } catch { /* 跳过无法解析的行 */ }
        }
    }
    return { choices: [{ message: { content: fullContent } }] };
}

async function gatewayFetch(path, body, signal) {
    const settings = s();
    const chConf = ch();
    const url = chConf.api_url.replace(/\/+$/, '') + path;
    const opts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + chConf.api_key },
        body: JSON.stringify(body),
    };
    if (signal) opts.signal = signal;
    const resp = await fetch(url, opts);
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(resp.status + ' ' + text.slice(0, 200));
    }

    // Grok 的 chat/completions 始终返回 SSE，需要流式解析
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/event-stream')) {
        return parseSSEResponse(resp);
    }
    return resp.json();
}

async function fetchModels() {
    const chConf = ch();
    const url = chConf.api_url.replace(/\/+$/, '') + '/v1/models';
    const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + chConf.api_key },
    });
    if (!resp.ok) throw new Error('Failed to fetch models: ' + resp.status);
    const data = await resp.json();
    return (data.data || []).map(m => m.id);
}

function extractSceneText(html) {
    // Extract think chain (contains story recap + plot direction — most valuable for scene understanding)
    const thinkMatch = html.match(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/i);
    const thinkText = thinkMatch ? thinkMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';

    // Extract main body (everything outside think tags, strip HTML)
    const bodyHtml = html.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '');
    const bodyText = bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Combine: think chain (context) + body (scene content)
    const parts = [];
    if (thinkText) parts.push('[Context]\n' + thinkText.slice(0, 1000));
    if (bodyText) parts.push('[Scene]\n' + bodyText.slice(0, 1500));
    return parts.join('\n\n') || bodyText.slice(0, 2000);
}

async function extractKeywords(sceneText) {
    const settings = s();
    const prompt = settings.extract_prompt.replace('{{text}}', sceneText);
    const data = await gatewayFetch('/v1/chat/completions', {
        model: getModel('prompt'),
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
    });
    let keywords = data.choices?.[0]?.message?.content || '';
    keywords = keywords.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return keywords;
}

async function optimizePrompt(prompt) {
    const data = await gatewayFetch('/v1/chat/completions', {
        model: getModel('prompt'),
        messages: [
            {
                role: 'system',
                content: 'You are an image prompt optimizer. Expand the user\'s brief description into a vivid scene description. ONLY enrich the CONTENT: subject, action, pose, expression, clothing, environment, spatial relationships, textures, materials, weather, time of day. Do NOT specify art style, rendering technique, camera/lens, lighting technique, color palette, or quality boosters — these are controlled separately. 100 words max. Output ONLY the optimized prompt.',
            },
            { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
    });
    let result = data.choices?.[0]?.message?.content || '';
    result = result.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return result || prompt;
}

async function analyzeStyleFromImage(base64) {
    const data = await gatewayFetch('/v1/chat/completions', {
        model: getModel('prompt'),
        messages: [{
            role: 'user',
            content: [
                { type: 'image_url', image_url: { url: 'data:image/png;base64,' + base64 } },
                { type: 'text', text: 'You are an expert at writing style descriptors for Google Gemini image generation. Analyze this image and extract the precise visual qualities that make it look the way it does.\n\nYour goal: write descriptors that will make Gemini retrieve the RIGHT visual style from its training data. Think of each field as a search query into Gemini\'s memory of beautiful artwork — use the specific terminology that high-quality illustrations are tagged with.\n\nAnalyze these dimensions mentally, then combine into one fluent output:\n- Linework: line quality, weight, edges (e.g. clean refined lineart, thick bold outlines, no-lineart painterly edges)\n- Coloring: color method, palette, shadow style (e.g. soft cel-shading, watercolor wash, flat color fills)\n- Lighting: light sources and visual effect (e.g. dramatic rim lighting, soft diffused ambient, overexposed bloom)\n- Texture: surface and material quality (e.g. silky hair highlights, glossy surfaces, watercolor paper grain)\n- Anatomy: figure and face rendering (e.g. elegant anime proportions, detailed expressive eyes with layered catchlights)\n- Atmosphere: scene depth and environment (e.g. shallow depth-of-field bokeh, floating particles, negative space)\n\nOutput a single fluent style instruction (30-45 words) weaving together the most distinctive qualities from above. This gets appended directly to user prompts as a style suffix.\n\nRULES:\n- Do NOT describe subject matter, characters, poses, clothing, or scene content — only visual style and rendering quality.\n- Use terminology commonly found in high-quality digital art descriptions.\n- Prioritize specificity over length.\nOutput ONLY the style description, nothing else.' },
            ],
        }],
        max_tokens: 300,
        temperature: 0.5,
    });
    let result = data.choices?.[0]?.message?.content || '';
    result = result.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return result;
}

async function generateImage(prompt) {
    const settings = s();

    if (settings.optimize_prompt) {
        try {
            prompt = await optimizePrompt(prompt);
        } catch (e) {
            console.warn('[gemini-image] Prompt optimization failed, using original:', e);
        }
    }

    // 用户自定义引导词（拼在 prompt 前面）
    let finalPrompt = prompt;
    if (settings.image_guide?.trim()) {
        finalPrompt = settings.image_guide.trim() + '\n\n' + finalPrompt;
    }

    // 风格处理 — 前端拼接 prefix/suffix，兼容任何后端
    const styleKey = settings.style;
    if (styleKey !== 'none') {
        if (styleKey.startsWith('custom:')) {
            const customName = styleKey.replace('custom:', '');
            const found = (settings.custom_styles || []).find(cs => cs.name === customName);
            if (found) finalPrompt = found.description + ', ' + finalPrompt;
        } else {
            const sp = STYLE_PROMPTS[styleKey];
            if (sp) {
                finalPrompt = sp.prefix + '. ' + finalPrompt + '. ' + sp.suffix;
            }
        }
    }
    if (settings.custom_style) {
        finalPrompt = finalPrompt + ', ' + settings.custom_style;
    }

    const body = {
        prompt: finalPrompt,
        model: getModel('image'),
        n: 1,
        quality: settings.quality,
        size: settings.ratio,
        response_format: 'b64_json',
    };

    const data = await gatewayFetch('/v1/images/generations', body);

    if (data.error) {
        throw new Error(data.error.message || 'Gateway returned an error');
    }
    if (!data.data?.[0]?.b64_json) {
        throw new Error('No image data in response');
    }
    return { b64: data.data[0].b64_json, prompt: finalPrompt, finalPrompt: data.final_prompt || finalPrompt };
}

function downloadB64(b64) {
    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'image/png' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'gemini-' + Date.now() + '.png';
    a.click();
    URL.revokeObjectURL(blobUrl);
}

function renderGeminiImage(messageIndex) {
    const context = getContext();
    const message = context.chat[messageIndex];
    if (!message) return;
    const mesEl = $(".mes[mesid=\"" + messageIndex + "\"]");
    if (!mesEl.length) return;

    // 清掉当前 DOM 里的 gemini 图区域
    mesEl.find('.gi-image-block').remove();

    const images = message.extra?.gemini_images;
    if (!images) return;
    const swipeId = message.swipe_id || 0;
    const imgData = images[swipeId];
    if (!imgData) return;

    // 图片容器：图片 + 按钮栏
    const block = $('<div class="gi-image-block"></div>');
    const imgSrc = 'data:image/png;base64,' + imgData.b64;
    const img = $('<img>').addClass('gi-generated-img').attr('src', imgSrc);
    // 点击图片 → 全屏预览
    img.on('click', () => {
        const overlay = $('<div class="gi-lightbox"></div>');
        const fullImg = $('<img>').attr('src', imgSrc);
        overlay.append(fullImg);
        overlay.on('click', () => overlay.remove());
        $('body').append(overlay);
    });

    const toolbar = $('<div class="gi-image-toolbar"></div>');
    const zoomBtn = $('<button class="gi-img-btn" title="放大"><i class="fa-solid fa-expand"></i></button>');
    zoomBtn.on('click', (e) => { e.stopPropagation(); img.trigger('click'); });
    const dlBtn = $('<button class="gi-img-btn" title="下载"><i class="fa-solid fa-download"></i></button>');
    dlBtn.on('click', (e) => { e.stopPropagation(); downloadB64(imgData.b64); });
    const regenBtn = $('<button class="gi-img-btn" title="重新生图"><i class="fa-solid fa-arrows-rotate"></i></button>');
    regenBtn.on('click', (e) => { e.stopPropagation(); generateAndAttach(messageIndex); });
    const promptBtn = $('<button class="gi-img-btn" title="查看提示词"><i class="fa-solid fa-file-lines"></i></button>');
    promptBtn.on('click', (e) => {
        e.stopPropagation();
        const text = imgData.finalPrompt || imgData.prompt || '无提示词信息';
        const existing = block.find('.gi-prompt-preview');
        if (existing.length) { existing.toggle(); return; }
        const pre = $('<pre class="gi-prompt-preview"></pre>').text(text).css({
            'margin-top': '6px', 'padding': '8px', 'background': 'rgba(0,0,0,0.05)',
            'border-radius': '6px', 'font-size': '0.72em', 'line-height': '1.4',
            'white-space': 'pre-wrap', 'word-break': 'break-all', 'max-height': '100px',
            'overflow-y': 'auto', 'border': '1px solid rgba(0,0,0,0.1)',
            'cursor': 'pointer',
        });
        pre.on('click', (ev) => { ev.stopPropagation(); navigator.clipboard.writeText(text).then(() => { pre.css('background', 'rgba(0,128,0,0.1)'); setTimeout(() => pre.css('background', 'rgba(0,0,0,0.05)'), 600); }); });
        pre.attr('title', '点击复制');
        block.append(pre);
    });
    const delBtn = $('<button class="gi-img-btn" title="删除图片"><i class="fa-solid fa-trash"></i></button>');
    delBtn.on('click', (e) => {
        e.stopPropagation();
        const swipeId = message.swipe_id || 0;
        if (message.extra?.gemini_images?.[swipeId]) {
            delete message.extra.gemini_images[swipeId];
            mesEl.find('.gi-image-block').remove();
            getContext().saveChat();
        }
    });
    toolbar.append(zoomBtn).append(dlBtn).append(promptBtn).append(regenBtn).append(delBtn);

    block.append(img).append(toolbar);
    mesEl.find('.mes_text').after(block);
}

function hasImageForCurrentSwipe(message) {
    if (!message?.extra?.gemini_images) return false;
    const swipeId = message.swipe_id || 0;
    return !!message.extra.gemini_images[swipeId];
}

function _getMsgStatus(messageIndex) {
    const mesEl = $(".mes[mesid=\"" + messageIndex + "\"]");
    if (!mesEl.length) return null;
    let tag = mesEl.find('.gi-msg-status');
    if (!tag.length) {
        tag = $('<div class="gi-msg-status"></div>');
        mesEl.find('.mes_text').after(tag);
    }
    return tag;
}

function _setMsgStatus(messageIndex, cls, html) {
    const tag = _getMsgStatus(messageIndex);
    if (tag) tag.attr('class', 'gi-msg-status ' + cls).html(html);
}

async function generateAndAttach(messageIndex) {
    const context = getContext();
    const message = context.chat[messageIndex];
    if (!message || message.is_user) return;

    // 同一条消息不重复生图
    if (_pendingGens.has(messageIndex)) return;
    _pendingGens.add(messageIndex);

    const statusEl = document.getElementById('gi-status');
    const setStatus = (cls, msg) => { if (statusEl) { statusEl.className = 'gi-status ' + cls; statusEl.textContent = msg; } };
    try {
        // 先删掉当前图，让用户知道在重新生成
        const mesEl = $(".mes[mesid=\"" + messageIndex + "\"]");
        mesEl.find('.gi-image-block').remove();

        const sceneText = extractSceneText(message.mes);
        if (sceneText.length < 10) return;
        _setMsgStatus(messageIndex, 'pending', '🔍 提取关键词...');
        setStatus('', '🔍 #' + messageIndex + ' 提取关键词...');
        const keywords = await extractKeywords(sceneText);
        if (!keywords || keywords.length < 5) {
            _setMsgStatus(messageIndex, 'err', '✗ 关键词提取失败 <span class="gi-retry" data-idx="' + messageIndex + '">🔄 重试</span>');
            setStatus('err', '#' + messageIndex + ' 关键词提取失败');
            return;
        }
        _setMsgStatus(messageIndex, 'pending', '🍪 生成图片中...');
        setStatus('', '🍪 #' + messageIndex + ' 生成图片中...');
        const { b64, prompt, finalPrompt } = await generateImage(keywords);

        // 按 swipe_id 存图，每个 swipe 绑定自己的图
        if (!message.extra) message.extra = {};
        if (!message.extra.gemini_images) message.extra.gemini_images = {};
        const swipeId = message.swipe_id || 0;
        message.extra.gemini_images[swipeId] = { b64, prompt, finalPrompt };

        renderGeminiImage(messageIndex);
        _setMsgStatus(messageIndex, '', '');  // 成功了就清掉状态，图片本身就是反馈
        await context.saveChat();
        setStatus('ok', '✓ #' + messageIndex + ' 已生成');
        setTimeout(() => setStatus('', ''), 5000);
    } catch (e) {
        console.error('[gemini-image]', e);
        _setMsgStatus(messageIndex, 'err', '✗ ' + e.message.slice(0, 60) + ' <span class="gi-retry" data-idx="' + messageIndex + '">🔄 重试</span>');
        setStatus('err', '#' + messageIndex + ' ' + e.message);
    }
    finally { _pendingGens.delete(messageIndex); }
}

function setStatusMsg(cls, msg) {
    const el = document.getElementById('gi-status');
    if (el) { el.className = 'gi-status ' + cls; el.textContent = msg; }
}

function populateStyleSelect() {
    const settings = s();
    const builtinOpts = Object.entries(STYLES).map(([k, v]) => '<option value="' + k + '"' + (settings.style === k ? ' selected' : '') + '>' + v + '</option>').join('');
    const customOpts = (settings.custom_styles || []).map(cs => {
        const val = 'custom:' + cs.name;
        return '<option value="' + val + '"' + (settings.style === val ? ' selected' : '') + '>[自定义] ' + cs.name + '</option>';
    }).join('');
    $('#gi-style').html(builtinOpts + customOpts);
}

function populateModelSelects(models) {
    const settings = s();
    const defaults = CHANNEL_DEFAULTS[settings.channel] || CHANNEL_DEFAULTS.gemini;
    for (const [id, purpose] of [['#gi-prompt-model', 'prompt'], ['#gi-image-model', 'image']]) {
        const $sel = $(id);
        const cur = $sel.val();
        const defModel = purpose === 'prompt' ? defaults.default_prompt_model : defaults.default_image_model;
        $sel.html('<option value="">自动（' + defModel + '）</option>' + models.map(m => '<option value="' + m + '"' + (cur === m ? ' selected' : '') + '>' + m + '</option>').join(''));
    }
}

/** 刷新渠道设置区的表单值 */
function refreshChannelUI() {
    const settings = s();
    const chConf = ch();
    const defaults = CHANNEL_DEFAULTS[settings.channel] || CHANNEL_DEFAULTS.gemini;
    $('#gi-api-url').val(chConf.api_url);
    $('#gi-api-key').val(chConf.api_key);
    $('#gi-prompt-model').val(chConf.prompt_model);
    $('#gi-image-model').val(chConf.image_model);
    // 更新模型下拉默认提示
    for (const [id, purpose] of [['#gi-prompt-model', 'prompt'], ['#gi-image-model', 'image']]) {
        const defModel = purpose === 'prompt' ? defaults.default_prompt_model : defaults.default_image_model;
        $(id).find('option[value=""]').text('自动（' + defModel + '）');
    }
}

function buildSettingsHtml() {
    const settings = s();
    const chConf = ch();
    const defaults = CHANNEL_DEFAULTS[settings.channel] || CHANNEL_DEFAULTS.gemini;
    const ratioOpts = Object.entries(RATIOS).map(([k, v]) => '<option value="' + k + '"' + (settings.ratio === k ? ' selected' : '') + '>' + v + '</option>').join('');
    const qualityOpts = Object.entries(QUALITY_OPTIONS).map(([k, v]) => '<option value="' + k + '"' + (settings.quality === k ? ' selected' : '') + '>' + v + '</option>').join('');
    const html = '<div id="gemini-image-settings" class="inline-drawer">' +
        '<div class="inline-drawer-toggle inline-drawer-header">' +
            '<b>🍪 Gemini Image Generator</b>' +
            '<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>' +
        '</div>' +
        '<div class="inline-drawer-content">' +
            '<div class="gi-row"><label>启用</label><input id="gi-enabled" type="checkbox"' + (settings.enabled ? ' checked' : '') + ' /></div>' +

            '<details class="gi-section" open><summary>渠道设置</summary>' +
                '<div class="gi-row"><label>渠道</label><select id="gi-channel" class="text_pole">' +
                    '<option value="gemini"' + (settings.channel === 'gemini' ? ' selected' : '') + '>Gemini（gateway）</option>' +
                    '<option value="grok"' + (settings.channel === 'grok' ? ' selected' : '') + '>Grok（grok2api）</option>' +
                '</select></div>' +
                '<div class="gi-row"><label>Gateway</label><input id="gi-api-url" type="text" class="text_pole" value="' + esc(chConf.api_url) + '" placeholder="https://example.com" /></div>' +
                '<div class="gi-row"><label>密钥</label><input id="gi-api-key" type="password" class="text_pole" value="' + esc(chConf.api_key) + '" placeholder="API Key 或面板密码" /></div>' +
                '<div class="gi-row" style="margin-top:4px"><button id="gi-fetch-models" class="menu_button"><i class="fa-solid fa-arrows-rotate"></i> 拉取模型</button></div>' +
                '<div class="gi-row"><label>Prompt 模型</label><select id="gi-prompt-model" class="text_pole"><option value="">自动（' + defaults.default_prompt_model + '）</option></select></div>' +
                '<div class="gi-row"><label>图像模型</label><select id="gi-image-model" class="text_pole"><option value="">自动（' + defaults.default_image_model + '）</option></select></div>' +
            '</details>' +

            '<hr>' +
            '<div class="gi-row"><label>风格</label><select id="gi-style" class="text_pole"></select></div>' +
            '<div class="gi-row"><label>比例</label><select id="gi-ratio" class="text_pole">' + ratioOpts + '</select></div>' +
            '<div class="gi-row"><label>质量</label><select id="gi-quality" class="text_pole">' + qualityOpts + '</select></div>' +
            '<div class="gi-row"><label>自定义风格</label><input id="gi-custom-style" type="text" class="text_pole" value="' + esc(settings.custom_style) + '" placeholder="soft lighting, pastel colors" /></div>' +

            '<hr>' +
            '<div class="gi-row" style="flex-direction:column;align-items:stretch"><label>生图引导词 <small style="color:#888">（拼在每次生图 prompt 前面）</small></label>' +
                '<textarea id="gi-image-guide" class="text_pole" rows="3" placeholder="例：你是天才画家，擅长捕捉...">' + esc(settings.image_guide) + '</textarea></div>' +

            '<hr>' +
            '<div class="gi-row"><label class="gi-checkbox-label"><input id="gi-optimize-prompt" type="checkbox"' + (settings.optimize_prompt ? ' checked' : '') + ' /> Prompt 优化</label><small>关键词→叙述式段落，更慢但更细腻</small></div>' +
            '<div class="gi-row"><label>自动生图</label><input id="gi-auto" type="checkbox"' + (settings.auto_generate ? ' checked' : '') + ' /><small>每条 AI 回复自动配图</small></div>' +

            '<details class="gi-section"><summary>风格分析</summary>' +
                '<div class="gi-row"><label>上传参考图</label><input id="gi-style-image" type="file" accept="image/*" /></div>' +
                '<div class="gi-row"><button id="gi-analyze-style" class="menu_button"><i class="fa-solid fa-magnifying-glass"></i> 分析风格</button></div>' +
                '<textarea id="gi-style-result" class="text_pole" rows="3" readonly placeholder="分析结果..."></textarea>' +
                '<div class="gi-row"><input id="gi-style-name" type="text" class="text_pole" placeholder="风格名称" style="flex:1" />' +
                '<button id="gi-save-style" class="menu_button"><i class="fa-solid fa-save"></i> 保存</button></div>' +
            '</details>' +

            '<details class="gi-section"><summary>提取提示词（高级）</summary>' +
                '<textarea id="gi-extract-prompt" class="text_pole" rows="4" style="margin-top:4px;font-size:0.82em">' + esc(settings.extract_prompt) + '</textarea>' +
            '</details>' +

            '<div class="gi-row" style="margin-top:8px">' +
                '<button id="gi-test" class="menu_button">测试连接</button>' +
                '<button id="gi-manual" class="menu_button">为最后一条生图</button>' +
            '</div>' +
            '<div id="gi-status" class="gi-status"></div>' +
        '</div>' +
    '</div>';
    $('#extensions_settings2').append(html);

    populateStyleSelect();

    const bind = (id, key, ev) => { $('#' + id).on(ev || 'input', function() { settings[key] = this.type === 'checkbox' ? this.checked : this.value.trim(); saveSettingsDebounced(); }); };
    bind('gi-enabled', 'enabled', 'change');
    bind('gi-ratio', 'ratio', 'change');
    bind('gi-quality', 'quality', 'change');
    bind('gi-custom-style', 'custom_style');
    bind('gi-optimize-prompt', 'optimize_prompt', 'change');
    bind('gi-auto', 'auto_generate', 'change');
    bind('gi-image-guide', 'image_guide');
    bind('gi-extract-prompt', 'extract_prompt');

    // 渠道切换
    $('#gi-channel').on('change', function () {
        settings.channel = this.value;
        saveSettingsDebounced();
        refreshChannelUI();
        // 自动拉取新渠道的模型
        const newCh = ch();
        if (newCh.api_url && newCh.api_key) {
            fetchModels().then(models => { populateModelSelects(models); }).catch(() => {});
        }
    });

    // 渠道内配置绑定到当前渠道对象
    const bindCh = (id, key, ev) => {
        $('#' + id).on(ev || 'input', function () {
            const chConf = ch();
            chConf[key] = this.value.trim();
            saveSettingsDebounced();
        });
    };
    bindCh('gi-api-url', 'api_url');
    bindCh('gi-api-key', 'api_key');

    $('#gi-style').on('change', function () { settings.style = this.value; saveSettingsDebounced(); });
    $('#gi-prompt-model').on('change', function () { ch().prompt_model = this.value; saveSettingsDebounced(); });
    $('#gi-image-model').on('change', function () { ch().image_model = this.value; saveSettingsDebounced(); });

    $('#gi-fetch-models').on('click', async () => {
        try {
            setStatusMsg('', '拉取模型中...');
            const models = await fetchModels();
            populateModelSelects(models);
            setStatusMsg('ok', '✓ 拉取到 ' + models.length + ' 个模型');
        } catch (e) { setStatusMsg('err', '✗ ' + e.message); }
    });

    $('#gi-analyze-style').on('click', async () => {
        const fileInput = document.getElementById('gi-style-image');
        if (!fileInput || !fileInput.files || !fileInput.files.length) { setStatusMsg('err', '请先选择图片'); return; }
        try {
            setStatusMsg('', '分析风格中...');
            const file = fileInput.files[0];
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result.split(',')[1]);
                reader.readAsDataURL(file);
            });
            const description = await analyzeStyleFromImage(base64);
            $('#gi-style-result').val(description);
            setStatusMsg('ok', '✓ 风格分析完成');
        } catch (e) { setStatusMsg('err', '✗ ' + e.message); }
    });

    $('#gi-save-style').on('click', () => {
        const name = ($('#gi-style-name').val() || '').trim();
        const description = ($('#gi-style-result').val() || '').trim();
        if (!name || !description) { setStatusMsg('err', '需要名称和分析结果'); return; }
        if (!settings.custom_styles) settings.custom_styles = [];
        const existing = settings.custom_styles.findIndex(cs => cs.name === name);
        if (existing >= 0) {
            settings.custom_styles[existing].description = description;
        } else {
            settings.custom_styles.push({ name, description });
        }
        saveSettingsDebounced();
        populateStyleSelect();
        setStatusMsg('ok', '✓ 风格「' + name + '」已保存');
    });

    $('#gi-test').on('click', async () => {
        try {
            setStatusMsg('', '测试中...');
            const models = await fetchModels();
            setStatusMsg('ok', '✓ 已连接，' + models.length + ' 个模型可用');
        } catch (e) { setStatusMsg('err', '✗ ' + e.message); }
    });

    $('#gi-manual').on('click', async () => {
        const ctx = getContext();
        if (ctx.chat.length > 0) await generateAndAttach(ctx.chat.length - 1);
    });
}

jQuery(async () => {
    try {
        console.log('[gemini-image] Loading...');
        loadSettings();
        buildSettingsHtml();

        // 重试按钮：点击消息上的 🔄 重新生图
        $(document).on('click', '.gi-retry', function () {
            const idx = parseInt($(this).data('idx'));
            if (!isNaN(idx)) {
                _pendingGens.delete(idx);  // 允许重新触发
                generateAndAttach(idx);
            }
        });

        // 自动拉取模型列表（有缓存就先用缓存，后台静默刷新）
        const settings = s();
        if (settings._cached_models?.length) populateModelSelects(settings._cached_models);
        const chConf = ch();
        if (chConf.api_url && chConf.api_key) {
            fetchModels().then(models => {
                settings._cached_models = models;
                saveSettingsDebounced();
                populateModelSelects(models);
            }).catch(() => {});
        }

        console.log('[gemini-image] Loaded OK');

        // 初始化时记住当前长度，不给历史消息生图
        let lastLen = getContext().chat?.length || 0;
        let lastSwipeIds = {};

        setInterval(() => {
            const settings = s();
            const ctx = getContext();

            // 自动生图：只对新增的 AI 回复触发（+1 才是真正的新消息，跳跃说明切了角色）
            const chConf = ch();
            if (settings.enabled && settings.auto_generate && chConf.api_url && chConf.api_key) {
                if (ctx.chat.length === lastLen + 1) {
                    const last = ctx.chat[ctx.chat.length - 1];
                    if (!last.is_user && !hasImageForCurrentSwipe(last)) { generateAndAttach(ctx.chat.length - 1); }
                }
            }
            lastLen = ctx.chat.length;

            // swipe 切换检测：只查最后一条，避免长聊天遍历开销
            if (ctx.chat.length > 0) {
                const lastIdx = ctx.chat.length - 1;
                const msg = ctx.chat[lastIdx];
                const curSwipe = msg.swipe_id || 0;
                if (lastSwipeIds[lastIdx] !== undefined && lastSwipeIds[lastIdx] !== curSwipe) {
                    renderGeminiImage(lastIdx);
                }
                lastSwipeIds[lastIdx] = curSwipe;
            }
        }, 1000);

        // 切换聊天时重新渲染所有 gemini 图
        const renderAllImages = () => {
            const ctx = getContext();
            lastSwipeIds = {};
            for (let i = 0; i < ctx.chat.length; i++) {
                const msg = ctx.chat[i];
                if (msg.extra?.gemini_images) {
                    lastSwipeIds[i] = msg.swipe_id || 0;
                    setTimeout(() => renderGeminiImage(i), 100);
                }
            }
        };
        $(document).on('click', '.swipe_left, .swipe_right', () => {
            setTimeout(() => {
                const ctx = getContext();
                if (ctx.chat.length > 0) renderGeminiImage(ctx.chat.length - 1);
            }, 300);
        });

        // 切换聊天时重渲染所有图片
        const observer = new MutationObserver(() => {
            setTimeout(renderAllImages, 500);
        });
        const chatEl = document.getElementById('chat');
        if (chatEl) observer.observe(chatEl, { childList: true });

    } catch (e) { console.error('[gemini-image] Init failed:', e); }
});
