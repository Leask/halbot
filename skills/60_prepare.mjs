import { alan, bot, utilitas } from 'utilitas';

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
    const maxInputTokens = alan.getMaxChatPromptLimit();
    const additionInfo = ctx.collected.filter(
        x => String.isString(x.content)
    ).map(x => x.content).join('\n').split(' ').filter(x => x);
    ctx.prompt = (ctx.text || '') + '\n\n';
    while (await alan.countTokens(ctx.prompt) < maxInputTokens
        && additionInfo.length) {
        ctx.prompt += ` ${additionInfo.shift()}`;
    }
    ctx.prompt = utilitas.trim(ctx.prompt);
    ctx.carry.attachments = ctx.collected.filter(x => x.type === 'PROMPT').map(x => x.content);
    additionInfo.filter(x => x).length && (ctx.prompt += '...');
    // next
    await next();
};

export const { name, run, priority, func } = {
    name: 'Prepare',
    run: true,
    priority: 60,
    func: action,
};
