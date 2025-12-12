import { alan, bot, hal, utilitas } from '../index.mjs';

const ais = await alan.getAi(null, { all: true });

const listAIs = async ctx => {
    const lastMessageId = ctx?.update?.callback_query?.message?.message_id;
    const message = `Features:\n`
        + hal.uList(Object.entries(alan.FEATURE_ICONS).map(
            x => `${x[1]} ${x[0]}`
        )) + `\n\nAI${ais.length > 0 ? 's' : ''}:\n`;
    const buttons = ais.map((x, i) => ({
        label: `${ctx._.session.config?.ai === x.id
            || (!ctx._.session.config?.ai && i === 0) ? `${hal.CHECK} `
            : ''}${x.name}: ${x.features}`,
        text: `/set --ai=${x.id}`,
    }));
    return await ctx.ok(message, { lastMessageId, buttons });
};

const action = async (ctx, next) => {
    ctx._.ais = ais;
    switch (ctx._.cmd?.cmd) {
        case 'ai': return await listAIs(ctx);
        case 'all': ctx.hello(ctx._.cmd.args);
    }
    if (ctx._.cmd?.cmd === 'all' || ctx._.session.config?.ai === '@') {
        ctx._.ai = ais.map(x => x.id);
    } else if (ctx._.collected?.length) {
        const supported = {};
        for (const x of ais) {
            for (const i of ctx._.collected) {
                supported[x.id] = (supported[x.id] || 0)
                    + ~~x.model.supportedMimeTypes.includes(i?.content?.mime_type) // Priority for supported mime types
                    + ~~(x.id === ctx._.session.config?.ai);                       // Priority for user selected AI
            }
        }
        ctx._.ai = [Object.keys(supported).sort(
            (x, y) => supported[y] - supported[x]
        )?.[0] || ais[0].id];
    } else if (ais.map(x => x.id).includes(ctx._.session.config?.ai)) {
        ctx._.ai = [ctx._.session.config.ai];
    } else {
        ctx._.ai = [ais[0].id];
    }
    await next();
};

const validateAi = async (val, ctx) => {
    for (let name of [...ais.map(x => x.id), '', '@']) {
        if (utilitas.insensitiveCompare(val, name)) {
            ctx && (ctx.sendConfig = async (_c, _o) => await listAIs(ctx));
            return name;
        }
    }
    utilitas.throwError('No AI engine matched.');
};

export const { name, run, priority, func, help, args, cmdx } = {
    name: 'AI',
    run: true,
    priority: 90,
    func: action,
    help: bot.lines([
        '¶ Set initial prompt to the AI model.',
        "Tip 1: Set `hello=''` to reset to default initial prompt.",
        '¶ Select between AI models.',
        "Tip 2: Set `ai=''` to use default AI model.",
        'Tip 3: Set `ai=[AI_ID]` to use specific AI model.',
        'Tip 4: Set `ai=@` to use all AI models simultaneously.',
        '¶ Use an AI model `temporary` without touching your settings.',
        'Tip 5: `/[AI_ID]` Tell me a joke.',
        'Tip 6: `/all` Use all AI models simultaneously.',
    ]),
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
    cmdx: {
        ai: 'List all available AIs.',
        all: 'Use all AI models simultaneously: /all Say hello to all AIs!',
    }
};
