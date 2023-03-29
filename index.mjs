import { bot, hal, shot, speech, utilitas } from 'utilitas';
import { parse } from 'csv-parse/sync';

await utilitas.locate(utilitas.__(import.meta.url, 'package.json'));
const skillPath = utilitas.__(import.meta.url, 'skills');
const MAX_MENU_LENGTH = 32;

const promptSource = new Set([
    'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv',
]);

const init = async (options) => {
    assert(options?.telegramToken, 'Telegram Bot API Token is required.');
    const [ai, _speech, prompts] = [{}, {}, {}];
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
    utilitas.ensureArray(options?.prompts).filter(x => x).map(promptSource.add);
    for (let source of promptSource) {
        try {
            const resp = (await shot.get(source)).content;
            const pmts = parse(resp, { columns: true, skip_empty_lines: true });
            assert(pmts?.length, `Failed to load external prompts: ${source}.`);
            pmts.filter(x => x.act && x.prompt).map(x => {
                const cmd = utilitas.ensureString(x.act, { case: 'SNAKE' });
                prompts[cmd.slice(0, MAX_MENU_LENGTH)]
                    = { description: x.act, prompt: x.prompt }
            });
        } catch (err) { utilitas.log(err?.message || err); }
    }
    assert(utilitas.countKeys(ai), 'No AI provider is configured.');
    const _bot = await bot.init({
        ai, auth: options?.auth,
        botToken: options?.telegramToken,
        chatType: options?.chatType,
        homeGroup: options?.homeGroup,
        magicWord: options?.magicWord,
        private: options?.private,
        prompts, provider: 'telegram',
        skillPath: options?.skillPath || skillPath,
        speech: _speech,
    });
    // https://limits.tginfo.me/en
    await _bot.telegram.setMyCommands(Object.keys(prompts).slice(0, 100).map(
        command => ({ command, description: prompts[command].description })
    ));
    return _bot;
};

export default init;
export { bot, hal, init, speech, utilitas };
