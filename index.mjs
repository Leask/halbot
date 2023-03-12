import { bot, hal, speech, utilitas } from 'utilitas';

const skillPath = utilitas.__(import.meta.url, 'skills');

const init = async (options) => {
    assert(options?.telegramToken, 'Telegram Bot API Token is required.', 400);
    const [ai, _speech] = [{}, {}];
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
    assert(utilitas.countKeys(ai), 'No AI provider is configured.', 400);
    return await bot.init({
        ai, auth: options?.auth,
        botToken: options?.telegramToken,
        chatType: options?.chatType,
        homeGroup: options?.homeGroup,
        magicWord: options?.magicWord,
        private: options?.private,
        provider: 'telegram', speech: _speech,
        skillPath: options?.skillPath || skillPath,
    });
};

export default init;
export { bot, hal, init, speech, utilitas };
