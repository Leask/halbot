import { bot, dbio, hal, utilitas } from '../index.mjs';

const compact = (str, op) => utilitas.ensureString(str, { ...op || {}, compact: true });
const compactLimit = (str, op) => compact(str, { ...op || {}, limit: 140 });
const SUB_LIMIT = 200; // Google Rerank limit
const SEARCH_LIMIT = 10;
const RELEVANCE = 0.2;

const packMessage = (messages) => messages.map(x => ({
    message_id: x.message_id, score: x.score,
    request: x.received_text, response: x.response_text,
}));

const recall = async (ctx, keyword, offset = 0, limit = SEARCH_LIMIT, options = {}) => {
    let [result, _limit, exclude] = [
        [], hal._.rerank ? SUB_LIMIT : limit,
        (options?.exclude || []).map(x => `${~~x}`),
    ];
    switch (hal._?.database?.provider) {
        case dbio.MYSQL:
            result = await hal._?.database?.client?.query?.(
                'SELECT *, MATCH(`distilled`) '
                + 'AGAINST(? IN NATURAL LANGUAGE MODE) AS `relevance` '
                + "FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? "
                + "AND `received_text` != '' "
                + "AND `received_text` NOT LIKE '/%' "
                + "AND `response_text` != '' HAVING relevance > 0 "
                + (exclude.length ? `AND \`message_id\` NOT IN (${exclude.join(',')}) ` : '')
                + 'ORDER BY `relevance` DESC '
                + `LIMIT ${_limit} OFFSET ?`,
                [keyword, hal.table, ctx.botInfo.id, ctx._.chatId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            // globalThis.debug = 2;
            const vector = await dbio.encodeVector(await hal._.embed(keyword));
            result = await hal._.database?.client?.query?.(
                `SELECT *, (1 - (distilled_vector <=> $1)) as relevance `
                + `FROM ${hal.table} WHERE bot_id = $2 AND chat_id = $3 `
                + `AND received_text != '' `
                + `AND received_text NOT LIKE '/%' `
                + `AND received_text != '' `
                + (exclude.length ? `AND message_id NOT IN (${exclude.join(',')}) ` : '')
                + `ORDER BY (distilled_vector <=> $1) ASC `
                + `LIMIT ${_limit} OFFSET $4`,
                [vector, ctx.botInfo.id, ctx._.chatId, offset]
            );
            break;
        default:
            result = [];
    }
    return await rerank(keyword, result, offset, limit, options);
};

const getContext = async (ctx, offset = 0, limit = SEARCH_LIMIT, options = {}) => {
    let result = [];
    switch (hal._?.database?.provider) {
        case dbio.MYSQL:
            result = await hal._?.database?.client?.query?.(
                'SELECT * FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? '
                + "AND `received_text` != '' "
                + "AND `received_text` NOT LIKE '/%' "
                + "AND `response_text` != '' "
                + `ORDER BY \`created_at\` DESC LIMIT ${limit} OFFSET ?`,
                [hal.table, ctx.botInfo.id, ctx._.chatId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            result = await hal._.database?.client?.query?.(
                `SELECT * FROM ${hal.table} WHERE bot_id = $1 AND chat_id = $2 `
                + `AND received_text != '' `
                + `AND received_text NOT LIKE '/%' `
                + `AND received_text != '' `
                + `ORDER BY created_at DESC LIMIT ${limit} OFFSET $3`,
                [ctx.botInfo.id, ctx._.chatId, offset]
            );
            break;
        default:
            result = [];
    }
    return packMessage(result);
};

const rerank = async (keyword, result, offset = 0, limit = SEARCH_LIMIT, options = {}) => {
    if (result.length && hal._.rerank) {
        const keys = {};
        const _result = [];
        for (const x of result) {
            if (!keys[x.distilled]) {
                keys[x.distilled] = true;
                _result.push(x);
            }
        }
        const resp = await hal._.rerank(keyword, _result.map(x => x.distilled));
        resp.map(x => result[x.index].score = x.score);
        result.sort((a, b) => b.score - a.score);
        result = result.filter(
            x => x.score > RELEVANCE
        ).slice(offset, offset + limit);
    }
    return packMessage(result);
};

const ctxExt = ctx => {
    ctx.recall = async (keyword, offset = 0, limit = SEARCH_LIMIT, options = {}) =>
        await recall(ctx, keyword, offset, limit, options);
    ctx.getContext = async (offset = 0, limit = SEARCH_LIMIT, options = {}) =>
        await getContext(ctx, offset, limit, options);
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
            result.length === SEARCH_LIMIT && await ctx.resp(
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
