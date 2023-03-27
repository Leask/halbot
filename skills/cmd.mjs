import { utilitas } from 'utilitas';

const matchReg = /^\/([^\ ]*)(.*)$/ig;

const action = async (ctx, next) => {
    if (ctx.end || !ctx.text) { return await next(); }
    ctx.session.ai || (ctx.session.ai = new Set());
    const curAi = new Set();
    ctx.cmd = ctx.text.split('\n')?.[0]?.replace(matchReg, '$1');
    let catched;
    switch (ctx.cmd) {
        case 'raw': ctx.session.raw = true; catched = true; break;
        case 'render': ctx.session.raw = false; catched = true; break;
    }
    for (let name in ctx._.ai) {
        ctx.firstAi || (ctx.firstAi = name);
        if (utilitas.insensitiveCompare(ctx.cmd, name) || ctx.cmd === '*') {
            curAi.add(name);
            catched = true;
        }
    }
    curAi.size && (ctx.session.ai = curAi);
    catched && (ctx.text = ctx.text.replace(matchReg, '$2').trim() || ctx._.hello);
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 10,
    name: 'ai',
    func: action,
};
