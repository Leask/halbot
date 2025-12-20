import { alan, bot, hal, utilitas } from '../index.mjs';

const ais = await alan.getAi(null, { all: true });
const TOP = 'top';

const listAIs = async ctx => {
    const lastMessageId = ctx?.update?.callback_query?.message?.message_id;
    const message = `*Time:* \n${new Date().toLocaleString()}\n\n`
        + `*Features:*\n` + hal.uList(Object.entries(alan.FEATURE_ICONS).filter(
            x => x[0] !== 'hidden'
        ).map(
            x => `${x[1]} \`${x[0]}\``
        )) + `\n\n*AI${ais.length > 0 ? 's' : ''}:*\n`;
    const buttons = ais.map((x, i) => ({
        label: `${ctx._.session.config?.ai === x.id
            || (!ctx._.session.config?.ai && i === 0) ? `${hal.CHECK} `
            : ''}${x.label}`,
        text: `/set --ai=${x.id}`,
    }));
    return await ctx.ok(message, { lastMessageId, buttons });
};

const action = async (ctx, next) => {
    ctx._.ais = ais;
    switch (ctx._.cmd?.cmd) {
        case 'ai':
            return await listAIs(ctx);
        case TOP:
            ctx.hello(ctx._.cmd.args);
            ctx._.aiId = TOP;
            break;
        default:
            ctx._.aiId = ctx._.session.config?.ai;
    }
    await next();
};

const validateAi = async (val, ctx) => {
    for (let name of [...ais.map(x => x.id), '', TOP]) {
        if (utilitas.insensitiveCompare(val, name)) {
            ctx && (ctx.sendConfig = async (_c, _o) => await listAIs(ctx));
            return name;
        }
    }
    utilitas.throwError('No AI engine matched.');
};

export const { name, run, priority, func, help, args, cmds } = {
    name: 'AI', run: true, priority: 90, func: action,
    help: bot.lines([
        '¶ Set initial prompt to the AI model.',
        "Tip 1: Set `hello=''` to reset to default initial prompt.",
        '¶ Select between AI models.',
        "Tip 2: Set `ai=''` to use default AI model.",
        'Tip 3: Set `ai=[AI_ID]` to use specific AI model.',
        'Tip 4: Set `ai=top` to configure to use the top 3 AI models simultaneously.',
        '¶ Use an AI model `temporary` without touching your settings.',
        'Tip 5: `/[AI_ID]` Tell me a joke.',
        'Tip 6: `/all` Use the top 3 AI models simultaneously, for current prompt.',
    ]),
    cmds: {
        ai: 'List all available AIs.',
        all: 'Use the top 3 AI models simultaneously: /all Say hello to all AIs!',
    },
    args: {
        hello: {
            type: 'string', short: 's', default: 'Hello!',
            desc: "Change initial prompt: /set --hello 'Bonjour!'",
        },
        ai: {
            type: 'string', short: 'a', default: '',
            desc: "`(AI_ID, ..., @)` Select AI model.",
            validate: validateAi,
        },
    },
};
