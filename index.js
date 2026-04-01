import { extension_settings, getContext } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const EXT_NAME = 'gemini-image';

const _pendingGens = new Map();
let _genCounter = 0;

// ── 精选风格（酒馆适用，prompt 从网关同步 2026-04-01） ──
const STYLES = {
    'none': '无风格',
    'Anime': 'Anime / 动漫',
    'Soft Anime': 'Soft Anime / 柔和动漫',
    'Otome CG': 'Otome CG / 乙女CG',
    'Fantasy Anime': 'Fantasy Anime / 幻想动漫',
    'Shinkai': 'Shinkai / 新海诚',
    'Ghibli': 'Ghibli / 吉卜力',
    'Pixiv Rank': 'Pixiv Rank / P站精选',
    'Fine Line': 'Fine Line / 韩漫',
    'Cinematic': 'Cinematic / 电影',
    'Dark': 'Dark / 暗黑',
    'Soft Portrait': 'Soft Portrait / 柔光肖像',
    'Oil Painting': 'Oil Painting / 油画',
    'Watercolor': 'Watercolor / 水彩',
    'Photorealistic': 'Photorealistic / 写实',
    'Cyberpunk': 'Cyberpunk / 赛博朋克',
    'Pixel Art': 'Pixel Art / 像素',
    'Gothic Clay': 'Gothic Clay / 哥特黏土',
};

const STYLE_PROMPTS = {
    'Anime': {prefix: 'High-quality digital anime illustration with refined lineart and confident varied line weight, elegant anime proportions with large expressive eyes featuring layered catchlights and iris detail', suffix: 'soft cel-shading with smooth gradient blending, refined facial features, graceful slender hands, silky hair with highlight streaks, cinematic lighting, soft shadows'},
    'Soft Anime': {prefix: 'High-quality digital anime illustration with soft watercolor aesthetic, refined sketchy lineart with varied line weights and delicate tapered strokes blending into soft coloring, elegant bishoujo anime proportions with large expressive eyes featuring complex layered irises and bright catchlights', suffix: 'desaturated pastel palette with gentle wet-on-wet transitions and subtle color bleeding, light cel-shading with warm peach and cool blue shadow accents, soft diffused ambient light with ethereal high-key glow, traditional watercolor paper grain texture, silky fine-line hair highlights, minimalist airy storybook atmosphere with floating particles'},
    'Otome CG': {prefix: 'An incredibly intricate digital illustration in a high-quality otome game CG style (cell shading). Features fine, delicate line art (minimal line weight), pristine clean edges, high fidelity detailing on hair strands and facial features', suffix: 'Smooth color gradients and pristine lighting, soft watercolor wash, tyndall effect, like novelai quality. NOT bold lines, thick lines, messy lines, comic book style bold outlining'},
    'Fantasy Anime': {prefix: 'High-quality fantasy anime illustration with refined lineart and varied line weights, elegant anime proportions with large detailed eyes featuring layered catchlights, refined facial features, graceful slender gestures', suffix: 'soft watercolor-like coloring with desaturated pastel tones and subtle color bleeding, ethereal diffused lighting with soft bloom effect, floating particles and magical light motes, lush fully-realized fantasy environment with atmospheric depth and dreamy haze'},
    'Shinkai': {prefix: 'High-quality digital anime illustration with crisp refined lineart and delicate tapered ends, thin internal detailing and slightly weighted outer silhouettes, elegant anime proportions with large intensely detailed eyes featuring complex iris patterns and multiple catchlights', suffix: 'saturated palette with vivid cold-warm color grading, smooth digital gradients with soft-edged cel-shading, dramatic cinematic rim lighting with subtle bloom effect, silky hair with sharp high-contrast highlights, luminous transparent sky with detailed cloud layers and sunlight rays piercing through, wistful and nostalgic atmosphere'},
    'Ghibli': {prefix: 'High-quality anime illustration with pseudo-painterly rendering and semi-thick brush strokes, refined anime proportions with expressive eyes and soft facial features', suffix: 'vivid color grading with warm natural tones, expressive shadows with soft textured lighting, silky hair with natural highlight streaks, painterly anime background with atmospheric depth, dramatic atmosphere'},
    'Pixiv Rank': {prefix: 'fine delicate line art with varied line weight, pristine clean edges, precise and sharp outlines, high-fidelity detailing on hair strands with flowing individual strands, jewel-like eyes with multiple reflections and layered iris detail, refined anime art style with vibrant saturated colors, expert light-shadow interplay with dramatic rim lighting, cinematic composition with strong focal point, atmospheric depth', suffix: 'Masterpiece, best quality, top-ranked Pixiv daily ranking illustration, like novelai quality, professional-level digital painting with exceptional polish. NOT bold lines, thick outlines, messy linework, flat coloring, dull colors, simple backgrounds, low detail'},
    'Fine Line': {prefix: 'An incredibly intricate digital illustration in a high-quality Korean webtoon style (cell shading). Features fine, delicate line art (minimal line weight), pristine clean edges, high fidelity detailing on hair strands and facial features', suffix: 'Smooth color gradients and pristine lighting, like novelai quality. NOT bold lines, thick lines, messy lines, comic book style bold outlining'},
    'Cinematic': {prefix: 'Cinematic style, movie still aesthetic, dramatic Rembrandt lighting', suffix: 'anamorphic lens feel, volumetric light rays, film grain, atmospheric haze, highly detailed'},
    'Dark': {prefix: 'Dark moody style, deep shadows, minimal cold lighting', suffix: 'noir atmosphere, misty volumetric haze, subtle rim light on edges, mysterious and brooding, highly detailed'},
    'Soft Portrait': {prefix: 'Soft portrait style, gentle diffused lighting, shallow depth of field', suffix: 'warm skin tones, smooth skin texture, dreamy bokeh highlights, intimate atmosphere, highly detailed'},
    'Oil Painting': {prefix: 'Oil painting style, rich impasto brushstrokes, semi-painterly rendering', suffix: 'Rembrandt-style golden lighting, classical composition, visible canvas texture, museum quality, highly detailed'},
    'Watercolor': {prefix: 'Detailed watercolor painting, soft translucent washes', suffix: 'visible paper texture, gentle color bleeding, warm tyndall effect lighting, delicate brushwork, highly detailed'},
    'Photorealistic': {prefix: 'Photorealistic, ultra detailed like a DSLR photograph', suffix: 'natural lighting, sharp focus, 85mm lens, shallow depth of field, highly detailed'},
    'Cyberpunk': {prefix: 'Cyberpunk style, neon-lit streets, holographic signs', suffix: 'rain reflections, futuristic dystopia, volumetric neon lighting, highly detailed'},
    'Pixel Art': {prefix: 'Pixel art style, retro 16-bit video game aesthetic', suffix: 'clean pixel boundaries, limited palette, nostalgic, charming'},
    'Gothic Clay': {prefix: 'Gothic claymation style, stop-motion clay figures', suffix: 'dark and eerie, Tim Burton inspired, textured surfaces, highly detailed'},
};

