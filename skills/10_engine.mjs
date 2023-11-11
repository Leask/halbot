import { bot, utilitas } from 'utilitas';

const balanced = 'balanced';
const bingTones = [balanced, 'creative', 'precise'];

let configuredAi;

const action = async (ctx, next) => {
    ctx.session.context || (ctx.session.context = {});
    ctx.session.latest || (ctx.session.latest = {});
    ctx.isDefaultAi = name => name === ctx.firstAi;
    ctx.clear = context => (ctx.selectedAi || []).map(n => {
        ctx._.ai[n].clear(ctx.chatId);
        delete ctx.session.context[n];
        delete ctx.session.latest[n];
        context && (ctx.session.context[n] = context);
    }) && ctx.hello(context?.prompt);
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
    assert([...bingTones, ''].includes(val), 'Unsupported tone-style.');
    return val;
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
        // '¶ Select between [OpenAI models](https://platform.openai.com/docs/models).',
        // "Tip !!!4!!!: Set `gptmodel=''` to use default OpenAI model.",
        // 'Popular models:',
        // '- [gpt-4](https://platform.openai.com/docs/models/gpt-4): 8192 tokens, trained Sep 2021 (Limited beta).',
        // '- [gpt-4-32k](https://platform.openai.com/docs/models/gpt-4): 32768 tokens, trained Sep 2021 (Limited beta).',
        // '- [gpt-3.5-turbo](https://platform.openai.com/docs/models/gpt-3-5): 4096 tokens, trained Sep 2021.',
        // '- [text-davinci-003](https://platform.openai.com/docs/models/gpt-3-5): 4097 tokens, trained Sep 2021.',
        // '- [text-davinci-002](https://platform.openai.com/docs/models/gpt-3-5): 4097 tokens, trained Sep 2021.',
        // '- [code-davinci-002](https://platform.openai.com/docs/models/gpt-3-5): 8001 tokens, trained Sep 2021 (Coding Optimized).',
        '¶ Set tone-style for Bing.',
        "Tip 4: Set `tone=''` to use default tone-style.",
    ]),
    args: {
        hello: {
            type: 'string', short: 's', default: 'You are ChatGPT, a large...',
            desc: "Change initial prompt: /set --hello 'Bonjour!'",
        },
        ai: {
            type: 'string', short: 'a', default: '',
            desc: "`(ChatGPT, Bing, '', @)` Select AI engine.",
            validate: validateAi,
        },
        render: {
            type: 'string', short: 'r', default: bot.BINARY_STRINGS[1],
            desc: `\`(${bot.BINARY_STRINGS.join(', ')})\` Enable/Disable enhanced output rendering.`,
            validate: utilitas.humanReadableBoolean,
        },
        // gptmodel: {
        //     type: 'string', short: 'g', default: 'gpt-3.5-turbo',
        //     desc: 'Set OpenAI model: /set --gptmodel=`MODEL`.',
        // },
        tone: {
            type: 'string', short: 't', default: balanced,
            desc: `\`(${bingTones.join(', ')})\` Set tone-style for Bing.`,
            validate: validateTone,
        },
    },
};
