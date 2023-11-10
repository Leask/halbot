import { bot, hal, utilitas } from 'utilitas';

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
    while (hal.countTokens(ctx.prompt) < hal.MAX_PROMPT_TOKENS
        && additionInfo.length) {
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

export const { name, run, priority, func } = {
    name: 'Prepare',
    run: true,
    priority: 70,
    func: action,
};