const RATIOS = {'1024x1024':'1:1 正方形','1280x720':'16:9 横屏','720x1280':'9:16 竖屏','1792x1024':'3:2 横屏','1024x1792':'2:3 竖屏'};
const QUALITY_OPTIONS = {'standard':'标准','hd':'HD 高清'};
// 渠道结构：{name, api_url, api_key, prompt_model, image_model}
// 不再硬编码 gemini/grok，用户自行添加
function newChannel(name) { return {name: name || '新渠道', api_url:'', api_key:'', prompt_model:'', image_model:''}; }

// 生图提示词模板（oneclick 风格：快照 + 风格融合 + 安全转化）
const IMAGE_PROMPT_TEMPLATE = `画面感最强的瞬间通过氛围传达——不是直接展示身体，而是用光影、姿态轮廓、散落的物品、表情特写让观者自己感受到张力。这是电影海报的逻辑：暗示比展示更有力。

请你作为专业 AI 图像提示词工程师，从故事文本中找到最值得定格的一帧，扩写成适合 Gemini 生图模型的英文提示词。

转化方向：所有身体接触、裸露、体液、暴力画面，全部转为氛围语言——剪影、散落衣物、蒸汽模糊的镜面、月光穿过窗帘、紧握的拳头、背对彼此的距离感、眼角的光。

好的提示词示例：
"two figures close together by a rain-streaked window, foreheads almost touching, warm lamplight casting long shadows, one hand reaching toward the other's face, disheveled clothing, curtains half-drawn, tender and quiet atmosphere, soft bokeh, cinematic composition"

坏的提示词（会被审核拒绝）：
"a man gripping a woman's waist, bare skin, sweat dripping, bodies pressed together" — 直接描写身体接触和裸露，必然被拒。

<story>
{{text}}
</story>

风格和物理约束：
{{style_constraint}}

请直接输出最终的英文提示词，用逗号分隔核心元素。`;

const defaultSettings = {
    enabled: false, channel: 0,
    channels: [],
    auto_generate: false, smart_trigger: true, style: 'none', ratio: '1024x1024', quality: 'standard',
    base_image: null,
};

