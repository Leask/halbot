import { bot, dbio, hal, utilitas } from '../index.mjs';

const compact = (str, op) => utilitas.ensureString(str, { ...op || {}, compact: true });
const compactLimit = (str, op) => compact(str, { ...op || {}, limit: 140 });

const memorize = async (ctx) => {
    // https://limits.tginfo.me/en
    if (!ctx._.chatId || ctx._.cmd?.cmd) { return; }
    const received = ctx.update;
    const received_text = ctx._.request || ctx._.text || '';
    const id = received.update_id;
    let response = {};
    ctx._.done.map(m => m?.text && (response[m.message_id] = m));
    response = Object.values(response).sort((a, b) => a.message_id - b.message_id);
    const response_text = ctx?._.response || response.map(x => x.text).join('\n');
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
        collected: JSON.stringify(collected), distilled,
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
