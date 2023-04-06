import { bot, utilitas } from 'utilitas';

const action = async (ctx, next) => {
    const allAi = Object.keys(ctx._.ai);
    switch (ctx.cmd.cmd) {
        case 'all':
            ctx.selectedAi = allAi;
            ctx.multiAi = ctx.selectedAi.length > 1;
            ctx.text = ctx.cmd.args || ctx._.hello;
            break;
        case 'bing':
            assert(utilitas.insensitiveHas(allAi, 'bing'), 'Bing is not available.');
            ctx.selectedAi = ['Bing'];
            ctx.text = ctx.cmd.args || ctx._.hello;
            break;
        case 'chatgpt':
            assert(utilitas.insensitiveHas(allAi, 'chatgpt'), 'ChatGPT is not available.');
            ctx.selectedAi = ['ChatGPT'];
            ctx.text = ctx.cmd.args || ctx._.hello;
            break;
    }
    await next();
};

export const { run, priority, func, help, cmds } = {
    run: true,
    priority: 20,
    func: action,
    help: bot.lines([
        'Useful commands for AI conversation.',
        'Example 1: /chatgpt Say hello to ChatGPT!',
        'Example 2: /bing Say hello to Bing!',
        'Example 3: /all Say hello to all AI engines!',
    ]),
    cmds: {
        all: 'Use all AI engines simultaneously temporary.',
        bing: 'Use Bing as temporary AI engine.',
        chatgpt: 'Use ChatGPT as temporary AI engine.',
    },
};
