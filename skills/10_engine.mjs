import { bot, utilitas } from 'utilitas';

let configuredAi;

const action = async (ctx, next) => {
    ctx.isDefaultAi = name => name === ctx.firstAi;
    const arrSort = (configuredAi = Object.keys(ctx._.ai)).map(
        k => [k, ctx._.ai[k].priority]
    ).sort((x, y) => x[1] - y[1]);
    ctx.firstAi = arrSort[0][0];
    switch (ctx.session.config?.ai) {
        case '': ctx.selectedAi = [ctx.firstAi]; break;
        case '@': ctx.selectedAi = configuredAi; break;
        default: ctx.selectedAi = [configuredAi.includes(ctx.session.config?.ai)
            ? ctx.session.config?.ai : ctx.firstAi];
    }
    ctx.multiAi = ctx.selectedAi.length > 1;
    await next();
};

const validateAi = val => {
    assert(configuredAi, 'Preparing data for this option. Please try later.');
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
            desc: "`(ChatGPT, Gemini, Mistral, @)` Select AI engine.",
            validate: validateAi,
        },
        render: {
            type: 'string', short: 'r', default: bot.BINARY_STRINGS[0],
            desc: `\`(${bot.BINARY_STRINGS.join(', ')})\` Enable/Disable enhanced output rendering.`,
            validate: utilitas.humanReadableBoolean,
        },
    },
};