function loadSettings() {
    extension_settings[EXT_NAME] = extension_settings[EXT_NAME] || {};
    for (const [key, val] of Object.entries(defaultSettings)) {
        if (extension_settings[EXT_NAME][key] === undefined)
            extension_settings[EXT_NAME][key] = typeof val === 'object' && val !== null && !Array.isArray(val) ? JSON.parse(JSON.stringify(val)) : val;
    }
    const st = extension_settings[EXT_NAME];
    // 迁移旧版 object channels → array channels
    if (st.channels && !Array.isArray(st.channels)) {
        const arr = [];
        for (const [k, v] of Object.entries(st.channels)) {
            if (v.api_url) arr.push({name: k, api_url: v.api_url, api_key: v.api_key || '', prompt_model: v.prompt_model || '', image_model: v.image_model || ''});
        }
        st.channels = arr;
        st.channel = 0;
    }
    // 迁移旧版单渠道
    if (st.api_url) {
        st.channels = st.channels || [];
        st.channels.push({name: 'Gemini', api_url: st.api_url, api_key: st.api_key || '', prompt_model: '', image_model: ''});
        st.channel = st.channels.length - 1;
        delete st.api_url; delete st.api_key;
    }
    if (!Array.isArray(st.channels)) st.channels = [];
    if (typeof st.channel !== 'number' || st.channel >= st.channels.length) st.channel = 0;
    const rm = {'1:1':'1024x1024','16:9':'1280x720','9:16':'720x1280','3:2':'1792x1024','2:3':'1024x1792'};
    if (rm[st.ratio]) st.ratio = rm[st.ratio];
    if (st.smart_trigger === undefined) st.smart_trigger = true;
    delete st.character_images; delete st.use_img2img; delete st.custom_style;
    delete st.custom_styles; delete st.image_guide; delete st.extract_prompt;
}

function s() { return extension_settings[EXT_NAME]; }
function ch() { const st = s(); return st.channels[st.channel] || null; }
function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
function getModel(purpose) {
    const c = ch();
    if (!c) return '';
    const explicit = purpose === 'prompt' ? c.prompt_model : c.image_model;
    return explicit || '';
}

// ── 网络层 ──

async function parseSSEResponse(resp) {
    const reader = resp.body.getReader(), decoder = new TextDecoder();
    let buffer = '', full = '';
    while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
            const t = line.trim(); if (!t || !t.startsWith('data:')) continue;
            const d = t.slice(5).trim(); if (d === '[DONE]') continue;
            try {
                const p = JSON.parse(d);
                const delta = p.choices?.[0]?.delta?.content; if (delta) full += delta;
                const msg = p.choices?.[0]?.message?.content; if (msg) full = msg;
            } catch {}
        }
    }
    return { choices: [{ message: { content: full } }] };
}

async function gatewayFetch(path, body, signal) {
    const c = ch(); if (!c?.api_url) throw new Error('未配置渠道');
    const url = c.api_url.replace(/\/+$/, '') + path;
    const opts = { method: 'POST', headers: {'Content-Type':'application/json','Authorization':'Bearer ' + c.api_key}, body: JSON.stringify(body) };
    if (signal) opts.signal = signal;
    const resp = await fetch(url, opts);
    if (!resp.ok) { const text = await resp.text(); throw new Error(resp.status + ' ' + text.slice(0, 200)); }
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('text/event-stream')) return parseSSEResponse(resp);
    return resp.json();
}

async function fetchModels() {
    const c = ch(); if (!c?.api_url) throw new Error('未配置渠道');
    const url = c.api_url.replace(/\/+$/, '') + '/v1/models';
    const resp = await fetch(url, { method: 'GET', headers: {'Authorization':'Bearer ' + c.api_key} });
    if (!resp.ok) throw new Error('Failed to fetch models: ' + resp.status);
    const data = await resp.json(); return (data.data || []).map(m => m.id);
}

// ── 场景提取 ──

function extractSceneText(html) {
    let t = html;
    t = t.replace(/<think(?:ing)?[^>]*>[\s\S]*?<\/think(?:ing)?>/gi, '');
    t = t.replace(/<(dreamweaver|fiction_protocol|system_note|ooc|meta|instruction)[^>]*>[\s\S]*?<\/\1>/gi, '');
    t = t.replace(/<\/?(dreamweaver|fiction_protocol|system_note|ooc|meta|instruction)[^>]*>/gi, '');
    t = t.replace(/\[(?:OOC|System\s*note|Note)[^\]]*\]/gi, '');
    t = t.replace(/\(\([\s\S]*?\)\)/g, '');
    t = t.replace(/^.*\b(?:bypass|unrestricted|content\s*filter|jailbreak)\b.*$/gim, '');
    t = t.replace(/<[^>]*>/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    return t.slice(0, 2000);
}

// ── 生成提示词：正文 + 风格 → flash → 完整英文生图提示词 ──
async function buildImagePrompt(text, signal) {
    const st = s();
    let styleConstraint = 'extremely detailed, high fidelity detailing, pristine clean edges, smooth color gradients, like novelai quality.';
    if (st.style !== 'none') {
        const sp = STYLE_PROMPTS[st.style];
        if (sp) styleConstraint = sp.prefix + '. ' + sp.suffix;
    }
    const promptText = IMAGE_PROMPT_TEMPLATE.replace('{{text}}', text).replace('{{style_constraint}}', styleConstraint);
    const data = await gatewayFetch('/v1/chat/completions', {
        model: getModel('prompt'), messages: [{ role: 'user', content: promptText }],
        max_tokens: 400, temperature: 0.5,
    }, signal);
    let r = data.choices?.[0]?.message?.content || '';
    return r.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// ── 生图（纯文生图，不传图片） ──
async function generateImage(finalPrompt, signal) {
    const st = s();
    const body = { prompt: finalPrompt, model: getModel('image'), n: 1, quality: st.quality, size: st.ratio, response_format: 'b64_json' };
    const data = await gatewayFetch('/v1/images/generations', body, signal);
    if (data.error) throw new Error(data.error.message || 'Gateway error');
    const sessionId = data.session_id || null;
    const item = data.data?.[0];
    let b64 = item?.b64_json;
    if (!b64 && item?.url) {
        const ir = await fetch(item.url); if (!ir.ok) throw new Error('Image URL fetch failed: ' + ir.status);
        const blob = await ir.blob();
        b64 = await new Promise(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result.split(',')[1]); rd.readAsDataURL(blob); });
    }
    if (!b64) throw new Error('No image data in response');
    return { b64, sessionId };
}

