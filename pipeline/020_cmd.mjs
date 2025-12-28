import { bot, hal, utilitas } from '../index.mjs';

const _name = 'CMD';
const COMMAND_REGEXP = /^\/([a-z0-9_]+)(@([a-z0-9_]*))?\ ?(.*)$/sig;
const log = (c, o) => utilitas.log(c, _name, { time: 1, ...o || {} });

// https://stackoverflow.com/questions/69924954/an-error-is-issued-when-opening-the-telebot-keyboard
const keyboards = [[
    { text: `/ai ${bot.BOT}` }, { text: '/help 🛟' },
], [
    { text: '/set --tts=🔊' }, { text: '/set --tts=🔇' },
]];

const getKeyboard = ctx => ctx.update?.message?.chat?.type === hal.GROUP ? [
    ...keyboards, [{ text: '/set --chatty=🐵' }, { text: '/set --chatty=🙊' }]
] : keyboards;

const ctxExt = ctx => {
    ctx.getKeyboard = () => getKeyboard(ctx);
};

const loadCommands = async chatId => await hal._.storage.get(
    hal.assembleCommandsKey(chatId), {
    asPrefix: true, sort: [{ 'updatedAt': '-' }], limit: hal.COMMAND_LIMIT
}) || {};

const saveCommands = async (chatId, commands = {}) => await Promise.all(
    Object.entries(commands).map(([key, value]) =>
        hal._.storage.set(hal.assembleCommandsKey(chatId, key), value)
    )
);

const queryCallback = async (chatId, id) => await hal._.storage.get(
    hal.assembleCallbacksKey(chatId, id)
);

const action = async (ctx, next) => {
    // extend ctx
    ctxExt(ctx);
    // handle callback query
    if (ctx._.type === 'callback_query') {
        const data = utilitas.parseJson(ctx.update.callback_query.data);
        const cb = await queryCallback(ctx._.chatId, data?.callback);
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
        await saveCommands(ctx._.chatId, { [ctx._.cmd.cmd]: ctx._.cmd.args });
    }
    // handle commands
    switch (ctx._.cmd?.cmd) {
        case 'clearkb':
            return await ctx.complete({ keyboards: [] });
    }
    // update commands
    // @todo: NEED more debug
    await utilitas.ignoreErrFunc(async () => {
        const cmds = await loadCommands(ctx._.chatId);
        await hal._.bot.telegram.setMyCommands(hal._.cmds.sort((x, y) =>
            (cmds?.[y.command.toUpperCase()]?.updatedAt || 0)
            - (cmds?.[x.command.toUpperCase()]?.updatedAt || 0)
        ).slice(0, hal.COMMAND_LIMIT), {
            scope: { type: 'chat', chat_id: ctx._.chatId },
        }), hal.logOptions
    });
    // next middleware
    await next();
};

export const { name, run, hidden, priority, func, help, cmds } = {
    name: _name, run: true, hidden: true, priority: 20, func: action,
    help: bot.lines([
        '¶ Commands handler.',
    ]),
    cmds: {
        clearkb: 'Clear keyboard: /clearkb',
    },
};
