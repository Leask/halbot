import { alan, bot, utilitas } from 'utilitas';

const EMIJI_FINISH = '☑️';

const action = async (ctx, next) => {
    const ais = await alan.getAi(null, { all: true });
    const listAIs = async () => {
        const lastMessageId = ctx.update?.callback_query?.message?.message_id;
        const message = `${bot.EMOJI_BOT} AI${ais.length > 0 ? 's' : ''}:`;
        const buttons = ais.map(x => ({
            label: `${ctx.session.config?.ai === x.id
                ? `${EMIJI_FINISH} ` : ''}${x.name}: ${x.features}`,
            text: `/ai ${x.id}`,
        }));
        return await ctx.ok(message, { lastMessageId, buttons });
    };
    switch (ctx.cmd?.cmd) {
        case 'ai':
            const aiId = utilitas.trim(ctx.cmd.args);
            if (!aiId || aiId === bot.EMOJI_BOT) { return await listAIs(); }
            assert(ais.find(x => x.id === aiId), 'No AI engine matched.');
            ctx.session.config.ai = aiId;
            return await listAIs();
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

export const { name, run, priority, func, help, args, cmdx } = {
    name: 'AI',
    run: true,
    priority: 10,
    func: action,
    help: bot.lines([
        '¶ Set initial prompt to the AI engine.',
        "Tip 1: Set `hello=''` to reset to default initial prompt.",
    ]),
    args: {
        hello: {
            type: 'string', short: 's', default: 'You are a helpful assistant.',
            desc: "Change initial prompt: /set --hello 'Bonjour!'",
        },
    },
    cmdx: {
        ai: 'List all available AIs.',
    }
};
