{
    run: true, priority: -8850, name: 'help', func: async (ctx, next) => {
        const help = ctx._.info ? [ctx._.info] : [];
        for (let i in ctx._.skills) {
            if (ctx._.skills[i].hidden) { continue; }
            const _help = [];
            if (ctx._.skills[i].help) {
                _help.push(ctx._.skills[i].help);
            }
            const cmdsx = {
                ...ctx._.skills[i].cmds || {},
                ...ctx._.skills[i].cmdx || {},
            };
            if (utilitas.countKeys(cmdsx)) {
                _help.push(bot.lines([
                    '_🪄 Commands:_',
                    ...Object.keys(cmdsx).map(x => `- /${x}: ${cmdsx[x]}`),
                ]));
            }
            if (utilitas.countKeys(ctx._.skills[i].args)) {
                _help.push(bot.lines([
                    '_⚙️ Options:_',
                    ...Object.keys(ctx._.skills[i].args).map(x => {
                        const _arg = ctx._.skills[i].args[x];
                        return `- \`${x}\`` + (_arg.short ? `(${_arg.short})` : '')
                            + `, ${_arg.type}(${_arg.default ?? 'N/A'})`
                            + (_arg.desc ? `: ${_arg.desc}` : '');
                    })
                ]));
            }
            _help.length && help.push(bot.lines([`*${i.toUpperCase()}*`, ..._help]));
        }
        await ctx.ok(lines2(help), { md: true });
    }, help: bot.lines([
        '¶ Basic syntax of this document:',
        'Scheme for commands: /`COMMAND`: `DESCRIPTION`',
        'Scheme for options: `OPTION`(`SHORT`), `TYPE`(`DEFAULT`): `DESCRIPTION`',
    ]), cmds: {
        help: 'Show help message.',
    },
}
