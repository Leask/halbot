import { bot } from 'utilitas';

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
        case 'translate':
            ctx.overwrite(getTranslatePrompt(ctx.cmd.args || 'English'));
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
        'Prompt the AI engine to translate or polish your text.',
        'If `TO_LANG` is not specified, English is used by default.',
        'Example: /translate français',
    ]),
    cmds: {
        translate: 'Translate your text to any language: /translate `TO_LANG`',
        polish: 'Polish your text.',
        toen: 'Translate your text to English.',
        tofr: 'Translate your text to French.',
        tozht: 'Translate your text to Traditional Chinese.',
        tozhs: 'Translate your text to Simplified Chinese.',
    },
};
