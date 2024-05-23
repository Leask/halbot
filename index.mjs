import { alan, bot, dbio, image, shot, speech, utilitas, vision } from 'utilitas';
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
    const [pkg, ai, _speech, speechOptions, engines]
        = [await utilitas.which(), {}, {}, { tts: true, stt: true }, {}];
    const info = bot.lines([
        `[${bot.EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description
    ]);
    let embedding;
    // init ai engines
    if (options?.openaiApiKey || options?.chatGptApiKey) {
        const apiKey = { apiKey: options?.openaiApiKey || options?.chatGptApiKey };
        await alan.init({ ...apiKey, ...options, provider: 'OPENAI' });
        ai['ChatGPT'] = {
            engine: 'ASSISTANT', priority: options?.chatGptPriority || 0,
        };
        engines['ASSISTANT'] = {
            // only support custom model while prompting
            model: options?.chatGptModel,
        };
    }
    if (options?.googleCredentials && options?.googleProject) {
        await alan.init({
            provider: 'VERTEX',
            credentials: options.googleCredentials,
            project: options.googleProject,
            // only support custom model while initiating
            model: options?.geminiModel,
        });
        ai['Gemini'] = {
            engine: 'VERTEX', priority: options?.geminiPriority || 1,
        };
        engines['VERTEX'] = {
            // save for reference not for prompting
            model: options?.geminiModel,
        };
    }
    if (options?.mistralEnabled || options?.mistralEndpoint) {
        await alan.init({
            provider: 'OLLAMA', endpoint: options?.mistralEndpoint,
        });
        ai['Mistral'] = {
            engine: 'OLLAMA', priority: options?.mistralPriority || 2,
        };
        engines['OLLAMA'] = {
            // only support custom model while prompting
            model: options?.mistralModel,
        };
    }
    assert(utilitas.countKeys(ai), 'No AI provider is configured.');
    await alan.initChat({ engines, sessions: options?.storage });
    // init image, speech, embedding engines
    if (options?.openaiApiKey) {
        const apiKey = { apiKey: options.openaiApiKey };
        await image.init(apiKey);
        await speech.init({ ...apiKey, provider: 'OPENAI', ...speechOptions });
        embedding = alan.createOpenAIEmbedding;
    } else if (options?.googleApiKey) {
        const apiKey = { apiKey: options.googleApiKey };
        await speech.init({ ...apiKey, provider: 'GOOGLE', ...speechOptions });
        embedding = alan.createVertexEmbedding;
    }
    // init vision engine
    const supportedMimeTypes = new Set(Object.values(engines).map(
        x => alan.MODELS[x.model]
    ).map(x => x.supportedMimeTypes || []).flat().map(x => x.toLowerCase()));
    if (options?.googleApiKey) {
        const apiKey = { apiKey: options.googleApiKey };
        await vision.init(apiKey);
    }
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
        provider: 'telegram',
        session: options?.storage,
        skillPath: options?.skillPath || skillPath,
        speech: (options?.openaiApiKey || options?.googleApiKey) && speech,
        vision: options?.googleApiKey && vision,
    });
    _bot._.ai = ai;                                                             // Should be an array of a map of AIs.
    _bot._.lang = options?.lang || 'English';
    _bot._.image = options?.openaiApiKey && image;
    _bot._.prompts = await fetchPrompts();
    return _bot;
};

export default init;
export { alan, bot, init, speech, utilitas };
