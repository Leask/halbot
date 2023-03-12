import { utilitas } from 'utilitas';

const matchReg = /^\/([^\ ]*)(.*)$/ig;

const action = async (bot) => {
    bot.use(async (ctx, next) => {
        if (ctx.end || !ctx.text) { return await next(); }
        ctx.session.ai || (ctx.session.ai = new Set());
        const curAi = new Set();
        ctx.cmd = ctx.text.split('\n')?.[0]?.replace(matchReg, '$1');
        for (let name in bot.ai) {
            ctx.firstAi || (ctx.firstAi = name);
            (utilitas.insensitiveCompare(ctx.cmd, name) || ctx.cmd === '*')
                && curAi.add(name);
        }
        curAi.size && (ctx.session.ai = curAi);
        ctx.session.ai.size && (
            ctx.text = ctx.text.replace(matchReg, '$2').trim() || bot.hello
        );
        await next();
    });
};

export const { run, priority, func } = {
    run: true,
    priority: 10,
    name: 'ai',
    func: action,
};
