import { alan, bot, embedding, gen, web, speech, utilitas } from 'utilitas';
import * as hal from './lib/hal.mjs';

await utilitas.locate(utilitas.__(import.meta.url, 'package.json'));
const skillPath = utilitas.__(import.meta.url, 'skills');

const init = async (options = {}) => {
    assert(options.telegramToken, 'Telegram Bot API Token is required.');
    let [pkg, _speech, _embedding, speechOptions, vision, opts] = [
        await utilitas.which(), options?.speech || {}, options?.embedding,
        { tts: true, stt: true }, {}, null,
    ];
    const info = bot.lines([
        `[${hal.EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description
    ]);
    // use AI vision, AI stt if OpenRouter, Gemini or OpenAI is enabled
    if (options.openrouterApiKey
        || options.openaiApiKey || options.googleApiKey) {
        vision.read = alan.distillFile;
        vision.see = alan.distillFile;
        _speech?.stt || (_speech.stt = alan.distillFile);
    }
    // use embedding if OpenRouter is enabled
    if (options.openrouterApiKey && !_embedding) {
        await embedding.init({
            provider: 'OPENROUTER', apiKey: options.openrouterApiKey,
        });
        _embedding = embedding.embed;
    }
    // use google's imagen, veo, search, tts if google is enabled
    if (options.googleApiKey) {
        opts = { provider: 'GOOGLE', apiKey: options.googleApiKey };
        await gen.init(opts);
        options.googleCx && await web.initSearch({
            ...opts, cx: options.googleCx,
        });
        if (!_speech.tts) {
            await speech.init({ ...opts, ...speechOptions });
            _speech.tts = speech.tts;
        }
    }
    // use openai's dall-e, embedding, tts if openai is enabled, and google is not
    if (options.openaiApiKey) {
        opts = { provider: 'OPENAI', apiKey: options.openaiApiKey };
        await gen.init(opts);
        if (!_embedding) {
            await embedding.init(opts);
            _embedding = embedding.embed;
        }
        if (!_speech.tts) {
            await speech.init({ ...opts, ...speechOptions });
            _speech.tts = speech.tts;
        }
    }
    // init ai providers
    options.openrouterApiKey && await alan.init({
        provider: 'OPENROUTER', apiKey: options.openrouterApiKey,
        model: options.openrouterModel || '*',
        priority: options.openrouterPriority, ...options,
    });
    options.siliconflowApiKey && await alan.init({
        provider: 'SILICONFLOW', apiKey: options.siliconflowApiKey,
        model: options.siliconflowModel || '*',
        priority: options.siliconflowPriority, ...options,
    });
    if (options.jinaApiKey) {
        opts = { provider: 'JINA', apiKey: options.jinaApiKey };
        await alan.init({
            ...opts, model: options.jinaModel || '*',
            priority: options.jinaPriority, ...options
        });
        await web.initSearch(opts);
    }
    if (options?.ollamaEnabled || options?.ollamaEndpoint) {
        await alan.init({
            provider: 'OLLAMA', model: options?.ollamaModel || '*',
            priority: options?.ollamaPriority,
            host: options?.ollamaEndpoint, ...options
        });
    }
    const { ais } = await alan.initChat({ sessions: options?.storage });
    const cmds = options?.cmds || [];
    // config multimodal engines
    const supportedMimeTypes = new Set(Object.values(ais).map(x => {
        // init instant ai selection
        cmds.push(hal.newCommand(`ai_${x.id}`, `${x.name}: ${x.features}`));
        return x.model;
    }).map(x => [
        ...x.supportedMimeTypes,
        ...x.supportedDocTypes,
        ...x.supportedAudioTypes,
    ]).flat().map(x => x.toLowerCase()));
    // init hal
    const _hal = await hal.init({
        args: options?.args,
        auth: options?.auth,
        botToken: options?.telegramToken,
        chatType: options?.chatType,
        cmds,
        database: options?.storage?.client && options?.storage,
        supportedMimeTypes,
        hello: options?.hello,
        help: options?.help,
        homeGroup: options?.homeGroup,
        info: options?.info || info,
        private: options?.private,
        provider: 'telegram',
        session: options?.storage,
        skillPath: options?.skillPath || skillPath,
        embedding: _embedding, speech: _speech, vision,
    });
    _hal._.lang = options?.lang || 'English';
    _hal._.gen = options?.gen
        || (options?.openaiApiKey || geminiGenReady ? gen : null);
    return _hal;
};

export default init;
export * from 'utilitas';
export { hal, init };
