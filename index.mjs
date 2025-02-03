import { alan, bot, image, shot, speech, utilitas } from 'utilitas';
import { parse } from 'csv-parse/sync';

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

const init = async (options) => {
    assert(options?.telegramToken, 'Telegram Bot API Token is required.');
    const [pkg, ai, _speech, speechOptions, engines, vision]
        = [await utilitas.which(), {}, {}, { tts: true, stt: true }, {}, {}];
    const info = bot.lines([
        `[${bot.EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description
    ]);
    let embedding;
    // init ai engines
    // use AI vision, AI stt if ChatGPT or Gemini is enabled
    if (options?.openaiApiKey || options?.googleApiKey) {
        vision.read = alan.distillFile;
        vision.see = alan.distillFile;
        _speech.stt = alan.distillFile;
    }
    // use openai embedding, dall-e, tts if openai is enabled
    if (options?.openaiApiKey) {
        const apiKey = { apiKey: options.openaiApiKey };
        await alan.init({ provider: 'OPENAI', ...apiKey, ...options || {} });
        ai['ChatGPT'] = {
            engine: 'CHATGPT', priority: options?.chatGptPriority || 0,
        }; // only support custom model while prompting:
        engines['CHATGPT'] = { model: options?.chatGptModel, };
        embedding = alan.createOpenAIEmbedding;
        await image.init(apiKey);
        await speech.init({ ...apiKey, provider: 'OPENAI', ...speechOptions });
        _speech.tts = speech.tts;
    }
    // use gemini embedding if gemini is enabled and chatgpt is not enabled
    // use google tts if google api key is ready
    if (options?.googleApiKey) {
        const apiKey = { apiKey: options.googleApiKey };
        await alan.init({ // only support custom model while initiating:
            provider: 'GEMINI', ...apiKey,
            model: options?.geminiModel, ...options || {},
        });
        ai['Gemini'] = {
            engine: 'GEMINI', priority: options?.geminiPriority || 1,
        }; // save for reference not for prompting:
        engines['GEMINI'] = { model: options?.geminiModel };
        embedding || (embedding = alan.createGeminiEmbedding);
        if (!_speech.tts) {
            await speech.init({
                ...apiKey, provider: 'GOOGLE', ...speechOptions,
            });
            _speech.tts = speech.tts;
        }
    }
    if (options?.claudeApiKey) {
        await alan.init({
            provider: 'CLAUDE', apiKey: options?.claudeApiKey,
            ...options || {},
        });
        ai['Claude'] = {
            engine: 'CLAUDE', priority: options?.claudePriority || 2,
        }; // only support custom model while prompting:
        engines['CLAUDE'] = { model: options?.claudeModel };
    }
    if (options?.ollamaEnabled || options?.ollamaEndpoint) {
        await alan.init({
            provider: 'OLLAMA', host: options?.ollamaEndpoint,
        });
        ai['Ollama'] = {
            engine: 'OLLAMA', priority: options?.ollamaPriority || 3,
        };
        engines['OLLAMA'] = {
            // only support custom model while prompting
            model: options?.ollamaModel || alan.DEFAULT_MODELS['OLLAMA'],
        };
    }
    assert(utilitas.countKeys(ai), 'No AI provider is configured.');
    await alan.initChat({ engines, sessions: options?.storage });
    for (const i in ai) { ai[i].model = engines[ai[i].engine].model; }
    // config multimodal engines
    const supportedMimeTypes = new Set(Object.values(engines).map(
        x => alan.MODELS[x.model]
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
    _bot._.ai = ai;                                                             // Should be an array of a map of AIs.
    _bot._.lang = options?.lang || 'English';
    _bot._.image = options?.openaiApiKey && image;
    _bot._.prompts = await fetchPrompts();
    return _bot;
};

export default init;
export { alan, bot, init, speech, utilitas };
