import { bot, utilitas } from 'utilitas';

// https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
const countTokens = text => text.split(/[^a-z0-9]/i).length;

const action = async (ctx, next) => {
    // avatar
    if (ctx.action) {
        ctx.avatar = '⚙️';
    } else if (ctx.msg?.voice) {
        ctx.avatar = bot.EMOJI_SPEECH; ctx.action = utilitas.trim(ctx.text);
    } else if (ctx.msg?.data) {
        ctx.avatar = '🔘'; ctx.action = utilitas.trim(ctx.text);
    } else if (ctx.msg?.poll) {
        ctx.avatar = '📊';
    } else if (ctx.cmd?.cmd) {
        ctx.avatar = '🚀'; ctx.action = utilitas.trim(ctx.text);
    } else {
        ctx.avatar = '😸';
    }
    // prompt
    const additionInfo = ctx.collected.length ? ctx.collected.map(
        x => x.content
    ).join('\n').split(' ') : [];
    ctx.text = (ctx.text || '') + '\n\n';
    while (countTokens(ctx.text) < 2250 && additionInfo.length) {
        ctx.text += ` ${additionInfo.shift()}`;
    }
    ctx.text = utilitas.trim(ctx.text);
    additionInfo.filter(x => x).length && (ctx.text += '...');
    // next
    ctx.carry = { session: ctx.chatId, context: ctx.context };
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 60,
    func: action,
};
