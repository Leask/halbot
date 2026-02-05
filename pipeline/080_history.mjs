import { bot, dbio, hal, utilitas } from '../index.mjs';

const [RELEVANCE, SEARCH_LIMIT, SUB_LIMIT] = [0.2, 10, 200]; // Google Rerank limit
const compact = (str, op) => utilitas.ensureString(str, { ...op || {}, compact: true });
const compactLimit = (str, op) => compact(str, { ...op || {}, limit: 140 });

const packMessage = (messages) => messages.map(x => ({
    message_id: x.message_id, score: x.score, created_at: x.created_at,
    request: x.received_text, response: x.response_text,
}));

const recall = async (sessionId, keyword, offset = 0, limit = SEARCH_LIMIT, options = {}) => {
    assert(sessionId, 'Session ID is required.');
    let [result, _limit, exclude] = [
        [], hal._.rerank ? SUB_LIMIT : limit,
        (options?.exclude || []).map(x => `${~~x}`),
    ];
    if (!keyword) { return result; }
    switch (hal._.storage?.provider) {
        case dbio.MYSQL:
            result = await hal._.storage?.client?.query?.(
                'SELECT *, MATCH(`distilled`) '
                + 'AGAINST(? IN NATURAL LANGUAGE MODE) AS `relevance` '
                + "FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? "
                + "AND `received_text` != '' "
                + "AND `received_text` NOT LIKE '/%' "
                + "AND `response_text` != '' HAVING relevance > 0 "
                + (exclude.length ? `AND \`message_id\` NOT IN (${exclude.join(',')}) ` : '')
                + 'ORDER BY `relevance` DESC '
                + `LIMIT ${_limit} OFFSET ?`,
                [keyword, hal.table, hal._.bot.botInfo.id, sessionId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            // globalThis.debug = 2;
            const vector = await dbio.encodeVector(await hal._.embed(keyword));
            result = await hal._.storage?.client?.query?.(
                `SELECT *, (1 - (distilled_vector <=> $1)) as relevance `
                + `FROM ${hal.table} WHERE bot_id = $2 AND chat_id = $3 `
                + `AND received_text != '' `
                + `AND received_text NOT LIKE '/%' `
                + `AND response_text != '' `
                + (exclude.length ? `AND message_id NOT IN (${exclude.join(',')}) ` : '')
                + `ORDER BY (distilled_vector <=> $1) ASC `
                + `LIMIT ${_limit} OFFSET $4`,
                [vector, hal._.bot.botInfo.id, sessionId, offset]
            );
            break;
    }
    return await rerank(keyword, result, offset, limit, options);
};

const getContext = async (sessionId, offset = 0, limit = SEARCH_LIMIT, options = {}) => {
    assert(sessionId, 'Session ID is required.');
    let result = [];
    switch (hal._.storage?.provider) {
        case dbio.MYSQL:
            result = await hal._.storage?.client?.query?.(
                'SELECT * FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? '
                + "AND `received_text` != '' "
                + "AND `received_text` NOT LIKE '/%' "
                + "AND `response_text` != '' "
                + `ORDER BY \`created_at\` DESC LIMIT ${limit} OFFSET ?`,
                [hal.table, hal._.bot.botInfo.id, sessionId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            result = await hal._.storage?.client?.query?.(
                `SELECT * FROM ${hal.table} WHERE bot_id = $1 AND chat_id = $2 `
                + `AND received_text != '' `
                + `AND received_text NOT LIKE '/%' `
                + `AND response_text != '' `
                + `ORDER BY created_at DESC LIMIT ${limit} OFFSET $3`,
                [hal._.bot.botInfo.id, sessionId, offset]
            );
            break;
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

const memorize = async (ctx) => {
    // https://limits.tginfo.me/en
    if (!ctx._.chatId || ctx._.cmd?.cmd) { return; }
    const received = ctx.update;
    const received_text = ctx._.request || ctx._.text || '';
    const id = received.update_id;
    let response = {};
    ctx._.done.map(m => response[m.message_id] = m);
    response = Object.values(response).sort((a, b) => a.message_id - b.message_id);
    const response_text = ctx?._?.response || response.map(x => x?.text || '').filter(Boolean).join('\n');
    const collected = ctx._.collected.filter(x => String.isString(x.content));
    const distilled = compact(bot.lines([
        received_text, response_text, ...collected.map(x => x.content)
    ]));
    if (!ctx._.messageId || !distilled) { return; }
    const event = {
        id, bot_id: ctx.botInfo.id, chat_id: ctx._.chatId,
        chat_type: ctx._.chatType, message_id: ctx._.messageId,
        received: JSON.stringify(received), received_text,
        response: JSON.stringify(response), response_text,
        collected: JSON.stringify(collected), distilled, token: ctx._.token,
    };
    await utilitas.ignoreErrFunc(async () => {
        event.distilled_vector = hal._.embed
            ? await hal._.embed(event.distilled) : [];
        switch (hal._.storage?.provider) {
            case dbio.MYSQL:
                event.distilled_vector = JSON.stringify(event.distilled_vector);
                break;
        }
        await hal._.storage?.client?.upsert?.(hal.table, event, { skipEcho: true });
    }, hal.logOptions);
};

const ctxExt = ctx => {
    ctx.memorize = async () => await memorize(ctx);
    ctx.recall = async (keyword, offset = 0, limit = SEARCH_LIMIT, options = {}) =>
        await recall(ctx._.chatId, keyword, offset, limit, options);
    ctx.getContext = async (offset = 0, limit = hal.SEARCH_LIMIT, options = {}) =>
        await getContext(ctx._.chatId, offset, limit, options);
};

const action = async (ctx, next) => {
    ctxExt(ctx);
    switch (ctx._.cmd?.cmd) {
        case 'search':
            // print(ctx.update.callback_query?.message);
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
                    '```↩️', compactLimit(result[i].response), '```',
                    [`${utilitas.getTimeIcon(result[i].created_at)} ${result[i].created_at.toLocaleString()}`,
                    `🏆 ${(Math.round(result[i].score * 100) / 100).toFixed(2)}`].join('  '),
                ]);
                await ctx.resp(content, {
                    reply_parameters: {
                        message_id: result[i].message_id,
                    }, disable_notification: ~~i > 0,
                });
                await ctx.timeout();
            }
            const options = {
                reply_parameters: {
                    message_id: ctx.update.callback_query?.message?.reply_to_message?.message_id
                        || ctx._.message.message_id,
                }
            };
            result.length === hal.SEARCH_LIMIT ? await ctx.resp('---', {
                buttons: [{
                    label: '🔍 More',
                    text: `/search@${ctx.botInfo.username} ${keywords} `
                        + `--skip=${offset + result.length}`,
                }], ...options,
            }) : await ctx.err('No more records.', options);
            break;
        default:
            await next();
            break;
    }
};

export const { name, run, priority, func, help, cmds } = {
    name: 'History', run: true, priority: 80, func: action,
    help: bot.lines([
        '¶ Search history.',
        'Example 1: /search Answer to the Ultimate Question',
        'Example 2: /search Answer to the Ultimate Question --skip=10',
    ]),
    cmds: {
        search: 'Usage: /search `ANYTHING` --skip=`OFFSET`',
    },
};
