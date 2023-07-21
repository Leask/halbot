import { bot, utilitas } from 'utilitas';

// https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
const countTokens = text => Math.ceil(text.split(/[^a-z0-9]/i).length * 100 / 75);
const maxTokens = Math.floor(8192 * 0.6); // remaining 40% for response

const action = async (ctx, next) => {
    // avatar
    if (ctx.result) {
        ctx.avatar = '⚙️';
    } else if (ctx.msg?.voice) {
        ctx.avatar = bot.EMOJI_SPEECH; ctx.result = utilitas.trim(ctx.text);
    } else if (ctx.msg?.data) {
        ctx.avatar = '🔘'; ctx.result = utilitas.trim(ctx.text);
    } else if (ctx.msg?.poll) {
        ctx.avatar = '📊';
    } else if (ctx.cmd?.cmd && ctx.cmd?.cmd !== 'clear') {
        ctx.avatar = '🚀'; ctx.result = utilitas.trim(ctx.text);
    } else {
        ctx.avatar = '😸';
    }
    // prompt
    const additionInfo = ctx.collected.length ? ctx.collected.map(
        x => x.content
    ).join('\n').split(' ') : [];
    ctx.prompt = (ctx.text || '') + '\n\n';
    while (countTokens(ctx.prompt) < maxTokens && additionInfo.length) {
        ctx.prompt += ` ${additionInfo.shift()}`;
    }
    ctx.prompt = utilitas.trim(ctx.prompt);
    additionInfo.filter(x => x).length && (ctx.prompt += '...');
    // next
    ctx.carry = {
        sessionId: ctx.chatId,
        toneStyle: ctx.session.config?.tone,
    };
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 60,
    func: action,
};
