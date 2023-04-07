import { bot, utilitas } from 'utilitas';

const ACP = '[🧠 Awesome ChatGPT Prompts](https://github.com/f/awesome-chatgpt-prompts)';

const action = async (ctx, next) => {
    ctx.session.prompts || (ctx.session.prompts = {});
    switch (ctx.cmd.cmd) {
        case 'prompts':
            const prompts = bot.lines2(Object.keys(ctx.session.prompts || {}).map(
                x => bot.lines([`- /${x}`, ctx.session.prompts[x]])
            ));
            await ctx.paging(prompts || 'No custom prompts.');
            break;
        case 'add':
            const arrText = (ctx.cmd.args || '').split('\n');
            const subArrText = arrText[0].split('>');
            const cmd = utilitas.ensureString(
                subArrText[0], { case: 'SNAKE' }
            ).slice(0, bot.MAX_MENU_LENGTH);
            const prompt = bot.lines([subArrText.slice(1).join(' '), ...arrText.slice(1)]).trim();
            if (cmd && prompt) {
                ctx.session.prompts[cmd] = prompt;
                await ctx.ok(`Prompt added: /${cmd}`);
            } else {
                await ctx.ok('Invalid command or prompt.');
            }
            break;
        case 'del':
            if (ctx.session.prompts[ctx.cmd.args]) {
                delete ctx.session.prompts[ctx.cmd.args];
                await ctx.complete();
            } else {
                await ctx.ok('Prompt not found.');
            }
            break;
        case 'acplist':
            const list = bot.uList(Object.keys(ctx._.prompts || {}).map(
                x => `/${ctx._.prompts[x].command}: ${ctx._.prompts[x].act}`
            ));
            await ctx.paging(list || 'Data not found.');
            break;
        case 'acpdetail':
            const details = bot.lines2(Object.keys(ctx._.prompts || {}).map(
                x => bot.lines([
                    `- /${ctx._.prompts[x].command}: ${ctx._.prompts[x].act}`,
                    ctx._.prompts[x].prompt
                ])
            ));
            await ctx.paging(details || 'Data not found.');
            break;
        case 'clear':
            ctx.clear();
            await next();
            break;
    }
};

export const { run, priority, func, help, cmds } = {
    run: true,
    priority: 30,
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
};
