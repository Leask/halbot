import { bot, dbio, hal, utilitas } from '../index.mjs';

const compact = (str, op) => utilitas.ensureString(str, { ...op || {}, compact: true });
const compactLimit = (str, op) => compact(str, { ...op || {}, limit: 140 });
const SEARCH_LIMIT = 10;

const recall = async (ctx, keyword, offset = 0, limit = SEARCH_LIMIT) => {
    let result = [];
    switch (hal._?.database?.provider) {
        case dbio.MYSQL:
            result = await hal._?.database?.client?.query?.(
                'SELECT *, MATCH(`distilled`) '
                + 'AGAINST(? IN NATURAL LANGUAGE MODE) AS `relevance` '
                + 'FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? '
                + 'HAVING relevance > 0 '
                + 'ORDER BY `relevance` DESC '
                + `LIMIT ${limit} OFFSET ?`,
                [keyword, hal.table, ctx.botInfo.id, ctx._.chatId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            // globalThis.debug = 2;
            const vector = await dbio.encodeVector(await hal._.embedding(keyword));
            result = await hal._.database?.client?.query?.(
                `SELECT *, (1 - (distilled_vector <=> $1)) as relevance `
                + `FROM ${hal.table} WHERE bot_id = $2 AND chat_id = $3`
                + ` ORDER BY (distilled_vector <=> $1) ASC`
                + ` LIMIT ${limit} OFFSET $4`, [
                vector, ctx.botInfo.id, ctx._.chatId, offset
            ]);
            break;
        default:
            result = [];
    }
    return result;
};

const getContext = async (ctx, offset = 0, limit = SEARCH_LIMIT) => {
    let result = [];
    switch (hal._?.database?.provider) {
        case dbio.MYSQL:
            result = await hal._?.database?.client?.query?.(
                'SELECT * FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? '
                + `ORDER BY \`created_at\` DESC LIMIT ${limit} OFFSET ?`,
                [hal.table, ctx.botInfo.id, ctx._.chatId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            result = await hal._.database?.client?.query?.(
                `SELECT * FROM ${hal.table} WHERE bot_id = $1 AND chat_id = $2 `
                + `ORDER BY created_at DESC LIMIT ${limit} OFFSET $3`,
                [ctx.botInfo.id, ctx._.chatId, offset]
            );
            break;
        default:
            result = [];
    }
    return result;
};

const ctxExt = ctx => {
    ctx.recall = async (keyword, offset = 0, limit = SEARCH_LIMIT) =>
        await recall(ctx, keyword, offset, limit);
    ctx.getContext = async (offset = 0, limit = SEARCH_LIMIT) =>
        await getContext(ctx, offset, limit);
}

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
                    ...result[i].response_text ? [
                        `- ↩️ ${compactLimit(result[i].response_text)}`
                    ] : [],
                    `- ${utilitas.getTimeIcon(result[i].created_at)} `
                    + `${result[i].created_at.toLocaleString()}`,
                ]);
                await ctx.resp(content, true, {
                    reply_parameters: {
                        message_id: result[i].message_id,
                    }, disable_notification: ~~i > 0,
                });
                await ctx.timeout();
            }
            await ctx.resp('___', true, ctx.getExtra({
                buttons: [{
                    label: '🔍 More',
                    text: `/search@${ctx.botInfo.username} ${keywords} `
                        + `--skip=${offset + result.length}`,
                }]
            }));
            result.length || await ctx.er('No more records.');
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
