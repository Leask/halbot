// @todo: This is a temporary solution, and will be replaced by a more elegant solution in the future.

const getTranslatePrompt = (lang) => // https://github.com/yetone/bob-plugin-openai-translator/blob/main/src/main.js
    'You are a translation engine that can only translate text and cannot interpret it.'
    + ` Translate the following text into ${lang}: `;
const getPolishPrompt = () => // https://github.com/yetone/bob-plugin-openai-polisher/blob/main/src/main.js
    'Revise the following text to make them more clear, concise, and coherent.'
    + ' Please note that you need to list the changes and briefly explain why: ';

const action = async (ctx, next) => {
    switch (ctx.cmdExt?.cmd) {
        case '2en':
            ctx.text = ctx.text.replace(`/${ctx.cmdExt?.cmd}`, getTranslatePrompt('English'));
            break;
        case '2zh':
            ctx.text = ctx.text.replace(`/${ctx.cmdExt?.cmd}`, getTranslatePrompt('Traditional Chinese'));
            break;
        case '2zht':
            ctx.text = ctx.text.replace(`/${ctx.cmdExt?.cmd}`, getTranslatePrompt('Traditional Chinese'));
            break;
        case '2zhs':
            ctx.text = ctx.text.replace(`/${ctx.cmdExt?.cmd}`, getTranslatePrompt('Simplified Chinese'));
            break;
        case '2fr':
            ctx.text = ctx.text.replace(`/${ctx.cmdExt?.cmd}`, getTranslatePrompt('French'));
            break;
        case 'p':
            ctx.text = ctx.text.replace(`/${ctx.cmdExt?.cmd}`, getPolishPrompt());
            break;
    }
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 50,
    func: action,
};
