import { bot } from 'utilitas';

const execPrompt = (ctx, arrLines) => ctx.collect((ctx.context = {
    cmd: ctx.cmd.cmd, prompt: bot.lines(arrLines),
}).prompt);

// Inspired by:
// https://github.com/yetone/bob-plugin-openai-translator/blob/main/src/main.js
const promptTranslate = (ctx, lang) => execPrompt(ctx, [
    'You are a translation engine that can only translate text and cannot interpret it.',
    `Translate all the following text I send to you to ${lang}.`
]);

// Inspired by:
// https://github.com/yetone/bob-plugin-openai-polisher/blob/main/src/main.js
const promptPolish = ctx => execPrompt(ctx, [
    'Revise all the following text I send to you to make them more clear, concise, and coherent.',
    'Please note that you need to list the changes and briefly explain why.',
]);

const action = async (ctx, next) => {
    switch (ctx.cmd.cmd) {
        case 'lang':
            if (!ctx.cmd.args) {
                return await ctx.ok('Please specify a language.');
            }
            const cnf = {
                ...ctx.session.config = {
                    ...ctx.session.config,
                    ...ctx.config = {
                        lang: ctx.cmd.args,
                        hello: `Please reply in ${ctx.cmd.args}. Hello!`,
                    },
                }
            };
            Object.keys(ctx.config).map(x => cnf[x] += ' <-- SET');
            ctx.result = bot.map(cnf);
            ctx.hello();
            break;
        case 'translate': promptTranslate(ctx, ctx.cmd.args || ctx.session.config?.lang || ctx._.lang); break;
        case 'polish': promptPolish(ctx); break;
        case 'toen': promptTranslate(ctx, 'English'); break;
        case 'tofr': promptTranslate(ctx, 'French'); break;
        case 'tozht': promptTranslate(ctx, 'Traditional Chinese'); break;
        case 'tozhs': promptTranslate(ctx, 'Simplified Chinese'); break;
    }
    await next();
};

export const { run, priority, func, cmds, help } = {
    run: true,
    priority: 40,
    func: action,
    help: bot.lines([
        '¶ Set your default language.',
        'Example 1: /lang Français',
        '¶ Prompt the AI engine to translate or polish your text.',
        'If `TO_LANG` is not specified, `config.lang` is used by default.',
        "If `config.lang` not found, the bot's default language is used.",
        'If bot has no default language, English is used by default.',
        'Example 2: /translate Chinese',
    ]),
    cmds: {
        lang: 'Set your default language: /lang `LANG`',
        translate: 'Translate your text to any language: /translate `TO_LANG`',
        polish: 'Polish your text.',
        toen: 'Translate your text to English.',
        tofr: 'Translate your text to French.',
        tozht: 'Translate your text to Traditional Chinese.',
        tozhs: 'Translate your text to Simplified Chinese.',
    },
};
