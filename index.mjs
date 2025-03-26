import { alan, bot, image, web, speech, utilitas } from 'utilitas';

await utilitas.locate(utilitas.__(import.meta.url, 'package.json'));
const skillPath = utilitas.__(import.meta.url, 'skills');

const init = async (options = {}) => {
    assert(options.telegramToken, 'Telegram Bot API Token is required.');
    const [pkg, _speech, speechOptions, vision]
        = [await utilitas.which(), {}, { tts: true, stt: true }, {}];
    const info = bot.lines([
        `[${bot.EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description
    ]);
    // init ai engines
    // use AI vision, AI stt if ChatGPT or Gemini is enabled
    if (options.openaiApiKey || options.googleApiKey) {
        vision.read = alan.distillFile;
        vision.see = alan.distillFile;
        _speech.stt = alan.distillFile;
    }
    // use openai embedding, dall-e, tts if openai is enabled
    if (options.openaiApiKey) {
        const apiKey = { apiKey: options.openaiApiKey, provider: 'OPENAI' };
        await alan.init({
            ...apiKey, model: options.openaiModel || '*',
            priority: options.openaiPriority, ...options
        });
        await image.init(apiKey);
        await speech.init({ ...apiKey, ...speechOptions });
        _speech.tts = speech.tts;
    }
    // use gemini embedding if gemini is enabled and chatgpt is not enabled
    // use google tts if google api key is ready
    if (options.googleApiKey) {
        const apiKey = { apiKey: options.googleApiKey, provider: 'GOOGLE' };
        await alan.init({
            ...apiKey, provider: 'GEMINI', model: options.geminiModel || '*',
            priority: options.geminiPriority, ...options
        });
        await image.init({ ...apiKey, provider: 'GEMINI' });
        if (!_speech.tts) {
            await speech.init({ ...apiKey, ...speechOptions });
            _speech.tts = speech.tts;
        }
        options.googleCx && await web.initSearch({
            ...apiKey, cx: options.googleCx,
        });
    }
    if (options.anthropicApiKey) {
        await alan.init({
            provider: 'ANTHROPIC', model: options.anthropicModel || '*',
            apiKey: options.anthropicApiKey,
            priority: options.anthropicPriority, ...options
        });
    }
    if (options.anthropicCredentials && options.anthropicProjectId) {
        await alan.init({
            provider: 'VERTEX ANTHROPIC', model: options.anthropicModel || '*',
            credentials: options.anthropicCredentials,
            projectId: options.anthropicProjectId,
            priority: options.anthropicPriority, ...options
        });
    }
    if (options.siliconflowApiKey) {
        await alan.init({
            provider: 'SILICONFLOW', model: options.siliconflowModel || '*',
            apiKey: options.siliconflowApiKey,
            priority: options.siliconflowPriority, ...options
        });
    }
    if (options.jinaApiKey) {
        const apiKey = { apiKey: options.jinaApiKey };
        await alan.init({
            provider: 'JINA', model: options.jinaModel || '*',
            ...apiKey, priority: options.jinaPriority, ...options
        });
        await web.initSearch({ provider: 'Jina', ...apiKey });
    }
    if (options.azureApiKey && options.azureEndpoint) {
        await alan.init({
            provider: 'AZURE', model: options.azureModel,
            apiKey: options.azureApiKey, priority: options.azurePriority,
            baseURL: options.azureEndpoint, ...options
        });
    }
    if (options.azureOpenaiApiKey && options.azureOpenaiEndpoint) {
        await alan.init({
            provider: 'AZURE OPENAI', model: options.azureOpenaiModel,
            apiKey: options.azureOpenaiApiKey,
            priority: options.azureOpenaiPriority,
            endpoint: options.azureOpenaiEndpoint, ...options
        });
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
        cmds.push(bot.newCommand(`ai_${x.id}`, `${x.name}: ${x.features}`));
        return x.model;
    }).map(x => [
        ...x.supportedMimeTypes || [], ...x.supportedAudioTypes || [],
    ]).flat().map(x => x.toLowerCase()));
    // init bot
    const _bot = await bot.init({
        args: options?.args,
        auth: options?.auth,
        botToken: options?.telegramToken,
        chatType: options?.chatType,
        cmds,
        database: options?.storage?.client && options?.storage,
        embedding: ais.find(x => x.embedding)?.embedding,
        supportedMimeTypes,
        hello: options?.hello,
        help: options?.help,
        homeGroup: options?.homeGroup,
        info: options?.info || info,
        magicWord: options?.magicWord,
        private: options?.private,
        botProvider: 'telegram',
        session: options?.storage,
        skillPath: options?.skillPath || skillPath,
        speech: _speech, vision,
    });
    _bot._.lang = options?.lang || 'English';
    _bot._.image = options?.openaiApiKey && image;
    return _bot;
};

export default init;
export { alan, bot, init, speech, utilitas };
