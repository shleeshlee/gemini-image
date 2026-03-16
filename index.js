import { extension_settings, getContext } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const EXT_NAME = 'gemini-image';

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

const defaultSettings = {
    enabled: false,
    api_url: '',
    api_key: '',
    auto_generate: false,
    style: 'none',
    ratio: '1024x1024',
    quality: 'standard',
    custom_style: '',
    custom_styles: [],
    optimize_prompt: false,
    prompt_model: '',
    image_model: '',
    extract_prompt: 'Based on the following story/dialogue scene, extract key visual elements for image generation. Output a concise English image prompt (max 150 words) describing the scene, characters, actions, and environment. Focus on visual details only.\n\nScene:\n{{text}}\n\nImage prompt:',
};

function loadSettings() {
    extension_settings[EXT_NAME] = extension_settings[EXT_NAME] || {};
    for (const [key, val] of Object.entries(defaultSettings)) {
        if (extension_settings[EXT_NAME][key] === undefined) {
            extension_settings[EXT_NAME][key] = val;
        }
    }
    const ratioMap = { '1:1': '1024x1024', '16:9': '1280x720', '9:16': '720x1280', '3:2': '1792x1024', '2:3': '1024x1792' };
    const cur = extension_settings[EXT_NAME].ratio;
    if (ratioMap[cur]) extension_settings[EXT_NAME].ratio = ratioMap[cur];
}

function s() { return extension_settings[EXT_NAME]; }

function getModel(purpose) {
    const settings = s();
    const explicit = purpose === 'prompt' ? settings.prompt_model : settings.image_model;
    const base = explicit || 'gemini-3.0-flash';
    return base;
}

async function gatewayFetch(path, body) {
    const settings = s();
    const url = settings.api_url.replace(/\/+$/, '') + path;
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.api_key },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(resp.status + ' ' + text.slice(0, 200));
    }
    return resp.json();
}

async function fetchModels() {
    const settings = s();
    const url = settings.api_url.replace(/\/+$/, '') + '/v1/models';
    const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + settings.api_key },
    });
    if (!resp.ok) throw new Error('Failed to fetch models: ' + resp.status);
    const data = await resp.json();
    return (data.data || []).map(m => m.id);
}

async function extractKeywords(sceneText) {
    const settings = s();
    const prompt = settings.extract_prompt.replace('{{text}}', sceneText.slice(-800));
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
                content: 'You are an image prompt optimizer for Google Gemini. Expand the user\'s brief description into a vivid scene description. ONLY enrich the CONTENT: subject, action, pose, expression, clothing, environment, spatial relationships, textures, materials, weather, time of day. Do NOT specify art style, rendering technique, camera/lens, lighting technique, color palette, or quality boosters — these are controlled separately. 100 words max. Output ONLY the optimized prompt.',
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
                { type: 'text', text: 'Analyze the artistic style of this image in detail. Describe the color palette, lighting, texture, composition, mood, and any notable artistic techniques. Write a single cohesive paragraph that could be used as a style description for generating similar images. Output ONLY the style description.' },
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

    // 风格 U 型拼接：风格 + 内容 + 风格（前后包夹提升遵从度）
    let finalPrompt = prompt;
    const styleKey = settings.style;
    let styleDesc = '';
    if (styleKey !== 'none') {
        if (styleKey.startsWith('custom:')) {
            const customName = styleKey.replace('custom:', '');
            const found = (settings.custom_styles || []).find(cs => cs.name === customName);
            if (found) styleDesc = found.description + ' style';
        } else {
            styleDesc = styleKey + ' style';
        }
    }
    if (settings.custom_style) {
        styleDesc = styleDesc ? styleDesc + ', ' + settings.custom_style : settings.custom_style;
    }
    if (styleDesc) {
        finalPrompt = styleDesc + ', ' + finalPrompt + '. ' + styleDesc;
    }
    // 比例拼入 prompt
    if (settings.ratio !== '1024x1024') {
        const ratioLabel = RATIOS[settings.ratio] || settings.ratio;
        finalPrompt = finalPrompt + ', aspect ratio ' + ratioLabel.split(' ')[0];
    }

    const body = {
        prompt: finalPrompt,
        model: getModel('image'),
        n: 1,
        quality: settings.quality,
    };

    const data = await gatewayFetch('/v1/images/generations', body);

    if (data.error) {
        throw new Error(data.error.message || 'Gateway returned an error');
    }
    if (!data.data?.[0]?.b64_json) {
        throw new Error('No image data in response');
    }
    return { b64: data.data[0].b64_json, prompt: finalPrompt };
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
    toolbar.append(zoomBtn).append(dlBtn).append(regenBtn);

    block.append(img).append(toolbar);
    mesEl.find('.mes_text').after(block);
}

function hasImageForCurrentSwipe(message) {
    if (!message?.extra?.gemini_images) return false;
    const swipeId = message.swipe_id || 0;
    return !!message.extra.gemini_images[swipeId];
}

