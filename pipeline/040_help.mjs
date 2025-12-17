import { bot, hal, utilitas } from '../index.mjs';

const lines2 = arr => bot.lines(arr, '\n\n');

const action = async (ctx, next) => {
    const help = hal._.info ? [hal._.info] : [];
    for (let i in hal._.pipeline) {
        if (hal._.pipeline[i].hidden) { continue; }
        const _help = [];
        if (hal._.pipeline[i].help) {
            _help.push(hal._.pipeline[i].help);
        }
        const cmds = hal._.pipeline[i].cmds || {};
        if (utilitas.countKeys(cmds)) {
            _help.push(bot.lines([
                '_🪄 Commands:_',
                ...Object.keys(cmds).map(x => `- /${x}: ${cmds[x]}`),
            ]));
        }
        if (utilitas.countKeys(hal._.pipeline[i].args)) {
            _help.push(bot.lines([
                '_⚙️ Options:_',
                ...Object.keys(hal._.pipeline[i].args).map(x => {
                    const _arg = hal._.pipeline[i].args[x];
                    return `- \`${x}\`` + (_arg.short ? `(${_arg.short})` : '')
                        + `, ${_arg.type}(${_arg.default ?? 'N/A'})`
                        + (_arg.desc ? `: ${_arg.desc}` : '');
                })
            ]));
        }
        _help.length && help.push(bot.lines([`*${i.toUpperCase()}*`, ..._help]));
    }
    await ctx.ok(lines2(help), { md: true });
};

export const { name, priority, func, help, cmds } = {
    name: 'Help', priority: 40, func: action,
    help: bot.lines([
        '¶ Basic syntax of this document:',
        'Scheme for commands: /`COMMAND`: `DESCRIPTION`',
        'Scheme for options: `OPTION`(`SHORT`), `TYPE`(`DEFAULT`): `DESCRIPTION`',
    ]),
    cmds: {
        help: 'Show help message.',
    },
};
