{
    run: true, priority: -8840, name: 'configuration', func: async (ctx, next) => {
        let parsed = null;
        switch (ctx.cmd.cmd) {
            case 'toggle':
                parsed = {};
                Object.keys(await parseArgs(ctx.cmd.args)).map(x =>
                    parsed[x] = !ctx.session.config[x]);
            case 'set':
                try {
                    const _config = {
                        ...ctx.session.config = {
                            ...ctx.session.config, ...ctx.config = parsed
                            || await parseArgs(ctx.cmd.args, ctx),
                        }
                    };
                    assert(utilitas.countKeys(ctx.config), 'No option matched.');
                    Object.keys(ctx.config).map(x => _config[x] += ' 🖋');
                    await ctx.sendConfig(_config, null, ctx);
                } catch (err) {
                    await ctx.er(err.message || err);
                }
                break;
            case 'reset':
                ctx.session.config = ctx.config = {};
                await ctx.complete();
                break;
        }
    }, help: bot.lines([
        '¶ Configure the bot by UNIX/Linux CLI style.',
        'Using [node:util.parseArgs](https://nodejs.org/docs/latest-v25.x/api/util.html#utilparseargsconfig) to parse arguments.',
    ]), cmds: {
        toggle: 'Toggle configurations. Only works for boolean values.',
            set: 'Usage: /set --`OPTION` `VALUE` -`SHORT`',
                reset: 'Reset configurations.',
    }, args: {
        chatty: {
            type: 'string', short: 'c', default: ON,
                desc: `\`(${BINARY_STRINGS.join(', ')})\` Enable/Disable chatty mode.`,
                    validate: utilitas.humanReadableBoolean,
        },
    },
}
ctx.sendConfig = async (obj, options, _ctx) => await ctx.ok(
    utilitas.prettyJson(obj, { code: true, md: true }), options
);
