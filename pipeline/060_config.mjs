import { bot, hal, utilitas } from '../index.mjs';

const sendConfig = async (ctx, obj, options) => await ctx.ok(
    utilitas.prettyJson(obj, { code: true, md: true }), options
);

const deleteSettings = async chatId => await hal._.storage.del(
    hal.assembleSettingsKey(chatId), { asPrefix: true }
);

const ctxExt = ctx => {
    ctx.sendConfig = async (obj, options) => await sendConfig(ctx, obj, options);
};

const action = async (ctx, next) => {
    ctxExt(ctx);
    let parsed = null;
    switch (ctx._.cmd.cmd) {
        case 'lang':
            if (!ctx._.cmd.args) {
                return await ctx.ok('Please specify a language.');
            }
            const _config = {
                ...ctx._.settings = {
                    ...ctx._.settings,
                    ...ctx._.settings_updated = {
                        lang: ctx._.cmd.args,
                        hello: `Please reply in ${ctx._.cmd.args}. Hello!`,
                    },
                }
            };
            Object.keys(ctx._.settings_updated).map(x => _config[x] += ` ${hal.CHECK}`);
            ctx.hello();
            break;
        case 'toggle':
            parsed = {};
            Object.keys(await hal.parseArgs(ctx._.cmd.args)).map(x =>
                parsed[x] = !ctx._.settings?.[x]);
        case 'set':
            try {
                const _config = {
                    ...ctx._.settings = {
                        ...ctx._.settings,
                        ...ctx._.settings_updated = parsed || await hal.parseArgs(ctx._.cmd.args, ctx),
                    }
                };
                assert(utilitas.countKeys(ctx._.settings_updated), 'No option matched.');
                Object.keys(ctx._.settings_updated).map(x => _config[x] += ` ${hal.CHECK}`);
                return await ctx.sendConfig(_config);
            } catch (err) {
                return await ctx.err(err.message || err);
            }
        case 'reset':
            await deleteSettings(ctx._.chatId);
            return await ctx.complete({ keyboards: ctx.getKeyboard() });
    }
    await next();
};

export const { name, priority, func, help, cmds, args } = {
    name: 'Config', priority: 60, func: action,
    help: bot.lines([
        '¶ Configure the bot by UNIX/Linux CLI style.',
        'Using [node:util.parseArgs](https://nodejs.org/api/util.html#utilparseargsconfig) to parse arguments.',
        '¶ Set your default language.',
        'Example: /lang Français',
        '¶ When enabled, the bot will speak out the answer if available.',
        'Example 1: /set --tts on',
        'Example 2: /set --tts off',
    ]),
    cmds: {
        lang: 'Set your default language: /lang `LANG`',
        toggle: 'Toggle configurations. Only works for boolean values.',
        set: 'Usage: /set --`OPTION` `VALUE` -`SHORT`',
        reset: 'Reset configurations.',
    },
    args: {
        chatty: {
            type: 'string', short: 'c', default: hal.ON,
            desc: `\`(${hal.BINARY_STRINGS.join(', ')})\` Enable/Disable chatty mode.`,
            validate: utilitas.humanReadableBoolean,
        },
        tts: {
            type: 'string', short: 't', default: hal.ON,
            desc: `\`(${hal.BINARY_STRINGS.join(', ')})\` Enable/Disable TTS. Default \`${hal.ON}\` except in groups.`,
            validate: utilitas.humanReadableBoolean,
        },
    },
};