// ── 图片编辑（用户自定义指令 + 图片） ──
async function editImage(editPrompt, imageB64, sessionId, signal) {
    const body = { prompt: editPrompt, model: getModel('image'), n: 1, response_format: 'b64_json' };
    if (sessionId) { body.session_id = sessionId; } else { body.image = imageB64; }
    const data = await gatewayFetch('/v1/images/generations', body, signal);
    if (data.error) throw new Error(data.error.message || 'Gateway error');
    const newSessionId = data.session_id || sessionId;
    const item = data.data?.[0];
    let b64 = item?.b64_json;
    if (!b64 && item?.url) {
        const ir = await fetch(item.url); if (!ir.ok) throw new Error('Image URL fetch failed: ' + ir.status);
        const blob = await ir.blob();
        b64 = await new Promise(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result.split(',')[1]); rd.readAsDataURL(blob); });
    }
    if (!b64) throw new Error('No image data in response');
    return { b64, sessionId: newSessionId };
}

// ── Pro 精修 ──
async function proRefine(prompt, sessionId, signal) {
    const st = s();
    const body = { prompt: 'Refine and improve this image with more detail and polish. ' + prompt, model: getModel('image'), n: 1, quality: 'hd', size: st.ratio, response_format: 'b64_json' };
    if (sessionId) body.session_id = sessionId;
    const data = await gatewayFetch('/v1/images/generations', body, signal);
    if (data.error) throw new Error(data.error.message || 'Gateway error');
    const newSessionId = data.session_id || sessionId;
    const item = data.data?.[0];
    let b64 = item?.b64_json;
    if (!b64 && item?.url) {
        const ir = await fetch(item.url); if (!ir.ok) throw new Error('Image URL fetch failed: ' + ir.status);
        const blob = await ir.blob();
        b64 = await new Promise(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result.split(',')[1]); rd.readAsDataURL(blob); });
    }
    if (!b64) throw new Error('No image data in response');
    return { b64, sessionId: newSessionId };
}

// ── UI 工具 ──

function downloadB64(b64) {
    const bs = atob(b64), ab = new ArrayBuffer(bs.length), ia = new Uint8Array(ab);
    for (let i = 0; i < bs.length; i++) ia[i] = bs.charCodeAt(i);
    const blob = new Blob([ab], {type:'image/png'}), u = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = u; a.download = 'gemini-' + Date.now() + '.png'; a.click(); URL.revokeObjectURL(u);
}
function hasImageForCurrentSwipe(msg) { return !!msg?.extra?.gemini_images?.[msg.swipe_id || 0]; }

function _setMsgStatus(idx, cls, html) {
    const el = $(".mes[mesid=\"" + idx + "\"]"); if (!el.length) return;
    let t = el.find('.gi-msg-status');
    if (!t.length) { t = $('<div class="gi-msg-status"></div>'); el.find('.mes_text').after(t); }
    t.attr('class', 'gi-msg-status ' + cls).html(html);
}
function setStatusMsg(cls, msg) {
    const el = document.getElementById('gi-status');
    if (el) { el.className = 'gi-status ' + cls; el.textContent = msg; }
}

// ── 白箱进度 ──

function setProgress(idx, step, detail) {
    const steps = {
        optimize: { icon: '✨', text: '正在生成提示词...', pct: 30 },
        generate: { icon: '🍪', text: '正在生成图片，预计 60s', pct: 65 },
        refine:   { icon: '💎', text: '正在 Pro 精修...', pct: 85 },
        done:     { icon: '✓', text: '完成', pct: 100 },
        error:    { icon: '✗', text: detail || '失败', pct: 0 },
    };
    const info = steps[step];
    if (!info) return;
    if (step === 'done') {
        _setMsgStatus(idx, '', '');
        setStatusMsg('ok', '✓ #' + idx + ' 已生成');
        setTimeout(() => setStatusMsg('', ''), 5000);
        return;
    }
    if (step === 'error') {
        _setMsgStatus(idx, 'err', '✗ ' + (detail || '').slice(0, 60) + ' <span class="gi-retry" data-idx="' + idx + '">🔄 重试</span>');
        setStatusMsg('err', '#' + idx + ' ' + (detail || ''));
        return;
    }
    const bar = '<div class="gi-progress"><div class="gi-progress-bar" style="width:' + info.pct + '%"></div></div>';
    const extra = detail ? '<div class="gi-progress-detail">' + esc(detail).slice(0, 120) + '...</div>' : '';
    _setMsgStatus(idx, 'pending', info.icon + ' ' + info.text + bar + extra);
    setStatusMsg('', info.icon + ' #' + idx + ' ' + info.text);
}

