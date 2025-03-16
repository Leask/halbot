import { parse } from 'csv-parse/sync';
import { alan, bot, image, shot, speech, utilitas } from 'utilitas';

await utilitas.locate(utilitas.__(import.meta.url, 'package.json'));
const log = content => utilitas.log(content, 'halbot');
const skillPath = utilitas.__(import.meta.url, 'skills');

const promptSource = new Set([
    // 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv',
    'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/82f15563c9284c01ca54f0b915ae1aeda5a0fc3a/prompts.csv'
]);

const fetchPrompts = async () => {
    const prompts = {};
    for (let source of promptSource) {
        try {
            const resp = (await shot.get(source)).content;
            const pmts = parse(resp, { columns: true, skip_empty_lines: true });
            assert(pmts?.length, `Failed to load external prompts: ${source}.`);
            pmts.filter(x => x.act && x.prompt).map(x => {
                const { command, description } = bot.newCommand(x.act, x.act);
                prompts[command] = { ...x, command, act: description };
            });
        } catch (err) { log(err?.message || err); }
    }
    log(`Awesome ChatGPT Prompts: fetch ${utilitas.countKeys(prompts)} items.`);
    return prompts;
};

const init = async (options = {}) => {
    assert(options.telegramToken, 'Telegram Bot API Token is required.');
    const [pkg, _speech, speechOptions, vision]
        = [await utilitas.which(), {}, { tts: true, stt: true }, {}];
    const info = bot.lines([
        `[${bot.EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description
    ]);
    let embedding;
    // init ai engines
    // use AI vision, AI stt if ChatGPT or Gemini is enabled
    if (options.openaiApiKey || options.googleApiKey) {
        vision.read = alan.distillFile;
        vision.see = alan.distillFile;
        _speech.stt = alan.distillFile;
    }
    // use openai embedding, dall-e, tts if openai is enabled
    if (options.openaiApiKey) {
        const apiKey = { apiKey: options.openaiApiKey };
        const ai = await alan.init({
            id: 'ChatGPT', provider: 'OPENAI', model: options?.chatGptModel,
            ...apiKey, priority: options?.chatGptPriority || 0, ...options
        });
        embedding = ai.embedding;
        await image.init(apiKey);
        await speech.init({ ...apiKey, provider: 'OPENAI', ...speechOptions });
        _speech.tts = speech.tts;
    }
    // use gemini embedding if gemini is enabled and chatgpt is not enabled
    // use google tts if google api key is ready
    if (options?.googleApiKey) {
        const apiKey = { apiKey: options.googleApiKey };
        const ai = await alan.init({
            id: 'Gemini', provider: 'GEMINI', model: options?.geminiModel,
            ...apiKey, priority: options?.geminiPriority || 1, ...options
        });
        embedding || (embedding = ai.embedding);
        if (!_speech.tts) {
            await speech.init({
                ...apiKey, provider: 'GOOGLE', ...speechOptions,
            });
            _speech.tts = speech.tts;
        }
        options?.googleCx && await shot.initSearch({
            apiKey: options.googleApiKey, cx: options.googleCx
        });
    }
    if (options?.anthropicApiKey
        || (options?.anthropicCredentials && options?.anthropicProjectId)) {
        await alan.init({
            id: 'Claude', provider: 'CLAUDE', model: options?.claudeModel,
            apiKey: options?.claudeApiKey,
            credentials: options?.claudeCredentials,
            projectId: options?.claudeProjectId,
            priority: options?.claudePriority || 2, ...options
        });
    }
    if (options?.azureApiKey && options?.azureEndpoint) {
        await alan.init({
            id: 'Azure', provider: 'AZURE', model: options?.azureModel,
            apiKey: options?.azureApiKey, priority: options?.azurePriority || 3,
            baseURL: options?.azureEndpoint, ...options
        });
    }
    if (options?.ollamaEnabled || options?.ollamaEndpoint) {
        await alan.init({
            id: 'Ollama', provider: 'OLLAMA', model: options?.ollamaModel,
            priority: options?.ollamaPriority || 99,
            host: options?.ollamaEndpoint, ...options
        });
    }
    const { ais } = await alan.initChat({ sessions: options?.storage });
    // config multimodal engines
    const supportedMimeTypes = new Set(Object.values(ais).map(
        x => x.model
    ).map(x => [
        ...x.supportedMimeTypes || [], ...x.supportedAudioTypes || [],
    ]).flat().map(x => x.toLowerCase()));
    // init bot
    const _bot = await bot.init({
        args: options?.args,
        auth: options?.auth,
        botToken: options?.telegramToken,
        chatType: options?.chatType,
        cmds: options?.cmds,
        database: options?.storage?.client && options?.storage,
        embedding, supportedMimeTypes,
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
    _bot._.prompts = await fetchPrompts();
    return _bot;
};

export default init;
export { alan, bot, init, speech, utilitas };
