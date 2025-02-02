import { bot, utilitas } from 'utilitas';

const action = async (ctx, next) => {
    const allAi = Object.keys(ctx._.ai);
    switch (ctx.cmd.cmd) {
        case 'all':
            ctx.selectedAi = allAi;
            // grep 'ctx.multiAi' before uncommenting the following line
            // ctx.multiAi = ctx.selectedAi.length > 1;
            ctx.hello(ctx.cmd.args);
            break;
        case 'chatgpt':
            if (!utilitas.insensitiveHas(allAi, 'chatgpt')) {
                return await ctx.er('ChatGPT is not available.');
            }
            ctx.selectedAi = ['ChatGPT'];
            ctx.hello(ctx.cmd.args);
            break;
        case 'gemini':
            if (!utilitas.insensitiveHas(allAi, 'gemini')) {
                return await ctx.er('Gemini is not available.');
            }
            ctx.selectedAi = ['Gemini'];
            ctx.hello(ctx.cmd.args);
            break;
        case 'claude':
            if (!utilitas.insensitiveHas(allAi, 'claude')) {
                return await ctx.er('Claude is not available.');
            }
            ctx.selectedAi = ['Claude'];
            ctx.hello(ctx.cmd.args);
            break;
        case 'ollama':
            if (!utilitas.insensitiveHas(allAi, 'ollama')) {
                return await ctx.er('Ollama is not available.');
            }
            ctx.selectedAi = ['Ollama'];
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
        gemini: 'Use ♊️ Gemini temporary: /gemini Say hello to Gemini!',
        chatgpt: 'Use ⚛️ ChatGPT temporary: /chatgpt Say hello to ChatGPT!',
        claude: 'Use ✴️ Claude temporary: /claude Say hello to Claude!',
        ollama: 'Use 🦙 Ollama temporary: /ollama Say hello to Ollama!',
    },
};
