import { alan, bot, embedding, web, utilitas } from 'utilitas';
import * as hal from './lib/hal.mjs';

await utilitas.locate(utilitas.__(import.meta.url, 'package.json'));
const skillPath = utilitas.__(import.meta.url, 'skills');

const init = async (options = {}) => {
    assert(options.telegramToken, 'Telegram Bot API Token is required.');
    let [pkg, _tts, _embedding, opts]
        = [await utilitas.which(), options?.tts, options?.embedding, null];
    const info = bot.lines([
        `[${hal.EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description
    ]);
    // use google's search if google is enabled
    options.googleApiKey && options.googleCx && await web.initSearch({
        provider: 'GOOGLE', apiKey: options.googleApiKey, cx: options.googleCx,
    });
    // use openrouter's AI models, embedding if OpenRouter is enabled
    if (options.openrouterApiKey) {
        opts = { provider: 'OPENROUTER', apiKey: options.openrouterApiKey };
        await alan.init({
            ...opts,
            model: options.openrouterModel || '*',
            priority: options.openrouterPriority, ...options,
        })
        if (!_embedding) {
            await embedding.init(opts);
            _embedding = embedding.embed;
        }
    }
    // use google's imagen, veo, tts if google is enabled
    if (options.googleApiKey) {
        opts = { provider: 'GOOGLE', apiKey: options.googleApiKey };
        await alan.init({
            ...opts, model: options.googleModel || '*',
            priority: options.googlePriority, ...options,
        });
        _tts || (_tts = alan.tts);
    }
    // use openai's embedding, tts if openai is enabled, and google is not
    if (options.openaiApiKey) {
        opts = { provider: 'OPENAI', apiKey: options.openaiApiKey };
        await alan.init({
            ...opts, model: options.openaiModel || '*',
            priority: options.openaiPriority, ...options,
        });
        if (!_embedding) {
            await embedding.init(opts);
            _embedding = embedding.embed;
        }
        _tts || (_tts = alan.tts);
    }
    // init other ai providers
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
    const supportedMimeTypes = new Set(ais.map(x => {
        // init instant ai selection
        cmds.push(hal.newCommand(`ai_${x.id}`, `${x.name}: ${x.features}`));
        return x.model;
    }).map(x => x.supportedMimeTypes || []).flat().map(x => x.toLowerCase()));
    // init hal
    const _hal = await hal.init({
        args: options?.args, auth: options?.auth,
        botToken: options?.telegramToken, chatType: options?.chatType,
        cmds, database: options?.storage?.client && options?.storage,
        embedding: _embedding, hello: options?.hello, help: options?.help,
        homeGroup: options?.homeGroup, info: options?.info || info,
        lang: options?.lang || 'English', private: options?.private,
        provider: 'telegram', session: options?.storage,
        skillPath: options?.skillPath || skillPath, supportedMimeTypes,
        tts: _tts,
    });
    return _hal;
};

export default init;
export * from 'utilitas';
export { hal, init };