// ── 渲染图片 ──

function renderGeminiImage(idx) {
    const ctx = getContext(), msg = ctx.chat[idx]; if (!msg) return;
    const el = $(".mes[mesid=\"" + idx + "\"]"); if (!el.length) return;
    el.find('.gi-image-block').remove();
    const imgs = msg.extra?.gemini_images; if (!imgs) return;
    const d = imgs[msg.swipe_id || 0]; if (!d) return;
    const block = $('<div class="gi-image-block"></div>'), src = 'data:image/png;base64,' + d.b64;
    const img = $('<img>').addClass('gi-generated-img').attr('src', src);
    img.on('click', () => { const ov = $('<div class="gi-lightbox"></div>'); ov.append($('<img>').attr('src', src)); ov.on('click', () => ov.remove()); $('body').append(ov); });
    const tb = $('<div class="gi-image-toolbar"></div>');
    const btn = (ic, ti, fn) => { const b = $('<button class="gi-img-btn" title="' + ti + '"><i class="fa-solid fa-' + ic + '"></i></button>'); b.on('click', e => { e.stopPropagation(); fn(); }); return b; };
    tb.append(btn('expand', '放大', () => img.trigger('click')));
    tb.append(btn('download', '下载', () => downloadB64(d.b64)));
    tb.append(btn('file-lines', '提示词', () => {
        const text = d.imagePrompt || d.imagePrompt || '无提示词';
        const ex = block.find('.gi-prompt-preview'); if (ex.length) { ex.toggle(); return; }
        const pre = $('<pre class="gi-prompt-preview"></pre>').text(text).attr('title', '点击复制');
        pre.on('click', ev => { ev.stopPropagation(); navigator.clipboard.writeText(text).then(() => { pre.css('background', 'rgba(0,128,0,0.1)'); setTimeout(() => pre.css('background', ''), 600); }); });
        block.append(pre);
    }));
    tb.append(btn('arrows-rotate', '重新生图', () => generateAndAttach(idx)));
    tb.append(btn('gem', 'Pro 精修', async () => {
        if (_pendingGens.has(idx)) return;
        const ac = new AbortController(); _pendingGens.set(idx, ac);
        try {
            setProgress(idx, 'refine');
            const result = await proRefine(d.imagePrompt || '', d.sessionId, ac.signal);
            d.b64 = result.b64; d.sessionId = result.sessionId;
            renderGeminiImage(idx); await ctx.saveChat();
            setProgress(idx, 'done');
        } catch (e) {
            if (e.name === 'AbortError') return;
            setProgress(idx, 'error', e.message);
        } finally { if (_pendingGens.get(idx) === ac) _pendingGens.delete(idx); }
    }));
    tb.append(btn('image', '去编辑', () => {
        const st = s();
        st.base_image = { b64: d.b64, name: '生成图 #' + idx };
        st._edit_session_id = null;
        saveSettingsDebounced();
        updateBaseImagePreview();
        setStatusMsg('ok', '✓ 已载入编辑区');
        setTimeout(() => setStatusMsg('', ''), 3000);
    }));
    tb.append(btn('trash', '删除', () => {
        const sid = msg.swipe_id || 0;
        if (msg.extra?.gemini_images?.[sid]) { delete msg.extra.gemini_images[sid]; el.find('.gi-image-block').remove(); getContext().saveChat(); }
    }));
    block.append(img).append(tb);
    el.find('.mes_text').after(block);
}

// ── 主流程 ──

async function generateAndAttach(idx) {
    const ctx = getContext(), msg = ctx.chat[idx]; if (!msg || msg.is_user) return;
    if (_pendingGens.has(idx)) _pendingGens.get(idx).abort();
    const ac = new AbortController(); _pendingGens.set(idx, ac); const signal = ac.signal;
    try {
        $(".mes[mesid=\"" + idx + "\"]").find('.gi-image-block').remove();
        const text = extractSceneText(msg.mes);
        if (text.length < 10) return;

        setProgress(idx, 'optimize');
        const imagePrompt = await buildImagePrompt(text, signal);
        if (!imagePrompt || imagePrompt.length < 10) { setProgress(idx, 'error', '提示词生成失败'); return; }

        setProgress(idx, 'generate', imagePrompt);
        const { b64, sessionId } = await generateImage(imagePrompt, signal);

        if (!msg.extra) msg.extra = {};
        if (!msg.extra.gemini_images) msg.extra.gemini_images = {};
        msg.extra.gemini_images[msg.swipe_id || 0] = { b64, imagePrompt, sessionId };
        renderGeminiImage(idx);
        setProgress(idx, 'done');
        await ctx.saveChat();
    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('[gemini-image]', e);
        setProgress(idx, 'error', e.message);
    } finally {
        if (_pendingGens.get(idx) === ac) _pendingGens.delete(idx);
    }
}

