import { alan, bot, utilitas } from 'utilitas';

const NAME_HACK = {
    'ChatGPT': '⚛️', 'Gemini': '♊️', 'Claude': '✴️', 'Ollama': '🦙', 'Azure': '☁️',
};

const NAME_HACK_REVERSE = utilitas.reverseKeyValues(NAME_HACK);
const AI_CMD = '/set --ai=';

const action = async (ctx, next) => {
    const ais = await alan.getAi(null, { all: true });
    if (ctx.carry?.keyboards?.length && !ctx.carry.keyboards.find(
        x => x.find(y => y.text.includes(AI_CMD))
    )) {
        ctx.carry.keyboards.unshift(ais.slice(0, 3).map(
            x => ({ text: `${AI_CMD}${NAME_HACK[x.id] || x.id}` })
        ));
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

const validateAi = async val => {
    NAME_HACK_REVERSE[val] && (val = NAME_HACK_REVERSE[val]);
    for (let name of [...(
        await alan.getAi(null, { all: true })
    ).map(x => x.id), '', '@']) {
        if (utilitas.insensitiveCompare(val, name)) { return name; }
    }
    utilitas.throwError('No AI engine matched.');
};

export const { name, run, priority, func, help, args } = {
    name: 'Engine',
    run: true,
    priority: 10,
    func: action,
    help: bot.lines([
        '¶ Set initial prompt to the AI engine.',
        "Tip 1: Set `hello=''` to reset to default initial prompt.",
        '¶ Select between AI engines.',
        "Tip 2: Set `ai=''` to use default AI engine.",
        'Tip 3: Set `ai=@` to use all AI engines simultaneously.',
    ]),
    args: {
        hello: {
            type: 'string', short: 's', default: 'You are a helpful assistant.',
            desc: "Change initial prompt: /set --hello 'Bonjour!'",
        },
        ai: {
            type: 'string', short: 'a', default: '',
            desc: "`(ChatGPT, Gemini, Claude, Azure, Ollama, @)` Select AI engine.",
            validate: validateAi,
        },
    },
};
