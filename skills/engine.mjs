import { bot, utilitas } from 'utilitas';

let configuredAi;

const action = async (ctx, next) => {
    ctx.firstAi = (configuredAi = Object.keys(ctx._.ai))[0];
    switch (ctx.session.config?.ai) {
        case '': ctx.selectedAi = [ctx.firstAi]; break;
        case '@': ctx.selectedAi = configuredAi; break;
        default: ctx.selectedAi = [configuredAi.includes(ctx.session.config?.ai)
            ? ctx.session.config?.ai : ctx.firstAi];
    }
    ctx.multiAi = ctx.selectedAi.length > 1;
    ctx.isDefaultAi = name => name === ctx.firstAi;
    ctx.clear = () => (ctx.selectedAi || []).map(n => {
        ctx._.ai[n].clear(ctx.chatId);
        ctx.hello();
    });
    await next();
};

const validate = val => {
    assert(configuredAi, 'Preparing data for this option. Please try later.');
    for (let name of [...configuredAi, '', '@']) {
        if (utilitas.insensitiveCompare(val, name)) { return name; }
    }
    utilitas.throwError('No AI engine matched.');
};

export const { run, priority, func, help, args } = {
    run: true,
    priority: 10,
    func: action,
    help: bot.lines([
        'Set initial prompt to the AI engine.',
        'Select between AI engines.',
        'Tweak output rendering.',
        "Tips 1: Set `hello ''` to reset to default initial prompt.",
        "Tips 2: Set `ai ''` to use default AI engine.",
        'Tips 3: Set `ai @` to use all AI engines simultaneously.',
        "Example 1: /set --hello 'Bonjour!'",
        "Example 1: /set --hello ''",
        'Example 2: /set --ai ChatGPT',
        'Example 3: /set --ai Bing',
        "Example 4: /set --ai ''",
        'Example 5: /set --ai @',
        'Example 6: /set --render on',
        'Example 7: /set --render off',
    ]),
    args: {
        hello: {
            type: 'string', short: 'h', default: 'Hello!',
            desc: 'Your initial prompt to the AI engine.',
        },
        ai: {
            type: 'string', short: 'a', default: '',
            desc: "`(ChatGPT, Bing, '', @)` Select AI engine.",
            validate,
        },
        render: {
            type: 'string', short: 'r', default: 'on',
            desc: '`(on, off)` Enable/Disable enhanced output rendering.',
            validate: utilitas.humanReadableBoolean,
        },
    },
};
