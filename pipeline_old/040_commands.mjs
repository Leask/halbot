{
    run: true, priority: -8940, name: 'commands', func: async (ctx, next) => {
        for (let e of ctx?.entities || []) {
            if (e.type !== bot_command) { continue; }
            if (!COMMAND_REGEXP.test(e.matched)) { continue; }
            const cmd = utilitas.trim(e.matched.replace(
                COMMAND_REGEXP, '$1'
            ), { case: 'LOW' });
            ctx.cmd = { cmd, args: e.text.substring(e.offset + e.length + 1) };
            break;
        }
        for (let str of [ctx.txt || '', ctx.m.caption || ''].map(utilitas.trim)) {
            if (!ctx.cmd && COMMAND_REGEXP.test(str)) {
                ctx.cmd = { // this will faild if command includes urls
                    cmd: str.replace(COMMAND_REGEXP, '$1').toLowerCase(),
                    args: str.replace(COMMAND_REGEXP, '$4'),
                };
                break;
            }
        }
        if (ctx.cmd) {
            log(`Command: ${JSON.stringify(ctx.cmd)}`);
            ctx.session.cmds || (ctx.session.cmds = {});
            ctx.session.cmds[ctx.cmd.cmd]
                = { args: ctx.cmd.args, touchedAt: Date.now() };
        }
        await next();
    },
}
