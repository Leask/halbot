{
    run: true, priority: -8830, name: 'history', func: async (ctx, next) => {
        if (ctx.type === 'callback_query') {
            await ctx.deleteMessage(ctx.m.message_id);
        }
        const regex = '[-—]+skip=[0-9]*';
        const keywords = ctx.cmd.args.replace(new RegExp(regex, 'i'), '').trim();
        let catchArgs = ctx.cmd.args.replace(new RegExp(`^.*(${regex}).*$`, 'i'), '$1');
        catchArgs === ctx.cmd.args && (catchArgs = '');
        const offset = ~~catchArgs.replace(/^.*=([0-9]*).*$/i, '$1');
        if (!keywords) { return await ctx.er('Topic is required.'); }
        const result = await ctx.recall(keywords, offset);
        for (const i in result) {
            const content = bot.lines([
                ...result[i].response_text ? [
                    `- ↩️ ${compactLimit(result[i].response_text)}`
                ] : [],
                `- ${utilitas.getTimeIcon(result[i].created_at)} `
                + `${result[i].created_at.toLocaleString()}`,
            ]);
            ctx.done.push(await reply(ctx, true, content, {
                reply_parameters: {
                    message_id: result[i].message_id,
                }, disable_notification: ~~i > 0,
            }));
            await ctx.timeout();
        }
        ctx.done.push(await reply(ctx, true, '___', getExtra(ctx, {
            buttons: [{
                label: '🔍 More',
                text: `/search@${ctx.botInfo.username} ${keywords} `
                    + `--skip=${offset + result.length}`,
            }]
        })));
        result.length || await ctx.er('No more records.');
    }, help: bot.lines([
        '¶ Search history.',
        'Example 1: /search Answer to the Ultimate Question',
        'Example 2: /search Answer to the Ultimate Question --skip=10',
    ]), cmds: {
        search: 'Usage: /search `ANYTHING` --skip=`OFFSET`',
    }
}
ctx.recall = async (keyword, offset = 0, limit = SEARCH_LIMIT) =>
    await recall(ctx, keyword, offset, limit);
ctx.getContext = async (offset = 0, limit = SEARCH_LIMIT) =>
    await getContext(ctx, offset, limit);
