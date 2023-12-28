import { alan, bot, image, shot, speech, utilitas, vision } from 'utilitas';
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
    if (options?.openaiApiKey) {
        const apiKey = { apiKey: options.openaiApiKey };
        await alan.init({ provider: 'openai', ...apiKey });
        await speech.init({ ...apiKey, provider: 'OPENAI', ...speechOptions });
        await image.init(apiKey);
        ai['ChatGPT'] = { engine: 'CHATGPT' };
        engines['CHATGPT'] = {};
    }
    if (options?.googleApiKey) {
        const apiKey = { apiKey: options.googleApiKey };
        await vision.init(apiKey);
        options?.openaiApiKey || await speech.init({
            ...apiKey, provider: 'GOOGLE', ...speechOptions,
        });
    }
    if (options?.googleCredentials && options?.googleProject) {
        await alan.init({
            provider: 'VERTEX',
            credentials: options.googleCredentials,
            project: options.googleProject,
        });
        ai['Gemini'] = { engine: 'VERTEX' };
        engines['VERTEX'] = {};
    }
    await alan.initChat({ engines, sessions: options?.storage });
    assert(utilitas.countKeys(ai), 'No AI provider is configured.');
    const _bot = await bot.init({
        args: options?.args,
        auth: options?.auth,
        botToken: options?.telegramToken,
        chatType: options?.chatType,
        cmds: options?.cmds,
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
