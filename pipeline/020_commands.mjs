import { hal, utilitas } from '../index.mjs';

const COMMAND_REGEXP = /^\/([a-z0-9_]+)(@([a-z0-9_]*))?\ ?(.*)$/sig;

const action = async (ctx, next) => {
    if (ctx._.type === 'callback_query') {
        const data = utilitas.parseJson(ctx._.message.data);
        const cb = ctx._.session?.callback?.filter?.(x => x.id === data?.callback)?.[0];
        if (cb?.text) {
            log(`Callback: ${cb.text}`); // Avoid ctx._.text interference:
            ctx.collect(cb.text, null, { refresh: true });
        } else {
            return await ctx.er(
                `Command is invalid or expired: ${ctx._.message.data}`
            );
        }
    }
    for (let e of ctx._.entities || []) {
        if (e.type !== hal.BOT_COMMAND) { continue; }
        if (!COMMAND_REGEXP.test(e.matched)) { continue; }
        const cmd = utilitas.trim(e.matched.replace(
            COMMAND_REGEXP, '$1'
        ), { case: 'LOW' });
        ctx._.cmd = { cmd, args: e.text.substring(e.offset + e.length + 1) };
        break;
    }
    for (let str of [ctx._.text || '', ctx._.message.caption || ''].map(utilitas.trim)) {
        if (!ctx._.cmd && COMMAND_REGEXP.test(str)) {
            ctx._.cmd = { // this will faild if command includes urls
                cmd: str.replace(COMMAND_REGEXP, '$1').toLowerCase(),
                args: str.replace(COMMAND_REGEXP, '$4'),
            };
            break;
        }
    }
    if (ctx._.cmd) {
        log(`Command: ${JSON.stringify(ctx._.cmd)}`);
        ctx._.session.cmds || (ctx._.session.cmds = {});
        ctx._.session.cmds[ctx._.cmd.cmd]
            = { args: ctx._.cmd.args, touchedAt: Date.now() };
    }
    await next();
};

export const { name, run, priority, func } = {
    name: 'Commands',
    run: true,
    priority: 20,
    func: action,
};
