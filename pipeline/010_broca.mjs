import { alan, bot, hal, storage, utilitas } from '../index.mjs';

const _name = 'Broca';
const [PRIVATE_LIMIT, GROUP_LIMIT] = [60 / 60, 60 / 20].map(x => x * 1000);
const log = (c, o) => utilitas.log(c, _name, { time: 1, ...o || {} });
const getKey = s => s?.toLowerCase?.()?.startsWith?.('http') ? 'url' : 'source';
const isMarkdownError = e => e?.description?.includes?.("can't parse entities");
const normalizeKey = chatId => `${hal.HALBOT}_SESSION_${chatId}`;
const compact = (str, op) => utilitas.ensureString(str, { ...op || {}, compact: true });

const [CALLBACK_LIMIT, parse_mode] = [30, bot.parse_mode];

const KNOWN_UPDATE_TYPES = [
    'callback_query', 'channel_post', 'edited_message', 'message',
    'my_chat_member', // 'inline_query',
];

const memorize = async (ctx) => {
    // https://limits.tginfo.me/en
    if (!ctx._.chatId || ctx.cmd?.cmd || ctx._.skipMemorize) { return; }
    const received = ctx.update;
    const received_text = ctx._.text || '';
    const id = received.update_id;
    let response = {};
    ctx._.done.map(m => m?.text && (response[m.message_id] = m));
    response = Object.values(response).sort((a, b) => a.message_id - b.message_id);
    const response_text = ctx?.generated || response.map(x => x.text).join('\n');
    const collected = ctx._.collected.filter(x => String.isString(x.content));
    const distilled = compact(bot.lines([
        received_text, response_text, ...collected.map(x => x.content)
    ]));
    if (!ctx.messageId || !distilled) { return; }
    const event = {
        id, bot_id: ctx.botInfo.id, chat_id: ctx._.chatId,
        chat_type: ctx._.chatType, message_id: ctx._.messageId,
        received: JSON.stringify(received), received_text,
        response: JSON.stringify(response), response_text,
        collected: JSON.stringify(collected), distilled,
    };
    await utilitas.ignoreErrFunc(async () => {
        event.distilled_vector = hal._.embedding
            ? await hal._.embedding(event.distilled) : [];
        switch (hal._.database?.provider) {
            case dbio.MYSQL:
                event.distilled_vector = JSON.stringify(event.distilled_vector);
                break;
        }
        await hal._.database?.client?.upsert?.(table, event, { skipEcho: true });
    }, hal.logOptions);
    // TODO: 調整，如果命令執行過，應該更新菜單 ！？
    await utilitas.ignoreErrFunc(async () => await hal.telegram.setMyCommands([
        ...hal._.cmds, ...Object.keys(ctx._.message.prompts || {}).map(
            command => hal.newCommand(command, ctx._.message.prompts[command])
        )
    ].sort((x, y) =>
        (ctx._.message?.cmds?.[y.command.toLowerCase()]?.touchedAt || 0)
        - (ctx._.message?.cmds?.[x.command.toLowerCase()]?.touchedAt || 0)
    ).slice(0, hal.COMMAND_LIMIT), {
        scope: { type: 'chat', chat_id: ctx._.chatId },
    }), hal.logOptions);
};

const getExtra = (ctx, options) => {
    const resp = {
        reply_parameters: {
            message_id: ctx.chatType === hal.PRIVATE ? undefined : ctx.messageId,
        }, disable_notification: !!ctx._.done.length, ...options || {},
    };
    resp.reply_markup || (resp.reply_markup = {});
    if (options?.buttons?.length) {
        resp.reply_markup.inline_keyboard = options?.buttons.map(row =>
            utilitas.ensureArray(row).map(button => {
                if (button.url) {
                    return { text: button.label, url: button.url };
                } else if (button.text) {
                    const id = uoid.fakeUuid(button.text);
                    ctx._.message.callback.push({ id, ...button });
                    return {
                        text: button.label,
                        callback_data: JSON.stringify({ callback: id }),
                    };
                } else {
                    utilitas.throwError('Invalid button markup.');
                }
            })
        );
    } else if (options?.keyboards) {
        if (options.keyboards.length) {
            resp.reply_markup.keyboard = options?.keyboards.map(utilitas.ensureArray);
        } else { resp.reply_markup.remove_keyboard = true; }
    }
    return resp;
};

const reply = async (ctx, md, text, extra) => {
    // if (ctx._.type === 'inline_query') {
    //     return await ctx.answerInlineQuery([{}, {}]);
    // }
    if (md) {
        try {
            return await (extra?.reply_parameters?.message_id
                ? ctx.replyWithMarkdown(text, { parse_mode, ...extra })
                : ctx.sendMessage(text, { parse_mode, ...extra }));
        } catch (err) { // utilitas.throwError('Error sending message.');
            isMarkdownError(err) || log(err);
            await ctx.timeout();
        }
    }
    return await utilitas.ignoreErrFunc(
        async () => await (extra?.reply_parameters?.message_id
            ? ctx.reply(text, extra) : ctx.sendMessage(text, extra)
        ), hal.logOptions
    );
};

