import { bot, utilitas } from 'utilitas';

const [balanced, on] = ['balanced', 'on'];
const bingTones = [balanced, 'creative', 'precise'];
const binaryStr = [on, 'off'];

let configuredAi;

const action = async (ctx, next) => {
    ctx.isDefaultAi = name => name === ctx.firstAi;
    ctx.clear = () => (ctx.selectedAi || []).map(n => {
        ctx._.ai[n].clear(ctx.chatId);
        ctx.hello();
    });
    ctx.firstAi = (configuredAi = Object.keys(ctx._.ai))[0];
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

const validateTone = val => {
    val = utilitas.trim(val, { case: 'LOW' });
    assert([...bingTones.includes(val), ''], 'Unsupported tone-style.');
    return val;
};

export const { run, priority, func, help, args } = {
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
        '¶ Set tone-style for Bing.',
        "Tip 4: Set `tone=''` to use default tone-style.",
    ]),
    args: {
        hello: {
            type: 'string', short: 'h', default: 'Hello!',
            desc: "Change initial prompt: /set --hello 'Bonjour!'",
        },
        ai: {
            type: 'string', short: 'a', default: '',
            desc: "`(ChatGPT, Bing, '', @)` Select AI engine.",
            validate: validateAi,
        },
        render: {
            type: 'string', short: 'r', default: on,
            desc: `\`(${binaryStr.join(', ')})\` Enable/Disable enhanced output rendering.`,
            validate: utilitas.humanReadableBoolean,
        },
        tone: {
            type: 'string', short: 't', default: balanced,
            desc: `\`(${bingTones.join(', ')})\` Set tone-style for Bing.`,
            validate: validateTone,
        },
    },
};
