import { hal, utilitas } from '../index.mjs';

const _name = 'CMD';
const COMMAND_REGEXP = /^\/([a-z0-9_]+)(@([a-z0-9_]*))?\ ?(.*)$/sig;
const log = (c, o) => utilitas.log(c, _name, { time: 1, ...o || {} });

// https://stackoverflow.com/questions/69924954/an-error-is-issued-when-opening-the-telebot-keyboard
const keyboards = [[
    { text: `/ai ${hal.EMOJI_BOT}` },
    { text: '/help 🛟' },
], [
    { text: '/set --tts=🔊' },
    { text: '/set --tts=🔇' },
], [
    { text: '/set --chatty=🐵' },
    { text: '/set --chatty=🙊' },
]];

const action = async (ctx, next) => {
    // reload functions
    const _ok = ctx.ok;
    ctx.ok = async (message, options) => await _ok(message, {
        ...options || {},
        ...options?.buttons ? {} : (options?.keyboards || { keyboards }),
    });
    // handle callback query
    if (ctx._.type === 'callback_query') {
        const data = utilitas.parseJson(ctx.update.callback_query.data);
        const cb = ctx._.session?.callback?.filter?.(x => x.id === data?.callback)?.[0];
        if (cb?.text) {
            log(`Callback: ${cb.text}`); // Avoid ctx._.text interference:
            ctx.collect(cb.text, null, { refresh: true });
        } else {
            return await ctx.err(
                `Command is invalid or expired: ${ctx._.message.data}`
            );
        }
    }
    // handle text command
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
    // update last touched command
    if (ctx._.cmd) {
        log(`Command: ${JSON.stringify(ctx._.cmd)}`);
        ctx._.session.cmds || (ctx._.session.cmds = {});
        ctx._.session.cmds[ctx._.cmd.cmd]
            = { args: ctx._.cmd.args, touchedAt: Date.now() };
    }
    // handle commands
    switch (ctx.cmd?.cmd) {
        case 'clearkb':
            return await ctx.complete({ keyboards: [] });
    }
    // next middleware
    await next();
};

export const { name, run, priority, func, cmdx } = {
    name: _name, run: true, priority: 20, func: action, cmdx: {}
};