const replyWith = async (ctx, func, src, options) => ctx._.done.push(
    await ctx[func](Array.isArray(src) ? src.map(x => ({
        type: x.type || 'photo', media: { [getKey(x.src)]: x.src },
    })) : { [getKey(src)]: src }, getExtra(ctx, options))
);

const editMessageText = async (ctx, md, lastMsgId, text, extra) => {
    if (md) {
        try {
            return await ctx.telegram.editMessageText(
                ctx._.chatId, lastMsgId, '', text, { parse_mode, ...extra }
            );
        } catch (err) { // utilitas.throwError('Error editing message.');
            isMarkdownError(err) || log(err);
            await ctx.timeout();
        }
    }
    return await utilitas.ignoreErrFunc(async (
    ) => await ctx.telegram.editMessageText(
        ctx._.chatId, lastMsgId, '', text, extra
    ), hal.logOptions);
};

const sessionGet = async chatId => {
    const key = normalizeKey(chatId);
    const session = await alan.getSession(key) || {};
    session.callback || (session.callback = []);
    session.config || (session.config = {});
    return session;
};

const sessionSet = async (chatId, session) => {
    const key = normalizeKey(chatId);
    while (session?.callback?.length > CALLBACK_LIMIT) {
        session.callback.shift();
    }
    const toSet = {};
    Object.keys(session).filter(x => /^[^_]+$/g.test(x)).map(
        x => toSet[x] = session[x]
    );
    return await alan.setSession(key, toSet);
};

const ctxExt = ctx => {
    ctx.timeout = async () => await utilitas.timeout(ctx._.limit);
    ctx.collect = (content, type, options) => type ? ctx._.collected.push(
        { type, content }
    ) : (ctx._.text = [
        (options?.refresh ? '' : ctx._.text) || '', content || ''
    ].filter(x => x.length).join('\n\n'));
    ctx.hello = str => {
        str = str || ctx._.message?.config?.hello || hal._.hello;
        ctx.collect(str, null, { refresh: true });
        return str;
    };
    ctx.ok = async (message, options) => {
        let pages = bot.paging(message, options);
        const extra = getExtra(ctx, options);
        const [pageIds, pageMap] = [[], {}];
        options?.pageBreak || ctx._.done.map(x => {
            pageMap[x?.message_id] || (pageIds.push(x?.message_id));
            pageMap[x?.message_id] = x;
        });
        for (let i in pages) {
            const lastPage = ~~i === pages.length - 1;
            const shouldExtra = options?.lastMessageId || lastPage;
            if (options?.onProgress && !options?.lastMessageId
                && pageMap[pageIds[~~i]]?.text === pages[i]) { continue; }
            if (options?.onProgress && !pageIds[~~i]) {                     // progress: new page, reply text
                ctx._.done.push(await reply(
                    ctx, false, pages[i], extra
                ));
            } else if (options?.onProgress) {                               // progress: ongoing, edit text
                ctx._.done.push(await editMessageText(
                    ctx, false, pageIds[~~i],
                    pages[i], shouldExtra ? extra : {}
                ));
            } else if (options?.lastMessageId || pageIds[~~i]) {            // progress: final, edit markdown
                ctx._.done.push(await editMessageText(
                    ctx, true, options?.lastMessageId || pageIds[~~i],
                    pages[i], shouldExtra ? extra : {}
                ));
            } else {                                                        // never progress, reply markdown
                ctx._.done.push(await reply(ctx, true, pages[i], extra));
            }
            await ctx.timeout();
        }
        return ctx._.done;
    };
    ctx.err = async (m, opts) => {
        log(m);
        return await ctx.ok(`⚠️ ${m?.message || m} `, opts);
    };
    ctx.shouldReply = async text => {
        const should = utilitas.insensitiveHas(hal._?.chatType, ctx._.chatType)
            || ctx._.message?.config?.chatty;
        text = utilitas.isSet(text, true) ? (text || '') : '';
        if (!should || !text) { return should; }
        return await ctx.ok(text);
    };
    ctx.shouldSpeech = async text => {
        const should = hal._?.tts && (ctx._.chatType === PRIVATE
            ? ctx._.message.config?.tts !== false
            : ctx._.message.config?.tts === true);
        text = utilitas.isSet(text, true) ? (text || '') : ctx._.tts;
        if (!should || !text) { return should; }
        return await ctx.speech(text);
    };
    ctx.skipMemorize = () => ctx._.skipMemorize = true;
    ctx.end = () => { ctx._.done.push(null); ctx.skipMemorize() };
    ctx.complete = async (options) => await ctx.ok(hal.CHECK, options);
    ctx.json = async (obj, options) => await ctx.ok(hal.json(obj), options);
    ctx.list = async (list, options) => await ctx.ok(uList(list), options);
    ctx.audio = async (s, o) => await replyWith(ctx, 'replyWithAudio', s, o);
    ctx.image = async (s, o) => await replyWith(ctx, 'replyWithPhoto', s, o);
    ctx.video = async (s, o) => await replyWith(ctx, 'replyWithVideo', s, o);
    ctx.media = async (s, o) => await replyWith(ctx, 'replyWithMediaGroup', s, o);
    ctx.speech = async (cnt, options) => {
        let file = await (Buffer.isBuffer(cnt) ? storage.convert(cnt, {
            input: storage.BUFFER, expected: storage.FILE,
        }) : utilitas.ignoreErrFunc(async () => await hal._?.tts?.(
            cnt, { expected: storage.FILE }
        ), { log: true }));
        if (!file) { return; }
        const resp = await ctx.audio(file, options);
        await storage.tryRm(file);
        return resp;
    };
};

