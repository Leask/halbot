import { bot, utilitas } from 'utilitas';

// Inspired by:
// https://github.com/yetone/bob-plugin-openai-translator/blob/main/src/main.js
const getTranslatePrompt = lang =>
    'You are a translation engine that can only translate text and cannot interpret it.'
    + ` Translate all the following text I send to you to ${lang}.`;

// Inspired by:
// https://github.com/yetone/bob-plugin-openai-polisher/blob/main/src/main.js
const getPolishPrompt = () =>
    'Revise all the following text I send to you to make them more clear, concise, and coherent.'
    + ' Please note that you need to list the changes and briefly explain why.';

const action = async (ctx, next) => {
    switch (ctx.cmd.cmd) {
        case 'lang':
            if (!ctx.cmd.args) {
                return await ctx.ok('Please specify a language.');
            }
            const cnf = {
                ...ctx.session.config = {
                    ...ctx.session.config, ...ctx.config = {
                        lang: ctx.cmd.args,
                        hello: `Hello! I speak ${ctx.cmd.args}.`,
                    }
                }
            };
            Object.keys(ctx.config).map(x => cnf[x] = `${cnf[x]} <-- SET`);
            await ctx.map(cnf);
            await utilitas.timeout(1000);
            await ctx.hello();
            break;
        case 'translate':
            ctx.overwrite(getTranslatePrompt(ctx.cmd.args || ctx.session.config?.lang || ctx._.lang));
            break;
        case 'polish':
            ctx.overwrite(getPolishPrompt());
            break;
        case 'toen':
            ctx.overwrite(getTranslatePrompt('English'));
            break;
        case 'tofr':
            ctx.overwrite(getTranslatePrompt('French'));
            break;
        case 'tozht':
            ctx.overwrite(getTranslatePrompt('Traditional Chinese'));
            break;
        case 'tozhs':
            ctx.overwrite(getTranslatePrompt('Simplified Chinese'));
            break;
    }
    await next();
};

export const { run, priority, func, cmds, help } = {
    run: true,
    priority: 50,
    func: action,
    help: bot.lines([
        'Set your default language.',
        'Prompt the AI engine to translate or polish your text.',
        'If `LANG` is not specified, English is used by default.',
        'Example 1: /lang Français',
        'Example 2: /translate Chinese',
    ]),
    cmds: {
        lang: 'Set your default language: /lang `LANG`',
        translate: 'Translate your text to any language: /translate `LANG`',
        polish: 'Polish your text.',
        toen: 'Translate your text to English.',
        tofr: 'Translate your text to French.',
        tozht: 'Translate your text to Traditional Chinese.',
        tozhs: 'Translate your text to Simplified Chinese.',
    },
};
