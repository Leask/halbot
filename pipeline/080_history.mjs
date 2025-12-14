import { bot, hal, utilitas } from '../index.mjs';

const compact = (str, op) => utilitas.ensureString(str, { ...op || {}, compact: true });
const compactLimit = (str, op) => compact(str, { ...op || {}, limit: 140 });

const ctxExt = ctx => {
    ctx.recall = async (keyword, offset = 0, limit = hal.SEARCH_LIMIT, options = {}) =>
        await recall(ctx._.chatId, keyword, offset, limit, options);
    // ctx.getContext = async (offset = 0, limit = hal.SEARCH_LIMIT, options = {}) =>
    //     await getContext(ctx._.chatId, offset, limit, options);
};

const action = async (ctx, next) => {
    ctxExt(ctx);
    switch (ctx._.cmd?.cmd) {
        case 'search':
            (ctx._.type === 'callback_query')
                && await ctx.deleteMessage(ctx._.message.message_id);
            const regex = '[-—]+skip=[0-9]*';
            const keywords = ctx._.cmd.args.replace(new RegExp(regex, 'i'), '').trim();
            let catchArgs = ctx._.cmd.args.replace(new RegExp(`^.*(${regex}).*$`, 'i'), '$1');
            catchArgs === ctx._.cmd.args && (catchArgs = '');
            const offset = ~~catchArgs.replace(/^.*=([0-9]*).*$/i, '$1');
            if (!keywords) { return await ctx.er('Topic is required.'); }
            const result = await ctx.recall(keywords, offset);
            for (const i in result) {
                const content = bot.lines([
                    '```↩️', compactLimit(result[i].response_text), '```',
                    [`${utilitas.getTimeIcon(result[i].created_at)} ${result[i].created_at.toLocaleString()}`,
                    `🏆 ${(Math.round(result[i].score * 100) / 100).toFixed(2)}`].join('  '),
                ]);
                await ctx.resp(content, true, {
                    reply_parameters: {
                        message_id: result[i].message_id,
                    }, disable_notification: ~~i > 0,
                });
                await ctx.timeout();
            }
            // TODO: NEED MORE DEBUG
            result.length === hal.SEARCH_LIMIT && await ctx.resp(
                '___', true, ctx.getExtra({
                    buttons: [{
                        label: '🔍 More',
                        text: `/search@${ctx.botInfo.username} ${keywords} `
                            + `--skip=${offset + result.length}`,
                    }]
                }));
            result.length || await ctx.err('No more records.');
            break;
        default:
            await next();
            break;
    }
};

export const { name, run, priority, func, help, cmdx } = {
    name: 'History', run: true, priority: 80, func: action,
    help: bot.lines([
        '¶ Search history.',
        'Example 1: /search Answer to the Ultimate Question',
        'Example 2: /search Answer to the Ultimate Question --skip=10',
    ]), cmdx: {
        search: 'Usage: /search `ANYTHING` --skip=`OFFSET`',
    }
};