const action = async (ctx, next) => {
    // log event
    const e = `Event: ${ctx.update.update_id} => ${JSON.stringify(ctx.update)} `;
    process.stdout.write(`[${_name.toUpperCase()} ${new Date().toISOString()}] ${e} \n`);
    log(e);
    // init ctx methods
    ctxExt(ctx);
    // init ctx storage
    ctx._ = {
        chatId: 0, collected: [], done: [], tts: '', text: '',
        skipMemorize: false, generated: '',
    };
    // get message body
    for (let t of KNOWN_UPDATE_TYPES) {
        if (ctx.update[t]) {
            ctx._.message = ctx.update[ctx._.type = t];
            break;
        }
    }
    if (ctx._.type === 'callback_query') { ctx._.message = ctx._.message.message; }
    // else if (ctx._.type === 'inline_query') { ctx._.message.chat = { id: ctx._.message.from.id, type: PRIVATE }; }
    else if (ctx._.type === 'my_chat_member') {
        log(
            'Group member status changed: '
            + ctx._.message.new_chat_member.user.id + ' => '
            + ctx._.message.new_chat_member.status
        );
        if (ctx._.message.new_chat_member.user.id !== ctx.botInfo.id
            || ctx._.message.new_chat_member.status === 'left') {
            return ctx.end();
        } else { ctx.hello(); }
    } else if (!ctx._.type) { return log(`Unsupported message type.`); }
    // get chat metadata
    ctx._.chatId = ctx._.message.chat.id;
    ctx._.chatType = ctx._.message.chat.type;
    ctx._.messageId = ctx._.message.message_id;
    ctx._.message.text && ctx.collect(ctx._.message.text);
    ctx._.message.caption && ctx.collect(ctx._.message.caption);
    // get session
    ctx._.session = await sessionGet(ctx.chatId);
    ctx._.limit = ctx.chatType === hal.PRIVATE ? PRIVATE_LIMIT : GROUP_LIMIT;
    ctx._.entities = [
        ...(ctx._.message.entities || []).map(e => ({ ...e, text: ctx._.message.text })),
        ...(ctx._.message.caption_entities || []).map(e => ({ ...e, text: ctx._.message.caption })),
        ...(ctx._.message.reply_to_message?.entities || []).filter(
            x => x?.type !== hal.BOT_COMMAND
        ).map(e => ({ ...e, text: ctx._.message.reply_to_message.text })),
    ].map(e => ({
        ...e, matched: e.text.substring(e.offset, e.offset + e.length),
        ...e.type === 'text_link' ? { type: 'url', matched: e.url } : {},
    }));
    // should process
    ctx._.chatType !== hal.PRIVATE && (ctx._.entities.some(e => {
        let target;
        switch (e.type) {
            case hal.MENTION: target = e.matched.substring(1, e.length); break;
            case hal.BOT_COMMAND: target = e.matched.split('@')[1]; break;
        }
        return target === ctx.botInfo.username;
    }) || ctx._.message.reply_to_message?.from?.username === ctx.botInfo.username
        || ctx._.type === 'callback_query')
        && (ctx._.chatType = hal.MENTION);
    (((ctx._.text || ctx._.message.voice || ctx._.message.poll
        || ctx._.message.data || ctx._.message.document || ctx._.message.photo
        || ctx._.message.sticker || ctx._.message.video_note
        || ctx._.message.video || ctx._.message.audio || ctx._.message.location
        || ctx._.message.venue || ctx._.message.contact
        || ctx._.message.checklist) && ctx._.messageId)
        || (ctx._.message.new_chat_member || ctx._.message.left_chat_member))
        && await next();
    // persistence
    await sessionSet(ctx.chatId, ctx._.session);
    await memorize(ctx);
    // fallback response and log
    if (ctx._.done.length) { return; }
    const errStr = ctx.cmd ? `Command not found: /${ctx.cmd.cmd}`
        : '⚠️ No suitable response.';
    log(`INFO: ${errStr}`);
    await ctx.shouldReply(errStr);
};

export const { name, run, priority, func } = {
    name: _name, run: true, priority: 10, func: action,
};