async function generateAndAttach(messageIndex) {
    const context = getContext();
    const message = context.chat[messageIndex];
    if (!message || message.is_user) return;
    const statusEl = document.getElementById('gi-status');
    const setStatus = (cls, msg) => { if (statusEl) { statusEl.className = 'gi-status ' + cls; statusEl.textContent = msg; } };
    try {
        // 先删掉当前图，让用户知道在重新生成
        const mesEl = $(".mes[mesid=\"" + messageIndex + "\"]");
        mesEl.find('.gi-image-block').remove();

        const sceneText = message.mes.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (sceneText.length < 10) return;
        setStatus('', '🔍 提取关键词中...');
        const keywords = await extractKeywords(sceneText);
        if (!keywords || keywords.length < 5) { setStatus('err', '关键词提取失败'); return; }
        setStatus('', '🍪 生成图片中...（' + keywords.slice(0, 60) + '...）');
        const { b64, prompt } = await generateImage(keywords);

        // 按 swipe_id 存图，每个 swipe 绑定自己的图
        if (!message.extra) message.extra = {};
        if (!message.extra.gemini_images) message.extra.gemini_images = {};
        const swipeId = message.swipe_id || 0;
        message.extra.gemini_images[swipeId] = { b64, prompt };

        renderGeminiImage(messageIndex);
        await context.saveChat();
        setStatus('ok', '✓ 已生成 (' + prompt.slice(0, 50) + '...)');
        setTimeout(() => setStatus('', ''), 5000);
    } catch (e) { console.error('[gemini-image]', e); setStatus('err', e.message); }
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
    for (const id of ['#gi-prompt-model', '#gi-image-model']) {
        const $sel = $(id);
        const cur = $sel.val();
        $sel.html('<option value="">自动（gemini-3.0-flash）</option>' + models.map(m => '<option value="' + m + '"' + (cur === m ? ' selected' : '') + '>' + m + '</option>').join(''));
    }
}

function buildSettingsHtml() {
    const settings = s();
    const ratioOpts = Object.entries(RATIOS).map(([k, v]) => '<option value="' + k + '"' + (settings.ratio === k ? ' selected' : '') + '>' + v + '</option>').join('');
    const qualityOpts = Object.entries(QUALITY_OPTIONS).map(([k, v]) => '<option value="' + k + '"' + (settings.quality === k ? ' selected' : '') + '>' + v + '</option>').join('');
    const html = '<div id="gemini-image-settings" class="inline-drawer">' +
        '<div class="inline-drawer-toggle inline-drawer-header">' +
            '<b>🍪 Gemini Image Generator</b>' +
            '<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>' +
        '</div>' +
        '<div class="inline-drawer-content">' +
            '<div class="gi-row"><label>启用</label><input id="gi-enabled" type="checkbox"' + (settings.enabled ? ' checked' : '') + ' /></div>' +

            '<details class="gi-section"><summary>渠道设置</summary>' +
                '<div class="gi-row"><label>Gateway</label><input id="gi-api-url" type="text" class="text_pole" value="' + (settings.api_url || '') + '" placeholder="https://example.com" /></div>' +
                '<div class="gi-row"><label>密钥</label><input id="gi-api-key" type="password" class="text_pole" value="' + (settings.api_key || '') + '" placeholder="API Key 或面板密码" /></div>' +
                '<div class="gi-row" style="margin-top:4px"><button id="gi-fetch-models" class="menu_button"><i class="fa-solid fa-arrows-rotate"></i> 拉取模型</button></div>' +
                '<div class="gi-row"><label>Prompt 模型</label><select id="gi-prompt-model" class="text_pole"><option value="">自动（gemini-3.0-flash）</option></select></div>' +
                '<div class="gi-row"><label>图像模型</label><select id="gi-image-model" class="text_pole"><option value="">自动（gemini-3.0-flash）</option></select></div>' +
            '</details>' +

            '<hr>' +
            '<div class="gi-row"><label>风格</label><select id="gi-style" class="text_pole"></select></div>' +
            '<div class="gi-row"><label>比例</label><select id="gi-ratio" class="text_pole">' + ratioOpts + '</select></div>' +
            '<div class="gi-row"><label>质量</label><select id="gi-quality" class="text_pole">' + qualityOpts + '</select></div>' +
            '<div class="gi-row"><label>自定义风格</label><input id="gi-custom-style" type="text" class="text_pole" value="' + (settings.custom_style || '') + '" placeholder="soft lighting, pastel colors" /></div>' +

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
                '<textarea id="gi-extract-prompt" class="text_pole" rows="4" style="margin-top:4px;font-size:0.82em">' + settings.extract_prompt + '</textarea>' +
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
    bind('gi-api-url', 'api_url');
    bind('gi-api-key', 'api_key');
    bind('gi-ratio', 'ratio', 'change');
    bind('gi-quality', 'quality', 'change');
    bind('gi-custom-style', 'custom_style');
    bind('gi-optimize-prompt', 'optimize_prompt', 'change');
    bind('gi-auto', 'auto_generate', 'change');
    bind('gi-extract-prompt', 'extract_prompt');

    $('#gi-style').on('change', function () { settings.style = this.value; saveSettingsDebounced(); });
    $('#gi-prompt-model').on('change', function () { settings.prompt_model = this.value; saveSettingsDebounced(); });
    $('#gi-image-model').on('change', function () { settings.image_model = this.value; saveSettingsDebounced(); });

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
        console.log('[gemini-image] Loaded OK');

        let lastLen = 0;
        let lastSwipeIds = {};

        setInterval(() => {
            const settings = s();
            const ctx = getContext();

            // 自动生图
            if (settings.enabled && settings.auto_generate && settings.api_url && settings.api_key) {
                if (ctx.chat.length > lastLen && ctx.chat.length > 0) {
                    const last = ctx.chat[ctx.chat.length - 1];
                    if (!last.is_user && !hasImageForCurrentSwipe(last)) { lastLen = ctx.chat.length; generateAndAttach(ctx.chat.length - 1); }
                }
            }
            lastLen = ctx.chat.length;

            // swipe 切换检测：swipe_id 变了就重新渲染对应的图
            for (let i = 0; i < ctx.chat.length; i++) {
                const msg = ctx.chat[i];
                const curSwipe = msg.swipe_id || 0;
                if (lastSwipeIds[i] !== undefined && lastSwipeIds[i] !== curSwipe) {
                    renderGeminiImage(i);
                }
                lastSwipeIds[i] = curSwipe;
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

    } catch (e) { console.error('[gemini-image] Init failed:', e); }
});
