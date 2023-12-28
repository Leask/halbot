import { bot, utilitas } from 'utilitas';

const ACP = '[🧠 Awesome ChatGPT Prompts](https://github.com/f/awesome-chatgpt-prompts)';

const action = async (ctx, next) => {
    ctx.session.prompts || (ctx.session.prompts = {});
    const cmd = ctx.cmd?.cmd;
    switch (cmd) {
        case 'prompts':
            const prompts = bot.lines2(Object.keys(ctx.session.prompts || {}).map(
                x => bot.lines([`- /${x}`, ctx.session.prompts[x]])
            ));
            return await ctx.ok(prompts || 'No custom prompts.');
        case 'add':
            const arrText = (ctx.cmd.args || '').split('\n');
            const subArrText = arrText[0].split('>');
            const _cmd = utilitas.ensureString(
                subArrText[0], { case: 'SNAKE' }
            ).slice(0, bot.MAX_MENU_LENGTH);
            const _prompt = bot.lines([
                subArrText.slice(1).join(' '), ...arrText.slice(1)
            ]).trim();
            if (_cmd && _prompt) {
                ctx.session.prompts[_cmd] = _prompt;
                await ctx.ok(`Prompt added: /${_cmd}`);
            } else {
                await ctx.ok('Invalid command or prompt.');
            }
            return;
        case 'del':
            if (ctx.session.prompts[ctx.cmd.args]) {
                delete ctx.session.prompts[ctx.cmd.args];
                await ctx.complete();
            } else {
                await ctx.ok('Prompt not found.');
            }
            return;
        case 'acplist':
            const list = bot.uList(Object.keys(ctx._.prompts || {}).map(
                x => `/${ctx._.prompts[x].command}: ${ctx._.prompts[x].act}`
            ));
            return await ctx.ok(list || 'Data not found.');
        case 'acpdetail':
            const details = bot.lines2(Object.keys(ctx._.prompts || {}).map(
                x => bot.lines([
                    `- /${ctx._.prompts[x].command}: ${ctx._.prompts[x].act}`,
                    ctx._.prompts[x].prompt
                ])
            ));
            return await ctx.ok(details || 'Data not found.');
        default:
            const prompt = ctx.session.prompts?.[cmd] || ctx._.prompts?.[cmd]?.prompt;
            !ctx.context && prompt && (ctx.context = { cmd, prompt });
            ctx.context && await ctx.clear(ctx.context);
    }
    await next();
};

export const { name, run, priority, func, help, cmds, cmdx } = {
    name: 'Prompt',
    run: true,
    priority: 50,
    func: action,
    help: bot.lines([
        '¶ Maintain custom prompts.',
        'Example 1: /add `code` > `Code with me.`',
        'Example 2: /del `code`',
        `¶ Get interesting prompts from ${ACP}.`,
    ]),
    cmds: {
        prompts: 'List all custom prompts.',
        add: 'Add or edit a custom prompt: /add `COMMAND` > `PROMPT`.',
        del: 'Delete a custom prompt: /del `COMMAND`.',
        acplist: `List prompts from ${ACP}.`,
        acpdetail: `Show details of ${ACP}.`,
        clear: 'Clear current AI conversation session and start a new one.',
    },
    cmdx: {},
};