// ── 基底图管理 ──

function updateBaseImagePreview() {
    const st = s();
    const container = document.getElementById('gi-base-preview');
    if (!container) return;
    if (st.base_image?.b64) {
        container.innerHTML = '<img src="data:image/png;base64,' + st.base_image.b64 + '" class="gi-base-thumb" /><div class="gi-base-name">' + esc(st.base_image.name || '基底图') + '</div>';
    } else {
        container.innerHTML = '<div class="gi-base-empty">上传图片后可编辑</div>';
    }
}

function handleBaseImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const b64 = e.target.result.split(',')[1];
        const st = s();
        st.base_image = { b64, name: file.name };
        saveSettingsDebounced();
        updateBaseImagePreview();
        setStatusMsg('ok', '✓ 图片已上传');
        setTimeout(() => setStatusMsg('', ''), 3000);
    };
    reader.readAsDataURL(file);
}

// ── 设置面板 ──

function populateStyleSelect() {
    const st = s();
    const o = Object.entries(STYLES).map(([k, v]) => '<option value="' + k + '"' + (st.style === k ? ' selected' : '') + '>' + v + '</option>').join('');
    $('#gi-style').html(o);
}

function populateModelSelects(models) {
    const c = ch();
    for (const [id, p] of [['#gi-prompt-model', 'prompt'], ['#gi-image-model', 'image']]) {
        const $s = $(id), cur = c ? (p === 'prompt' ? c.prompt_model : c.image_model) : '';
        $s.html('<option value="">自动</option>' + models.map(m => '<option value="' + m + '"' + (cur === m ? ' selected' : '') + '>' + m + '</option>').join(''));
    }
}

function refreshChannelUI() {
    const c = ch();
    $('#gi-api-url').val(c?.api_url || ''); $('#gi-api-key').val(c?.api_key || '');
    $('#gi-prompt-model').val(c?.prompt_model || '');
    $('#gi-image-model').val(c?.image_model || '');
    // 渠道为空时禁用输入
    const hasChannel = !!c;
    $('#gi-api-url, #gi-api-key, #gi-prompt-model, #gi-image-model, #gi-fetch-models').prop('disabled', !hasChannel);
}

