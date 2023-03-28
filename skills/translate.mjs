const getTranslatePrompt = (lang) => // https://github.com/yetone/bob-plugin-openai-translator/blob/main/src/main.js
    'You are a translation engine that can only translate text and cannot interpret it.'
    + ` Translate the following text into ${lang}: `;
const getPolishPrompt = () => // https://github.com/yetone/bob-plugin-openai-polisher/blob/main/src/main.js
    'Revise the following text to make them more clear, concise, and coherent.'
    + ' Please note that you need to list the changes and briefly explain why: ';

const action = async (ctx, next) => {
    if (!ctx.text) { return await next(); }
    switch (ctx.cmd) {
        case '2en':
            ctx.text = ctx.text.replace(`/${ctx.cmd}`, getTranslatePrompt('English'));
            break;
        case '2zh':
            ctx.text = ctx.text.replace(`/${ctx.cmd}`, getTranslatePrompt('Traditional Chinese'));
            break;
        case '2zht':
            ctx.text = ctx.text.replace(`/${ctx.cmd}`, getTranslatePrompt('Traditional Chinese'));
            break;
        case '2zhs':
            ctx.text = ctx.text.replace(`/${ctx.cmd}`, getTranslatePrompt('Simplified Chinese'));
            break;
        case '2fr':
            ctx.text = ctx.text.replace(`/${ctx.cmd}`, getTranslatePrompt('French'));
            break;
        case 'p':
            ctx.text = ctx.text.replace(`/${ctx.cmd}`, getPolishPrompt());
            break;
    }
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 20,
    name: 'ai',
    func: action,
};
