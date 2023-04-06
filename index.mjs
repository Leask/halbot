import { bot, hal, shot, speech, utilitas } from 'utilitas';
import { parse } from 'csv-parse/sync';

await utilitas.locate(utilitas.__(import.meta.url, 'package.json'));
const log = content => utilitas.log(content, 'halbot');
const skillPath = utilitas.__(import.meta.url, 'skills');

const promptSource = new Set([
    // 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv',
    'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/4fa40ad4067dce08a007f1c07562fac9dcbfcd1d/prompts.csv',
]);

const fetchPrompts = async () => {
    const prompts = {};
    for (let source of promptSource) {
        try {
            const resp = (await shot.get(source)).content;
            const pmts = parse(resp, { columns: true, skip_empty_lines: true });
            assert(pmts?.length, `Failed to load external prompts: ${source}.`);
            pmts.filter(x => x.act && x.prompt).map(x => {
                const command = utilitas.ensureString(
                    x.act, { case: 'SNAKE' }
                ).slice(0, bot.MAX_MENU_LENGTH);
                prompts[command] = { command, ...x };
            });
        } catch (err) { log(err?.message || err); }
    }
    log(`Awesome ChatGPT Prompts: fetch ${utilitas.countKeys(prompts)} items.`);
    return prompts;
};

const init = async (options) => {
    assert(options?.telegramToken, 'Telegram Bot API Token is required.');
    const [pkg, ai, _speech] = [await utilitas.which(), {}, {}];
    const info = bot.lines([`[🤖️ ${pkg.title}](${pkg.homepage})`, pkg.description]);
    if (options?.googleApiKey) {
        await speech.init({ apiKey: options?.googleApiKey, tts: true, stt: true });
        Object.assign(_speech, { stt: speech.stt, tts: speech.tts });
    }
    if (options?.chatGptKey) {
        ai['ChatGPT'] = await hal.init({
            provider: 'CHATGPT', clientOptions: { apiKey: options.chatGptKey },
        });
    }
    if (options?.bingToken) {
        ai['Bing'] = await hal.init({
            provider: 'BING', clientOptions: { userToken: options.bingToken },
        });
    }
    assert(utilitas.countKeys(ai), 'No AI provider is configured.');
    const _bot = await bot.init({
        info: options?.info || info,
        ai, auth: options?.auth,
        botToken: options?.telegramToken,
        chatType: options?.chatType,
        homeGroup: options?.homeGroup,
        magicWord: options?.magicWord,
        private: options?.private,
        provider: 'telegram',
        session: options?.session,
        skillPath: options?.skillPath || skillPath,
        speech: _speech,
    });
    _bot._.prompts = await fetchPrompts();
    return _bot;
};

export default init;
export { bot, hal, init, speech, utilitas };