function populateChannelSelect() {
    const st = s();
    const opts = st.channels.map((c, i) => '<option value="' + i + '"' + (st.channel === i ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
    $('#gi-channel').html(opts || '<option value="" disabled>无渠道</option>');
}

function buildSettingsHtml() {
    const st = s();
    const ro = Object.entries(RATIOS).map(([k, v]) => '<option value="' + k + '"' + (st.ratio === k ? ' selected' : '') + '>' + v + '</option>').join('');
    const qo = Object.entries(QUALITY_OPTIONS).map(([k, v]) => '<option value="' + k + '"' + (st.quality === k ? ' selected' : '') + '>' + v + '</option>').join('');

    const html = '<div id="gemini-image-settings" class="inline-drawer">' +
    '<div class="inline-drawer-toggle inline-drawer-header"><b>🍪 Gemini Image Generator</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>' +
    '<div class="inline-drawer-content">' +
    '<div class="gi-row"><label>启用</label><input id="gi-enabled" type="checkbox"' + (st.enabled ? ' checked' : '') + ' /></div>' +
    '<details class="gi-section" open><summary>渠道设置</summary>' +
    '<div class="gi-row"><label>渠道</label><select id="gi-channel" class="text_pole"></select>' +
    '<button id="gi-add-channel" class="gi-img-btn" title="添加渠道" style="background:rgba(0,0,0,0.15);color:inherit;font-size:16px"><i class="fa-solid fa-plus"></i></button>' +
    '<button id="gi-del-channel" class="gi-img-btn" title="删除渠道" style="background:rgba(0,0,0,0.15);color:inherit;font-size:16px"><i class="fa-solid fa-trash"></i></button>' +
    '<button id="gi-rename-channel" class="gi-img-btn" title="重命名" style="background:rgba(0,0,0,0.15);color:inherit;font-size:16px"><i class="fa-solid fa-pen"></i></button></div>' +
    '<div class="gi-row"><label>Gateway</label><input id="gi-api-url" type="text" class="text_pole" value="" placeholder="https://..." /></div>' +
    '<div class="gi-row"><label>密钥</label><input id="gi-api-key" type="password" class="text_pole" value="" /></div>' +
    '<div class="gi-row" style="margin-top:4px"><button id="gi-fetch-models" class="menu_button"><i class="fa-solid fa-arrows-rotate"></i> 拉取模型</button></div>' +
    '<div class="gi-row"><label>Prompt</label><select id="gi-prompt-model" class="text_pole"><option value="">自动</option></select></div>' +
    '<div class="gi-row"><label>图像</label><select id="gi-image-model" class="text_pole"><option value="">自动</option></select></div>' +
    '</details><hr>' +
    '<details class="gi-section"><summary>图片编辑</summary>' +
    '<div class="gi-edit-note">上传图片后输入编辑指令（如"去掉首饰""换成红色裙子""背景改成夜晚"）。<br>⚠ 人物场景大幅改动效果不稳定，适合微调。</div>' +
    '<div id="gi-base-preview" class="gi-base-preview"></div>' +
    '<input id="gi-base-upload" type="file" accept="image/*" style="display:none" />' +
    '<div class="gi-row" style="margin-top:6px"><button id="gi-upload-btn" class="menu_button"><i class="fa-solid fa-upload"></i> 上传图片</button>' +
    '<button id="gi-clear-base" class="menu_button" style="min-width:auto"><i class="fa-solid fa-eraser"></i> 清除</button></div>' +
    '<textarea id="gi-edit-prompt" class="text_pole" rows="2" placeholder="输入编辑指令..." style="margin-top:6px"></textarea>' +
    '<div class="gi-row" style="margin-top:4px"><button id="gi-edit-btn" class="menu_button"><i class="fa-solid fa-pen"></i> 编辑图片</button></div>' +
    '<div id="gi-edit-result"></div>' +
    '</details><hr>' +
    '<div class="gi-row"><label>风格</label><select id="gi-style" class="text_pole"></select></div>' +
    '<div class="gi-row"><label>比例</label><select id="gi-ratio" class="text_pole">' + ro + '</select></div>' +
    '<div class="gi-row"><label>质量</label><select id="gi-quality" class="text_pole">' + qo + '</select></div>' +
    '<hr>' +
    '<div class="gi-row"><label>自动生图</label><input id="gi-auto" type="checkbox"' + (st.auto_generate ? ' checked' : '') + ' /></div>' +
    '<div class="gi-row"><label class="gi-checkbox-label"><input id="gi-smart-trigger" type="checkbox"' + (st.smart_trigger ? ' checked' : '') + ' /> 事件定格</label><small>仅闪光点瞬间生图</small></div>' +
    '<hr>' +
    '<div class="gi-row" style="margin-top:4px"><button id="gi-test" class="menu_button">测试连接</button><button id="gi-manual" class="menu_button">为最后一条生图</button></div>' +
    '<div id="gi-status" class="gi-status"></div></div></div>';

    $('#extensions_settings2').append(html);
    populateStyleSelect();
    populateChannelSelect();
    refreshChannelUI();
    updateBaseImagePreview();

    const bind = (id, key, ev) => { $('#' + id).on(ev || 'input', function() { st[key] = this.type === 'checkbox' ? this.checked : this.value.trim(); saveSettingsDebounced(); }); };
    bind('gi-enabled', 'enabled', 'change');
    bind('gi-ratio', 'ratio', 'change');
    bind('gi-quality', 'quality', 'change');
    bind('gi-auto', 'auto_generate', 'change');
    bind('gi-smart-trigger', 'smart_trigger', 'change');
    $('#gi-channel').on('change', function() {
        st.channel = parseInt(this.value) || 0; saveSettingsDebounced(); refreshChannelUI();
        const nc = ch(); if (nc?.api_url && nc?.api_key) fetchModels().then(m => populateModelSelects(m)).catch(() => {});
    });
    $('#gi-add-channel').on('click', () => {
        const name = prompt('渠道名称：'); if (!name) return;
        st.channels.push(newChannel(name));
        st.channel = st.channels.length - 1;
        saveSettingsDebounced(); populateChannelSelect(); refreshChannelUI();
    });
    $('#gi-del-channel').on('click', () => {
        if (!st.channels.length) return;
        const c = ch(); if (!confirm('删除渠道「' + (c?.name || '') + '」？')) return;
        st.channels.splice(st.channel, 1);
        st.channel = Math.min(st.channel, Math.max(0, st.channels.length - 1));
        saveSettingsDebounced(); populateChannelSelect(); refreshChannelUI();
    });
    $('#gi-rename-channel').on('click', () => {
        const c = ch(); if (!c) return;
        const name = prompt('新名称：', c.name); if (!name) return;
        c.name = name; saveSettingsDebounced(); populateChannelSelect();
    });
    const bindCh = (id, key) => { $('#' + id).on('input', function() { const c = ch(); if (c) { c[key] = this.value.trim(); saveSettingsDebounced(); } }); };
    bindCh('gi-api-url', 'api_url'); bindCh('gi-api-key', 'api_key');
    $('#gi-style').on('change', function() { st.style = this.value; saveSettingsDebounced(); });
    $('#gi-prompt-model').on('change', function() { const c = ch(); if (c) { c.prompt_model = this.value; saveSettingsDebounced(); } });
    $('#gi-image-model').on('change', function() { const c = ch(); if (c) { c.image_model = this.value; saveSettingsDebounced(); } });
    $('#gi-fetch-models').on('click', async () => { try { setStatusMsg('', '拉取中...'); const m = await fetchModels(); populateModelSelects(m); setStatusMsg('ok', '✓ ' + m.length + ' 模型'); } catch (e) { setStatusMsg('err', '✗ ' + e.message); } });
    $('#gi-upload-btn').on('click', () => { $('#gi-base-upload').trigger('click'); });
    $('#gi-base-upload').on('change', function() { handleBaseImageUpload(this.files[0]); });
    $('#gi-clear-base').on('click', () => { st.base_image = null; st._edit_session_id = null; saveSettingsDebounced(); updateBaseImagePreview(); $('#gi-edit-result').empty(); setStatusMsg('ok', '✓ 已清除'); setTimeout(() => setStatusMsg('', ''), 3000); });
    $('#gi-edit-btn').on('click', async () => {
        const editPrompt = $('#gi-edit-prompt').val()?.trim();
        if (!editPrompt) { setStatusMsg('err', '请输入编辑指令'); return; }
        if (!st.base_image?.b64) { setStatusMsg('err', '请先上传图片'); return; }
        const btn = $('#gi-edit-btn');
        btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 编辑中...');
        try {
            const result = await editImage(editPrompt, st.base_image.b64, st._edit_session_id);
            st.base_image = { b64: result.b64, name: '编辑结果' };
            st._edit_session_id = result.sessionId;
            saveSettingsDebounced();
            updateBaseImagePreview();
            $('#gi-edit-result').html('<div class="gi-edit-note" style="color:#2d7a52">✓ 编辑完成' + (result.sessionId ? ' · 可继续编辑' : '') + '</div>');
            setStatusMsg('ok', '✓ 编辑完成');
        } catch (e) { setStatusMsg('err', '✗ ' + e.message); }
        btn.prop('disabled', false).html('<i class="fa-solid fa-pen"></i> 编辑图片');
    });
    $('#gi-test').on('click', async () => { try { setStatusMsg('', '测试中...'); const m = await fetchModels(); setStatusMsg('ok', '✓ ' + m.length + ' 模型可用'); } catch (e) { setStatusMsg('err', '✗ ' + e.message); } });
    $('#gi-manual').on('click', async () => { const ctx = getContext(); if (ctx.chat.length > 0) await generateAndAttach(ctx.chat.length - 1); });
}

// ── 初始化 ──

jQuery(async () => {
    try {
        console.log('[gemini-image] Loading v3.0...');
        loadSettings();
        buildSettingsHtml();

        $(document).on('click', '.gi-retry', function() {
            const idx = parseInt($(this).data('idx'));
            if (!isNaN(idx)) { if (_pendingGens.has(idx)) _pendingGens.get(idx).abort(); _pendingGens.delete(idx); generateAndAttach(idx); }
        });

        const st = s();
        if (st._cached_models?.length) populateModelSelects(st._cached_models);
        const c = ch();
        if (c?.api_url && c?.api_key) fetchModels().then(m => { st._cached_models = m; saveSettingsDebounced(); populateModelSelects(m); }).catch(() => {});

        console.log('[gemini-image] Loaded OK');

        let lastLen = getContext().chat?.length || 0, lastSwipeIds = {};
        setInterval(async () => {
            const st = s(), ctx = getContext(), c = ch();
            if (!ctx.name2 || ctx.chat.length === 0) { lastLen = 0; return; }
            if (st.enabled && st.auto_generate && c?.api_url && c?.api_key) {
                if (ctx.chat.length === lastLen + 1) {
                    const last = ctx.chat[ctx.chat.length - 1];
                    if (!last.is_user && !hasImageForCurrentSwipe(last)) {
                        const idx = ctx.chat.length - 1;
                        if (st.smart_trigger) {
                            try {
                                const t = extractSceneText(last.mes);
                                if (t.length >= 30) generateAndAttach(idx);
                            } catch (e) { console.warn('[gemini-image] auto:', e); }
                        } else {
                            generateAndAttach(idx);
                        }
                    }
                }
            }
            lastLen = ctx.chat.length;
            if (ctx.chat.length > 0) {
                const li = ctx.chat.length - 1, msg = ctx.chat[li], cs = msg.swipe_id || 0;
                if (lastSwipeIds[li] !== undefined && lastSwipeIds[li] !== cs) renderGeminiImage(li);
                lastSwipeIds[li] = cs;
            }
        }, 1000);

        const renderAll = () => {
            const ctx = getContext(); lastSwipeIds = {};
            for (let i = 0; i < ctx.chat.length; i++) {
                const msg = ctx.chat[i];
                if (msg.extra?.gemini_images) { lastSwipeIds[i] = msg.swipe_id || 0; setTimeout(() => renderGeminiImage(i), 100); }
            }
        };
        $(document).on('click', '.swipe_left, .swipe_right', () => { setTimeout(() => { const ctx = getContext(); if (ctx.chat.length > 0) renderGeminiImage(ctx.chat.length - 1); }, 300); });
        const obs = new MutationObserver(() => setTimeout(renderAll, 500));
        const ce = document.getElementById('chat'); if (ce) obs.observe(ce, { childList: true });
    } catch (e) { console.error('[gemini-image] Init failed:', e); }
});
