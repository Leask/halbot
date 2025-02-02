import { alan, bot, utilitas } from 'utilitas';

const NAME_HACK = {
    'ChatGPT': '⚛️', 'Gemini': '♊️', 'Claude': '✴️', 'Ollama': '🦙',
};

const NAME_HACK_REVERSE = utilitas.reverseKeyValues(NAME_HACK);
const AI_CMD = '/set --ai=';

let configuredAi;

const action = async (ctx, next) => {
    ctx.isDefaultAi = name => name === ctx.firstAi;
    const arrSort = (configuredAi = Object.keys(ctx._.ai)).map(
        k => [k, ctx._.ai[k].priority]
    ).sort((x, y) => x[1] - y[1]);
    ctx.firstAi = arrSort[0][0];
    if (ctx.carry?.keyboards?.length && !ctx.carry.keyboards.find(
        x => x.find(y => y.text.includes(AI_CMD))
    )) {
        ctx.carry.keyboards.unshift(configuredAi.slice(0, 3).map(
            x => ({ text: `${AI_CMD}${NAME_HACK[x] || x}` })
        ));
    }
    switch (ctx.session.config?.ai) {
        case '@': ctx.selectedAi = configuredAi; break;
        default:
            ctx.selectedAi = [ctx.session.config?.ai];
            const foundAi = configuredAi.includes(ctx.session.config?.ai);
            if (foundAi) {
            } else if (!ctx.collected?.length) {
                ctx.selectedAi = [ctx.firstAi];
            } else {
                const supported = {};
                for (const i of configuredAi) {
                    const supportedMimeTypes = [
                        ...alan.MODELS[ctx._.ai[i].model]?.supportedMimeTypes || [],
                        ...alan.MODELS[ctx._.ai[i].model]?.supportedAudioTypes || [],
                    ];
                    for (const j of ctx.collected) {
                        supported[i] || (supported[i] = 0);
                        if (supportedMimeTypes.includes(j?.content?.mime_type)) {
                            supported[i]++;
                        }
                        if (ctx.checkSpeech() && (alan.MODELS[
                            ctx._.ai[i].model
                        ]?.supportedAudioTypes || []).includes(j?.content?.mime_type)) {
                            ctx.carry.audioMode = true;
                            if (alan.MODELS[ctx._.ai[i].model]?.audio) {
                                supported[i]++; // Priority for audio models
                            }
                        }
                    }
                }
                ctx.selectedAi = [Object.keys(supported).sort(
                    (x, y) => supported[y] - supported[x]
                )?.[0] || ctx.firstAi];
            }
    }
    // grep 'ctx.multiAi' before uncommenting the following line
    // ctx.multiAi = ctx.selectedAi.length > 1;
    await next();
};

const validateAi = val => {
    assert(configuredAi, 'Preparing data for this option. Please try later.');
    NAME_HACK_REVERSE[val] && (val = NAME_HACK_REVERSE[val]);
    for (let name of [...configuredAi, '', '@']) {
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
        '¶ Tweak enhanced output rendering.',
        'Example 1: /set --render on',
        'Example 2: /set --render off',
    ]),
    args: {
        hello: {
            type: 'string', short: 's', default: 'You are a helpful assistant.',
            desc: "Change initial prompt: /set --hello 'Bonjour!'",
        },
        ai: {
            type: 'string', short: 'a', default: '',
            desc: "`(ChatGPT, Gemini, Claude, Ollama, @)` Select AI engine.",
            validate: validateAi,
        },
        render: {
            type: 'string', short: 'r', default: bot.BINARY_STRINGS[0],
            desc: `\`(${bot.BINARY_STRINGS.join(', ')})\` Enable/Disable enhanced output rendering.`,
            validate: utilitas.humanReadableBoolean,
        },
    },
};
