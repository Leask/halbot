import { alan, bot } from '../index.mjs';

const action = async (ctx, next) => {
    const ais = await alan.getAi(null, { all: true });
    const allAi = ais.map(x => x.id);
    switch (ctx.cmd.cmd) {
        case 'all':
            ctx.selectedAi = allAi;
            ctx.hello(ctx.cmd.args);
    }
    await next();
};

export const { name, run, priority, func, help, cmds } = {
    name: 'Instant',
    run: true,
    priority: 20,
    func: action,
    help: bot.lines([
        '¶ Use an AI engine `temporary` without touching your settings.',
        'Example: `/[AI_ID]` Tell me a joke.',
    ]),
    cmds: {
        all: 'Use all AI engines simultaneously: /all Say hello to all AIs!',
    },
};
