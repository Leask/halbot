import { alan, bot, utilitas } from '../index.mjs';

const action = async (ctx, next) => {
    const ais = await alan.getAi(null, { all: true });
    const allAi = ais.map(x => x.id);
    switch (ctx.cmd?.cmd) {
        case 'all':
            ctx.selectedAi = allAi;
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
        case 'azure':
            if (!utilitas.insensitiveHas(allAi, 'azure')) {
                return await ctx.er('Azure is not available.');
            }
            ctx.selectedAi = ['Azure'];
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
        '¶ Use an AI model `temporary` without touching your settings.',
        'Example 1: /[AI_ID] Say hello to [AI_ID]!',
        'Example 2: /all Say hello to all AIs!',
    ]),
    cmdx: {},
};
