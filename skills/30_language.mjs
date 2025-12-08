import { bot, hal } from '../index.mjs';

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
            ctx.result = hal.map(cnf);
            ctx.hello();
            break;
    }
    await next();
};

export const { name, run, priority, func, cmds, help } = {
    name: 'Language',
    run: true,
    priority: 30,
    func: action,
    help: bot.lines([
        '¶ Set your default language.',
        'Example: /lang Français',
    ]),
    cmds: {
        lang: 'Set your default language: /lang `LANG`',
    },
};
