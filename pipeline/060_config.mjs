import { bot, hal, utilitas } from '../index.mjs';

const sendConfig = async (ctx, obj, options) => await ctx.ok(
    utilitas.prettyJson(obj, { code: true, md: true }), options
);

const ctxExt = ctx => {
    ctx.sendConfig = async (obj, options) => await sendConfig(ctx, obj, options);
};

const action = async (ctx, next) => {
    ctxExt(ctx);
    let parsed = null;
    switch (ctx._.cmd?.cmd) {
        case 'toggle':
            parsed = {};
            Object.keys(await hal.parseArgs(ctx._.cmd.args)).map(x =>
                parsed[x] = !ctx._.session?.config?.[x]);
        case 'set':
            try {
                const _config = {
                    ...ctx._.session.config = {
                        ...ctx._.session?.config || {},
                        ...ctx._.config = parsed || await hal.parseArgs(ctx._.cmd.args, ctx),
                    }
                };
                assert(utilitas.countKeys(ctx._.config), 'No option matched.');
                Object.keys(ctx._.config).map(x => _config[x] += ` ${hal.CHECK}`);
                await ctx.sendConfig(_config);
            } catch (err) {
                await ctx.err(err.message || err);
            }
            break;
        case 'reset':
            ctx._.session.config = ctx._.config = {};
            await ctx.complete();
            break;
        default:
            await next();
            break;
    }
};

export const { name, run, priority, func, help, cmdx, args } = {
    name: 'Config', run: true, priority: 60, func: action,
    help: bot.lines([
        '¶ Configure the bot by UNIX/Linux CLI style.',
        'Using [node:util.parseArgs](https://nodejs.org/api/util.html#utilparseargsconfig) to parse arguments.',
    ]), cmdx: {
        toggle: 'Toggle configurations. Only works for boolean values.',
        set: 'Usage: /set --`OPTION` `VALUE` -`SHORT`',
        reset: 'Reset configurations.',
    }, args: {
        chatty: {
            type: 'string', short: 'c', default: hal.ON,
            desc: `\`(${hal.BINARY_STRINGS.join(', ')})\` Enable/Disable chatty mode.`,
            validate: utilitas.humanReadableBoolean,
        },
    },
};
