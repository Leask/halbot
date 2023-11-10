import { bot, utilitas } from 'utilitas';

const action = async (ctx, next) => {
    const allAi = Object.keys(ctx._.ai);
    switch (ctx.cmd.cmd) {
        case 'all':
            ctx.selectedAi = allAi;
            ctx.multiAi = ctx.selectedAi.length > 1;
            ctx.hello(ctx.cmd.args);
            break;
        case 'bing':
            assert(utilitas.insensitiveHas(allAi, 'bing'), 'Bing is not available.');
            ctx.selectedAi = ['Bing'];
            ctx.hello(ctx.cmd.args);
            break;
        case 'chatgpt':
            assert(utilitas.insensitiveHas(allAi, 'chatgpt'), 'ChatGPT is not available.');
            ctx.selectedAi = ['ChatGPT'];
            ctx.hello(ctx.cmd.args);
            break;
    }
    await next();
};

export const { name, run, priority, func, help, cmds } = {
    name: 'Instant',
    run: true,
    priority: 20,
    func: action,
    help: bot.lines([
        'Use an AI engine `temporary` without touching your settings.',
    ]),
    cmds: {
        all: 'Use all AI engines simultaneously: /all Say hello to all AIs!',
        chatgpt: 'Use ChatGPT temporary: /chatgpt Say hello to ChatGPT!',
        bing: 'Use Bing temporary: /bing Say hello to Bing!',
    },
};
