import { alan, bot, utilitas } from 'utilitas';

const ais = await alan.getAi(null, { all: true });
const EMIJI_FINISH = '☑️';

const listAIs = async ctx => {
    const lastMessageId = ctx?.update?.callback_query?.message?.message_id;
    const message = `Features:\n`
        + bot.uList(Object.entries(alan.FEATURE_ICONS).map(
            x => `${x[1]} ${x[0]}`
        )) + `\n\nAI${ais.length > 0 ? 's' : ''}:\n`;
    const buttons = ais.map(x => ({
        label: `${ctx.session.config?.ai === x.id
            ? `${EMIJI_FINISH} ` : ''}${x.name}: ${x.features}`,
        text: `/set --ai=${x.id}`,
    }));
    return await ctx.ok(message, { lastMessageId, buttons });
};

const action = async (ctx, next) => {
    switch (ctx.cmd?.cmd) {
        case 'ai': return await listAIs(ctx);
    }
    switch (ctx.session.config?.ai) {
        case '@': ctx.selectedAi = ais.map(x => x.id); break;
        default:
            ctx.selectedAi = [ctx.session.config?.ai];
            const foundAi = ais.map(x => x.id).includes(ctx.session.config?.ai);
            if (foundAi) {
            } else if (!ctx.collected?.length) {
                ctx.selectedAi = [ais[0].id];
            } else {
                const supported = {};
                for (const x of ais) {
                    const supportedMimeTypes = [
                        ...x.model.supportedMimeTypes || [],
                        ...x.model.supportedAudioTypes || [],
                    ];
                    for (const i of ctx.collected) {
                        supported[x.id] || (supported[x.id] = 0);
                        if (supportedMimeTypes.includes(i?.content?.mime_type)) {
                            supported[x.id]++;
                        }
                        if (ctx.checkSpeech() && (
                            x.model.supportedAudioTypes || []
                        ).includes(i?.content?.mime_type)) {
                            ctx.carry.audioMode = true;
                            x.model.audio && (supported[x.id]++); // Priority for audio models
                        }
                    }
                }
                ctx.selectedAi = [Object.keys(supported).sort(
                    (x, y) => supported[y] - supported[x]
                )?.[0] || ais[0].id];
            }
    }
    await next();
};

const validateAi = async (val, ctx) => {
    for (let name of [...ais.map(x => x.id), '', '@']) {
        if (utilitas.insensitiveCompare(val, name)) {
            ctx && (ctx.sendConfig = async (_c, _o, ctx) => await listAIs(ctx));
            return name;
        }
    }
    utilitas.throwError('No AI engine matched.');
};

export const { name, run, priority, func, help, args, cmdx } = {
    name: 'AI',
    run: true,
    priority: 10,
    func: action,
    help: bot.lines([
        '¶ Set initial prompt to the AI engine.',
        "Tip 1: Set `hello=''` to reset to default initial prompt.",
        '¶ Select between AI engines.',
        "Tip 2: Set `ai=''` to use default AI engine.",
        'Tip 3: Set `ai=[AI_ID]` to use specific AI engine.',
        'Tip 4: Set `ai=@` to use all AI engines simultaneously.',
    ]),
    args: {
        hello: {
            type: 'string', short: 's', default: 'Hello!',
            desc: "Change initial prompt: /set --hello 'Bonjour!'",
        },
        ai: {
            type: 'string', short: 'a', default: '',
            desc: "`(AI_ID, ..., @)` Select AI engine.",
            validate: validateAi,
        },
    },
    cmdx: {
        ai: 'List all available AIs.',
    }
};
