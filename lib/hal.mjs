import {
    alan, bot, callosum, dbio, storage, uoid, utilitas, web,
} from 'utilitas';

import { basename, join } from 'path';
import { parseArgs as _parseArgs } from 'node:util';
import { readdirSync } from 'fs';

const _NEED = ['lorem-ipsum', 'mime'];
// 👇 https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
const table = 'utilitashal_events';
const [PRIVATE_LIMIT, GROUP_LIMIT] = [60 / 60, 60 / 20].map(x => x * 1000);
const log = (c, o) => utilitas.log(c, import.meta.url, { time: 1, ...o || {} });
const [end, parse_mode] = [bot.end, bot.parse_mode];
const normalizeKey = chatId => `${HALBOT}_SESSION_${chatId}`;
const lines2 = arr => bot.lines(arr, '\n\n');
const uList = arr => bot.lines(arr.map(x => `- ${x}`));
const oList = arr => bot.lines(arr.map((v, k) => `${k + 1}. ${v}`));
const isMarkdownError = e => e?.description?.includes?.("can't parse entities");
const getFile = async (id, op) => (await web.get(await getFileUrl(id), op)).content;
const compact = (str, op) => utilitas.ensureString(str, { ...op || {}, compact: true });
const compactLimit = (str, op) => compact(str, { ...op || {}, limit: 140 });
const SEARCH_LIMIT = 10;

const [ // https://limits.tginfo.me/en
    HELLO, GROUP, PRIVATE, CHANNEL, MENTION, CALLBACK_LIMIT, API_ROOT,
    jsonOptions, sessions, HALBOT, COMMAND_REGEXP, COMMAND_LENGTH,
    COMMAND_LIMIT, COMMAND_DESCRIPTION_LENGTH, bot_command, EMOJI_SPEECH,
    EMOJI_LOOK, EMOJI_BOT, logOptions, ON, OFF,
] = [
        'Hello!', 'group', 'private', 'channel', 'mention', 30,
        'https://api.telegram.org/', { code: true, extraCodeBlock: 1 }, {},
        'HALBOT', /^\/([a-z0-9_]+)(@([a-z0-9_]*))?\ ?(.*)$/sig, 32, 100, 256,
        'bot_command', '👂', '👀', '🤖', { log: true }, 'on', 'off',
    ];

const [BUFFER_ENCODE, BINARY_STRINGS] = [{ encode: storage.BUFFER }, [OFF, ON]];

const KNOWN_UPDATE_TYPES = [
    'callback_query', 'channel_post', 'edited_message', 'message',
    'my_chat_member', // 'inline_query',
];

const initSql = {
    [dbio.MYSQL]: [[
        dbio.cleanSql(`CREATE TABLE IF NOT EXISTS ?? (
            \`id\`               BIGINT          AUTO_INCREMENT,
            \`bot_id\`           BIGINT          NOT NULL,
            \`chat_id\`          BIGINT          NOT NULL,
            \`chat_type\`        VARCHAR(255)    NOT NULL,
            \`message_id\`       BIGINT UNSIGNED NOT NULL,
            \`received\`         TEXT            NOT NULL,
            \`received_text\`    TEXT            NOT NULL,
            \`response\`         TEXT            NOT NULL,
            \`response_text\`    TEXT            NOT NULL,
            \`collected\`        TEXT            NOT NULL,
            \`distilled\`        TEXT            NOT NULL,
            \`distilled_vector\` TEXT            NOT NULL,
            \`created_at\`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY  KEY                 (\`id\`),
            INDEX          bot_id        (\`bot_id\`),
            INDEX          chat_id       (\`chat_id\`),
            INDEX          chat_type     (\`chat_type\`),
            INDEX          message_id    (\`message_id\`),
            INDEX          received      (\`received\`(768)),
            INDEX          received_text (\`received_text\`(768)),
            INDEX          response      (\`response\`(768)),
            INDEX          response_text (\`response_text\`(768)),
            INDEX          collected     (\`collected\`(768)),
            FULLTEXT INDEX distilled     (\`distilled\`),
            INDEX          created_at    (\`created_at\`),
            INDEX          updated_at    (\`updated_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`), [table],
    ]],
    [dbio.POSTGRESQL]: [[
        dbio.cleanSql(`CREATE TABLE IF NOT EXISTS ${table} (
            id               SERIAL       PRIMARY KEY,
            bot_id           BIGINT       NOT NULL,
            chat_id          BIGINT       NOT NULL,
            chat_type        VARCHAR(255) NOT NULL,
            message_id       BIGINT       NOT NULL,
            received         TEXT         NOT NULL,
            received_text    TEXT         NOT NULL,
            response         TEXT         NOT NULL,
            response_text    TEXT         NOT NULL,
            collected        TEXT         NOT NULL,
            distilled        TEXT         NOT NULL,
            distilled_vector VECTOR(1536) NOT NULL,
            created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`)
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}hal_id_index ON ${table} (bot_id)`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_chat_id_index ON ${table} (chat_id)`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_chat_type_index ON ${table} (chat_type)`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_message_id_index ON ${table} (message_id)`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_received_index ON ${table} USING GIN(to_tsvector('english', received))`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_received_text_index ON ${table} USING GIN(to_tsvector('english', received_text))`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_response_index ON ${table} USING GIN(to_tsvector('english', response))`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_response_text_index ON ${table} USING GIN(to_tsvector('english', response_text))`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_collected_index ON ${table} USING GIN(to_tsvector('english', collected))`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_distilled_index ON ${table} USING GIN(to_tsvector('english', distilled))`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_distilled_vector_index ON ${table} USING hnsw(distilled_vector vector_cosine_ops)`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_created_at_index ON ${table} (created_at)`,
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_updated_at_index ON ${table} (updated_at)`,
    ]],
};

let hal, mime, lorem;

const getExtra = (ctx, options) => {
    const resp = {
        reply_parameters: {
            message_id: ctx.chatType === PRIVATE ? undefined : ctx.messageId,
        }, disable_notification: !!ctx.done.length, ...options || {},
    };
    resp.reply_markup || (resp.reply_markup = {});
    if (options?.buttons?.length) {
        resp.reply_markup.inline_keyboard = options?.buttons.map(row =>
            utilitas.ensureArray(row).map(button => {
                if (button.url) {
                    return { text: button.label, url: button.url };
                } else if (button.text) {
                    const id = uoid.fakeUuid(button.text);
                    ctx.session.callback.push({ id, ...button });
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

const getFileUrl = async (file_id) => {
    assert(file_id, 'File ID is required.', 400);
    const file = await (await init()).telegram.getFile(file_id);
    assert(file.file_path, 'Error getting file info.', 500);
    return `${API_ROOT}file/bot${hal.token}/${file.file_path}`;
};

const officeParser = async file => await utilitas.ignoreErrFunc(
    async () => await vision.parseOfficeFile(file, { input: storage.BUFFER }), { log: true }
);

const json = obj => bot.lines([
    '```json', utilitas.prettyJson(obj, jsonOptions).replaceAll('```', ''), '```'
]);

const sessionGet = async chatId => {
    const key = normalizeKey(chatId);
    sessions[chatId] || (sessions[chatId] = (
        hal._.session.get && await hal._.session.get(key) || {}
    ));
    sessions[chatId].callback || (sessions[chatId].callback = []);
    sessions[chatId].config || (sessions[chatId].config = {});
    return sessions[chatId];
};

const sessionSet = async chatId => {
    const key = normalizeKey(chatId);
    while (sessions[chatId]?.callback?.length > CALLBACK_LIMIT) {
        sessions[chatId].callback.shift();
    }
    const toSet = {};
    Object.keys(sessions[chatId]).filter(x => /^[^_]+$/g.test(x)).map(
        x => toSet[x] = sessions[chatId][x]
    );
    return hal._.session.set && await hal._.session.set(key, toSet);
};

const newCommand = (command, description) => ({
    command: utilitas.ensureString(command, { case: 'SNAKE' }).slice(0, COMMAND_LENGTH),
    description: utilitas.trim(description).slice(0, COMMAND_DESCRIPTION_LENGTH),
});

const uptime = () => {
    let resp = `${utilitas.getTimeIcon(new Date())} ${new Date().toTimeString(
    ).split(' ')[0].split(':').slice(0, 2).join(':')} up`;
    let seconds = process.uptime();
    const ss = Object.keys(sessions);
    const days = Math.floor(seconds / (3600 * 24));
    seconds -= days * 3600 * 24;
    let hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    hours = hours.toString().padStart(2, '0');
    let minutes = Math.floor(seconds / 60);
    minutes = minutes.toString().padStart(2, '0');
    seconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    days > 0 && (resp += ` ${days} day${days > 1 ? 's' : ''},`);
    return `${resp} ${hours}:${minutes}:${seconds}, `
        + `${ss.length} session${ss.length > 1 ? 's' : ''}`;
};

const reply = async (ctx, md, text, extra) => {
    // if (ctx.type === 'inline_query') {
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
        ), logOptions
    );
};

const editMessageText = async (ctx, md, lastMsgId, text, extra) => {
    if (md) {
        try {
            return await ctx.telegram.editMessageText(
                ctx.chatId, lastMsgId, '', text, { parse_mode, ...extra }
            );
        } catch (err) { // utilitas.throwError('Error editing message.');
            isMarkdownError(err) || log(err);
            await ctx.timeout();
        }
    }
    return await utilitas.ignoreErrFunc(async () => await ctx.telegram.editMessageText(
        ctx.chatId, lastMsgId, '', text, extra
    ), logOptions);
};

const memorize = async (ctx) => {
    if (ctx._skipMemorize) { return; }
    const received = ctx.update;
    const received_text = ctx.txt || ''; // ATTACHMENTS
    const id = received.update_id;
    const response = utilitas.lastItem(ctx.done.filter(x => x.text)) || {};
    const response_text = response?.text || '';
    const collected = ctx.collected.filter(x => String.isString(x.content));
    const distilled = compact(bot.lines([
        received_text, response_text, ...collected.map(x => x.content)
    ]));
    if (!ctx.messageId || !distilled) { return; }
    const event = {
        id, bot_id: ctx.botInfo.id, chat_id: ctx.chatId,
        chat_type: ctx.chatType, message_id: ctx.messageId,
        received: JSON.stringify(received), received_text,
        response: JSON.stringify(response), response_text,
        collected: JSON.stringify(collected), distilled,
    };
    return await utilitas.ignoreErrFunc(async () => {
        event.distilled_vector = hal._.embedding
            ? await hal._.embedding(event.distilled) : [];
        switch (hal._.database.provider) {
            case dbio.MYSQL:
                event.distilled_vector = JSON.stringify(event.distilled_vector);
                break;
        }
        await hal._.database?.client?.upsert?.(table, event, { skipEcho: true });
        return hal._.memorize && await hal._.memorize(event);
    }, logOptions);
};

// https://stackoverflow.com/questions/50204633/allow-bot-to-access-telegram-group-messages
const subconscious = [{
    run: true, priority: -8960, name: 'broca', func: async (ctx, next) => {
        const e = `Event: ${ctx.update.update_id} => ${JSON.stringify(ctx.update)}`;
        process.stdout.write(`[BOT] ${e}\n`);
        log(e);
        ctx.done = [];
        ctx.collected = [];
        ctx.timeout = async () => await utilitas.timeout(ctx.limit);
        ctx.hello = str => {
            str = str || ctx.session?.config?.hello || hal._.hello;
            ctx.collect(str, null, { refresh: true });
            return str;
        };
        ctx.shouldReply = async text => {
            const should = utilitas.insensitiveHas(ctx._?.chatType, ctx.chatType)
                || ctx.session?.config?.chatty;
            should && text && await ctx.ok(text);
            return should;
        };
        ctx.checkSpeech = () => ctx.chatType === PRIVATE
            ? ctx.session.config?.tts !== false
            : ctx.session.config?.tts === true;
        ctx.shouldSpeech = async text => {
            text = utilitas.isSet(text, true) ? (text || '') : ctx.tts;
            const should = ctx._.speech?.tts && ctx.checkSpeech();
            should && text && await ctx.speech(text);
            return should;
        };
        ctx.collect = (content, type, options) => type ? ctx.collected.push(
            { type, content }
        ) : (ctx.txt = [
            (options?.refresh ? '' : ctx.txt) || '', content || ''
        ].filter(x => x.length).join('\n\n'));
        ctx.skipMemorize = () => ctx._skipMemorize = true;
        ctx.end = () => {
            ctx.done.push(null);
            ctx.skipMemorize();
        };
        ctx.ok = async (message, options) => {
            let pages = bot.paging(message, options);
            const extra = getExtra(ctx, options);
            const [pageIds, pageMap] = [[], {}];
            options?.pageBreak || ctx.done.map(x => {
                pageMap[x?.message_id] || (pageIds.push(x?.message_id));
                pageMap[x?.message_id] = x;
            });
            for (let i in pages) {
                const lastPage = ~~i === pages.length - 1;
                const shouldExtra = options?.lastMessageId || lastPage;
                if (options?.onProgress && !options?.lastMessageId
                    && pageMap[pageIds[~~i]]?.text === pages[i]) { continue; }
                if (options?.onProgress && !pageIds[~~i]) {                     // progress: new page, reply text
                    ctx.done.push(await reply(
                        ctx, false, pages[i], extra
                    ));
                } else if (options?.onProgress) {                               // progress: ongoing, edit text
                    ctx.done.push(await editMessageText(
                        ctx, false, pageIds[~~i],
                        pages[i], shouldExtra ? extra : {}
                    ));
                } else if (options?.lastMessageId || pageIds[~~i]) {            // progress: final, edit markdown
                    ctx.done.push(await editMessageText(
                        ctx, true, options?.lastMessageId || pageIds[~~i],
                        pages[i], shouldExtra ? extra : {}
                    ));
                } else {                                                        // never progress, reply markdown
                    ctx.done.push(await reply(ctx, true, pages[i], extra));
                }
                await ctx.timeout();
            }
            return ctx.done;
        };
        ctx.er = async (m, opts) => {
            log(m);
            return await ctx.ok(`⚠️ ${m?.message || m}`, opts);
        };
        ctx.complete = async (options) => await ctx.ok('☑️', options);
        ctx.json = async (obj, options) => await ctx.ok(json(obj), options);
        ctx.list = async (list, options) => await ctx.ok(uList(list), options);
        ctx.media = async (fnc, src, options) => ctx.done.push(await ctx[fnc]({
            [src?.toLowerCase?.()?.startsWith?.('http') ? 'url' : 'source']: src
        }, getExtra(ctx, options)));
        ctx.audio = async (sr, op) => await ctx.media('replyWithAudio', sr, op);
        ctx.image = async (sr, op) => await ctx.media('replyWithPhoto', sr, op);
        ctx.sendConfig = async (obj, options, _ctx) => await ctx.ok(utilitas.prettyJson(
            obj, { code: true, md: true }
        ), options);
        ctx.speech = async (cnt, options) => {
            let file;
            if (Buffer.isBuffer(cnt)) {
                file = await storage.convert(cnt, { input: storage.BUFFER, expected: storage.FILE });
            } else if (cnt.length <= speech.OPENAI_TTS_MAX_LENGTH) {
                file = await utilitas.ignoreErrFunc(async () => await ctx._.speech.tts(
                    cnt, { expected: 'file' }
                ), logOptions);
            }
            if (!file) { return; }
            const resp = await ctx.audio(file, options);
            await storage.tryRm(file);
            return resp;
        };
        await next();
        // https://limits.tginfo.me/en
        if (ctx.chatId) {
            await memorize(ctx);
            ctx._skipMemorize || await utilitas.ignoreErrFunc(async (
            ) => await hal.telegram.setMyCommands([
                ...ctx._.cmds, ...Object.keys(ctx.session.prompts || {}).map(
                    command => newCommand(command, ctx.session.prompts[command])
                )
            ].sort((x, y) =>
                (ctx.session?.cmds?.[y.command.toLowerCase()]?.touchedAt || 0)
                - (ctx.session?.cmds?.[x.command.toLowerCase()]?.touchedAt || 0)
            ).slice(0, COMMAND_LIMIT), {
                scope: { type: 'chat', chat_id: ctx.chatId },
            }), logOptions);
        }
        if (ctx.done.length) { return; }
        const errStr = ctx.cmd ? `Command not found: /${ctx.cmd.cmd}`
            : 'No suitable response.';
        log(`INFO: ${errStr}`);
        await ctx.shouldReply(errStr);
    },
}, {
    run: true, priority: -8950, name: 'subconscious', func: async (ctx, next) => {
        for (let t of KNOWN_UPDATE_TYPES) {
            if (ctx.update[t]) {
                ctx.m = ctx.update[ctx.type = t];
                break;
            }
        }
        if (ctx.type === 'callback_query') { ctx.m = ctx.m.message; }
        // else if (ctx.type === 'inline_query') { ctx.m.chat = { id: ctx.m.from.id, type: PRIVATE }; }
        else if (ctx.type === 'my_chat_member') {
            log(
                'Group member status changed: '
                + ctx.m.new_chat_member.user.id + ' => '
                + ctx.m.new_chat_member.status
            );
            if (ctx.m.new_chat_member.user.id !== ctx.botInfo.id
                || ctx.m.new_chat_member.status === 'left') {
                return ctx.end();
            } else { ctx.hello(); }
        } else if (!ctx.type) { return log(`Unsupported update type.`); }
        ctx._ = hal._;
        ctx.chatId = ctx.m.chat.id;
        ctx.chatType = ctx.m.chat.type;
        ctx.messageId = ctx.m.message_id;
        ctx.m.text && ctx.collect(ctx.m.text);
        ctx.session = await sessionGet(ctx.chatId);
        ctx.limit = ctx.chatType === PRIVATE ? PRIVATE_LIMIT : GROUP_LIMIT;
        ctx.entities = [
            ...(ctx.m.entities || []).map(e => ({ ...e, text: ctx.m.text })),
            ...(ctx.m.caption_entities || []).map(e => ({ ...e, text: ctx.m.caption })),
            ...(ctx.m.reply_to_message?.entities || []).map(e => ({ ...e, text: ctx.m.reply_to_message.text })),
        ].map(e => ({
            ...e, matched: e.text.substring(e.offset, e.offset + e.length),
            ...e.type === 'text_link' ? { type: 'url', matched: e.url } : {},
        }));
        ctx.chatType !== PRIVATE && (ctx.entities.some(e => {
            let target;
            switch (e.type) {
                case MENTION: target = e.matched.substring(1, e.length); break;
                case bot_command: target = e.matched.split('@')[1]; break;
            }
            return target === ctx.botInfo.username;
        }) || ctx.m.reply_to_message?.from?.username === ctx.botInfo.username)
            && (ctx.chatType = MENTION);
        (((ctx.txt || ctx.m.voice || ctx.m.poll || ctx.m.data || ctx.m.document
            || ctx.m.photo || ctx.m.sticker || ctx.m.video_note || ctx.m.video
            || ctx.m.audio || ctx.m.location || ctx.m.venue || ctx.m.contact
        ) && ctx.messageId)
            || (ctx.m.new_chat_member || ctx.m.left_chat_member))
            && await next();
        await sessionSet(ctx.chatId);
    },
}, {
    run: true, priority: -8945, name: 'callback', func: async (ctx, next) => {
        if (ctx.type === 'callback_query') {
            const data = utilitas.parseJson(ctx.update[ctx.type].data);
            const cb = ctx.session.callback.filter(x => x.id === data?.callback)[0];
            if (cb?.text) {
                log(`Callback: ${cb.text}`); // Avoid ctx.text interference:
                ctx.collect(cb.text, null, { refresh: true });
            } else {
                return await ctx.er(
                    `Command is invalid or expired: ${ctx.m.data}`
                );
            }
        }
        await next();
    },
}, {
    run: true, priority: -8940, name: 'commands', func: async (ctx, next) => {
        for (let e of ctx?.entities || []) {
            if (e.type !== bot_command) { continue; }
            if (!COMMAND_REGEXP.test(e.matched)) { continue; }
            const cmd = utilitas.trim(e.matched.replace(
                COMMAND_REGEXP, '$1'
            ), { case: 'LOW' });
            ctx.cmd = { cmd, args: e.text.substring(e.offset + e.length + 1) };
            break;
        }
        for (let str of [ctx.txt || '', ctx.m.caption || ''].map(utilitas.trim)) {
            if (!ctx.cmd && COMMAND_REGEXP.test(str)) {
                ctx.cmd = { // this will faild if command includes urls
                    cmd: str.replace(COMMAND_REGEXP, '$1').toLowerCase(),
                    args: str.replace(COMMAND_REGEXP, '$4'),
                };
                break;
            }
        }
        if (ctx.cmd) {
            log(`Command: ${JSON.stringify(ctx.cmd)}`);
            ctx.session.cmds || (ctx.session.cmds = {});
            ctx.session.cmds[ctx.cmd.cmd]
                = { args: ctx.cmd.args, touchedAt: Date.now() };
        }
        await next();
    },
}, {
    run: true, priority: -8930, name: 'echo', hidden: true, func: async (ctx, next) => {
        let resp, md = false;
        switch (ctx.cmd.cmd) {
            case 'echo':
                resp = json({ update: ctx.update, session: ctx.session });
                break;
            case 'uptime':
                resp = uptime();
                break;
            case 'thethreelaws':
                resp = bot.lines([
                    `Isaac Asimov's [Three Laws of Robotics](https://en.wikipedia.org/wiki/Three_Laws_of_Robotics):`,
                    oList([
                        'A robot may not injure a human being or, through inaction, allow a human being to come to harm.',
                        'A robot must obey the orders given it by human beings except where such orders would conflict with the First Law.',
                        'A robot must protect its own existence as long as such protection does not conflict with the First or Second Laws.',
                    ])
                ]);
                md = true;
                break;
            case 'ultimateanswer':
                resp = '[The Answer to the Ultimate Question of Life, The Universe, and Everything is `42`](https://en.wikipedia.org/wiki/Phrases_from_The_Hitchhiker%27s_Guide_to_the_Galaxy).';
                md = true;
                break;
            case 'lorem':
                const ipsum = () => text += `\n\n${lorem.generateParagraphs(1)}`;
                const [demoTitle, demoUrl] = [
                    'Lorem ipsum', 'https://en.wikipedia.org/wiki/Lorem_ipsum',
                ];
                let [text, extra] = [`[${demoTitle}](${demoUrl})`, {
                    buttons: [{ label: demoTitle, url: demoUrl }]
                }];
                await ctx.ok(bot.EMOJI_THINKING);
                for (let i = 0; i < 2; i++) {
                    await ctx.timeout();
                    await ctx.ok(ipsum(), { ...extra, onProgress: true });
                }
                await ctx.timeout();
                await ctx.ok(ipsum(), { ...extra, md: true });
                // testing incomplete markdown reply {
                // await ctx.ok('_8964', { md: true });
                // }
                // test pagebreak {
                // await ctx.timeout();
                // await ctx.ok(ipsum(), { md: true, pageBreak: true });
                // }
                return;
        }
        await ctx.ok(resp, { md });
    }, help: bot.lines([
        'Basic behaviors for debug only.',
    ]), cmds: {
        thethreelaws: `Isaac Asimov's [Three Laws of Robotics](https://en.wikipedia.org/wiki/Three_Laws_of_Robotics)`,
        ultimateanswer: '[The Answer to the Ultimate Question of Life, The Universe, and Everything](https://bit.ly/43wDhR3).',
        echo: 'Show debug message.',
        uptime: 'Show uptime of this bot.',
        lorem: '[Lorem ipsum](https://en.wikipedia.org/wiki/Lorem_ipsum)',
    },
}, {
    run: true, priority: -8920, name: 'authenticate', func: async (ctx, next) => {
        if (!await ctx.shouldReply()) { return; }                               // if chatType is not in whitelist, exit.
        if (!ctx._.private) { return await next(); }                            // if not private, go next.
        if (ctx._.magicWord && utilitas.insensitiveHas(ctx._.magicWord, ctx.txt)) {      // auth by magicWord
            ctx._.private.add(String(ctx.chatId));
            await ctx.ok('😸 You are now allowed to talk to me.');
            ctx.hello();
            return await next();
        }
        if (utilitas.insensitiveHas(ctx._.private, ctx.chatId)                           // auth by chatId
            || (ctx?.from && utilitas.insensitiveHas(ctx._.private, ctx.from.id))) {     // auth by userId
            return await next();
        }
        if (ctx.chatType !== PRIVATE && (                                       // 1 of the group admins is in whitelist
            await ctx.telegram.getChatAdministrators(ctx.chatId)
        ).map(x => x.user.id).some(a => utilitas.insensitiveHas(ctx._.private, a))) {
            return await next();
        }
        if (ctx._.homeGroup && utilitas.insensitiveHas([                                 // auth by homeGroup
            'creator', 'administrator', 'member' // 'left'
        ], (await utilitas.ignoreErrFunc(async () => await ctx.telegram.getChatMember(
            ctx._.homeGroup, ctx.from.id
        )))?.status)) { return await next(); }
        if (ctx._.auth && await ctx._.auth(ctx)) { return await next(); }       // auth by custom function
        await ctx.ok('😿 Sorry, I am not allowed to talk to strangers.');
    },
}, {
    run: true, priority: -8910, name: 'speech-to-text', func: async (ctx, next) => {
        const audio = ctx.m.voice || ctx.m.audio;
        if (ctx._.speech?.stt && audio) {
            await ctx.ok(EMOJI_SPEECH);
            try {
                const url = await getFileUrl(audio.file_id);
                let file = await getFile(audio.file_id, BUFFER_ENCODE);
                const analyze = async () => {
                    const resp = await utilitas.ignoreErrFunc(async () => {
                        [
                            alan.mp3, alan.mpega, alan.mp4, alan.mpeg, alan.mpga, alan.m4a, alan.wav, alan.webm, alan.ogg
                        ].includes(audio.mime_type) || (
                                file = await media.convertAudioTo16kNanoPcmWave(
                                    file, { input: storage.BUFFER, expected: storage.BUFFER }
                                )
                            );
                        return await ctx._.speech?.stt(file);
                    }, logOptions) || ' ';
                    log(`STT: '${resp}'`);
                    ctx.collect(resp);
                };
                if (hal._.supportedMimeTypes.has(alan.wav)) {
                    ctx.collect({
                        mime_type: alan.wav, url, analyze,
                        data: await media.convertAudioTo16kNanoPcmWave(file, {
                            input: storage.BUFFER, expected: storage.BASE64,
                        }),
                    }, 'PROMPT');
                } else { await analyze(); }
            } catch (err) { return await ctx.er(err); }
        }
        await next();
    },
}, {
    run: true, priority: -8900, name: 'location', func: async (ctx, next) => {
        (ctx.m.location || ctx.m.venue) && ctx.collect(bot.lines([
            ...ctx.m.location && !ctx.m.venue ? ['Location:', uList([
                `latitude: ${ctx.m.location.latitude}`,
                `longitude: ${ctx.m.location.longitude}`,
            ])] : [],
            ...ctx.m.venue ? ['Venue:', uList([
                `title: ${ctx.m.venue.title}`,
                `address: ${ctx.m.venue.address}`,
                `latitude: ${ctx.m.venue.location.latitude}`,
                `longitude: ${ctx.m.venue.location.longitude}`,
                `foursquare_id: ${ctx.m.venue.foursquare_id}`,
                `foursquare_type: ${ctx.m.venue.foursquare_type}`,
            ])] : []
        ]));
        await next();
    },
}, {
    run: true, priority: -8895, name: 'contact', func: async (ctx, next) => {
        ctx.m.contact && ctx.collect(bot.lines(['Contact:', uList([
            `first_name: ${ctx.m.contact.first_name}`,
            `last_name: ${ctx.m.contact.last_name}`,
            `phone_number: ${ctx.m.contact.phone_number}`,
            `user_id: ${ctx.m.contact.user_id}`,
            `vcard: ${ctx.m.contact.vcard}`,
        ])]));
        await next();
    },
}, {
    run: true, priority: -8893, name: 'chat_member', func: async (ctx, next) => {
        const member = ctx.m.new_chat_member || ctx.m.left_chat_member;
        if (member) {
            if (member?.id === ctx.botInfo.id) { return ctx.end(); }
            ctx.collect(bot.lines([
                `Say ${ctx.m.new_chat_member ? 'hello' : 'goodbye'} to:`,
                uList([
                    // `id: ${member.id}`,
                    // `ishal: ${member.ishal}`,
                    // `is_premium: ${member.is_premium}`,
                    `first_name: ${member.first_name}`,
                    `last_name: ${member.last_name}`,
                    `username: ${member.username}`,
                    `language_code: ${member.language_code || ''}`,
                ])
            ]));
        }
        await next();
    },
}, {
    run: true, priority: -8890, name: 'poll', func: async (ctx, next) => {
        ctx.m.poll && ctx.collect(bot.lines([
            'Question:', ctx.m.poll.question, '',
            'Options:', oList(ctx.m.poll.options.map(x => x.text)),
        ]));
        await next();
    },
}, {
    run: true, priority: -8880, name: 'contaxt', func: async (ctx, next) => {
        ctx.m.reply_to_message?.text && ctx.collect(
            ctx.m.reply_to_message.text, 'CONTAXT'
        );
        await next();
    },
}, {
    run: true, priority: -8860, name: 'vision', func: async (ctx, next) => {
        ctx.collect(ctx.m?.caption || '');
        const files = [];
        for (const m of [
            ctx.m, ...ctx.m.reply_to_message ? [ctx.m.reply_to_message] : []
        ]) {
            if (m.document) {
                let file = {
                    asPrompt: hal._.supportedMimeTypes.has(m.document.mime_type),
                    file_name: m.document.file_name, fileId: m.document.file_id,
                    mime_type: m.document.mime_type, type: storage.FILE,
                    ocrFunc: async f => (await storage.isTextFile(f)) && f.toString(),
                };
                if ('application/pdf' === m.document?.mime_type) {
                    file = { ...file, ocrFunc: ctx._.vision?.read, type: 'DOCUMENT' };
                } else if (/^image\/.*$/ig.test(m.document?.mime_type)) {
                    file = { ...file, ocrFunc: ctx._.vision?.see, type: 'IMAGE' };
                } else if (/^.*\.(docx|xlsx|pptx)$/.test(m.document?.file_name)) {
                    file = { ...file, ocrFunc: officeParser, type: 'DOCUMENT' };
                }
                files.push(file);
            }
            if (m.sticker) {
                const s = m.sticker;
                const url = await getFileUrl(s.file_id);
                const file_name = basename(url);
                const mime_type = mime.getType(file_name) || 'image';
                files.push({
                    asPrompt: hal._.supportedMimeTypes.has(mime_type), file_name,
                    fileId: s.file_id, mime_type, type: 'PHOTO',
                    ocrFunc: ctx._.vision?.see,
                });
            }
            if (m.photo?.[m.photo?.length - 1]) {
                const p = m.photo[m.photo.length - 1];
                files.push({
                    asPrompt: hal._.supportedMimeTypes.has(alan.jpeg),
                    file_name: `${p.file_id}.jpg`, fileId: p.file_id,
                    mime_type: alan.jpeg, type: 'PHOTO', ocrFunc: ctx._.vision?.see,
                });
            }
            if (m.video_note) {
                const vn = m.video_note;
                const url = await getFileUrl(vn.file_id);
                const file_name = basename(url);
                const mime_type = mime.getType(file_name) || 'video';
                files.push({
                    asPrompt: hal._.supportedMimeTypes.has(mime_type), file_name,
                    fileId: vn.file_id, mime_type, type: 'VIDEO',
                });
            }
            if (m.video) {
                const v = m.video;
                const url = await getFileUrl(v.file_id);
                const file_name = basename(url);
                files.push({
                    asPrompt: hal._.supportedMimeTypes.has(v.mime_type), file_name,
                    fileId: v.file_id, mime_type: v.mime_type, type: 'VIDEO',
                });
            }
        }
        if (files.length) {
            await ctx.ok(EMOJI_LOOK);
            for (const f of files) {
                if (!f.asPrompt && !f.ocrFunc) { continue; }
                try {
                    const url = await getFileUrl(f.fileId);
                    const file = (await web.get(url, BUFFER_ENCODE)).content;
                    const analyze = async () => {
                        const content = utilitas.trim(utilitas.ensureArray(
                            await utilitas.ignoreErrFunc(async () => await f.ocrFunc(
                                file, BUFFER_ENCODE
                            ), logOptions)
                        ).filter(x => x).join('\n'));
                        content && ctx.collect(bot.lines([
                            '---', `file_name: ${f.file_name}`,
                            `mime_type: ${f.mime_type}`, `type: ${f.type}`,
                            '---',
                            content
                        ]), 'VISION');
                    };
                    if (f.asPrompt) {
                        ctx.collect({
                            mime_type: f.mime_type, url, analyze,
                            data: utilitas.base64Encode(file, true),
                        }, 'PROMPT');
                    } else if (f.ocrFunc) { await analyze(); }
                } catch (err) { return await ctx.er(err); }
            }
        }
        await next();
    },
}, {
    run: true, priority: -8850, name: 'help', func: async (ctx, next) => {
        const help = ctx._.info ? [ctx._.info] : [];
        for (let i in ctx._.skills) {
            if (ctx._.skills[i].hidden) { continue; }
            const _help = [];
            if (ctx._.skills[i].help) {
                _help.push(ctx._.skills[i].help);
            }
            const cmdsx = {
                ...ctx._.skills[i].cmds || {},
                ...ctx._.skills[i].cmdx || {},
            };
            if (utilitas.countKeys(cmdsx)) {
                _help.push(bot.lines([
                    '_🪄 Commands:_',
                    ...Object.keys(cmdsx).map(x => `- /${x}: ${cmdsx[x]}`),
                ]));
            }
            if (utilitas.countKeys(ctx._.skills[i].args)) {
                _help.push(bot.lines([
                    '_⚙️ Options:_',
                    ...Object.keys(ctx._.skills[i].args).map(x => {
                        const _arg = ctx._.skills[i].args[x];
                        return `- \`${x}\`` + (_arg.short ? `(${_arg.short})` : '')
                            + `, ${_arg.type}(${_arg.default ?? 'N/A'})`
                            + (_arg.desc ? `: ${_arg.desc}` : '');
                    })
                ]));
            }
            _help.length && help.push(bot.lines([`*${i.toUpperCase()}*`, ..._help]));
        }
        await ctx.ok(lines2(help), { md: true });
    }, help: bot.lines([
        'Basic syntax of this document:',
        'Scheme for commands: /`COMMAND`: `DESCRIPTION`',
        'Scheme for options: `OPTION`(`SHORT`), `TYPE`(`DEFAULT`): `DESCRIPTION`',
    ]), cmds: {
        help: 'Show help message.',
    },
}, {
    run: true, priority: -8840, name: 'configuration', func: async (ctx, next) => {
        let parsed = null;
        switch (ctx.cmd.cmd) {
            case 'toggle':
                parsed = {};
                Object.keys(await parseArgs(ctx.cmd.args)).map(x =>
                    parsed[x] = !ctx.session.config[x]);
            case 'set':
                try {
                    const _config = {
                        ...ctx.session.config = {
                            ...ctx.session.config, ...ctx.config = parsed
                            || await parseArgs(ctx.cmd.args, ctx),
                        }
                    };
                    assert(utilitas.countKeys(ctx.config), 'No option matched.');
                    Object.keys(ctx.config).map(x => _config[x] += ' 🖋');
                    await ctx.sendConfig(_config, null, ctx);
                } catch (err) {
                    await ctx.er(err.message || err);
                }
                break;
            case 'reset':
                ctx.session.config = ctx.config = {};
                await ctx.complete();
                break;
            case 'factory':
                sessions[ctx.chatId] = {}; // ctx.session = {}; will not work, because it's a reference.
                await ctx.complete();
                break;
        }
    }, help: bot.lines([
        'Configure the bot by UNIX/Linux CLI style.',
        'Using [node:util.parseArgs](https://nodejs.org/docs/latest-v21.x/api/util.html#utilparseargsconfig) to parse arguments.',
    ]), cmds: {
        toggle: 'Toggle configurations. Only works for boolean values.',
        set: 'Usage: /set --`OPTION` `VALUE` -`SHORT`',
        reset: 'Reset all configurations. Only erase `session.config`.',
        factory: 'Factory reset all memory areas. Erase the whole `session`.',
    }, args: {
        chatty: {
            type: 'string', short: 'c', default: ON,
            desc: `\`(${BINARY_STRINGS.join(', ')})\` Enable/Disable chatty mode.`,
            validate: utilitas.humanReadableBoolean,
        },
    },
}, {
    run: true, priority: -8830, name: 'history', func: async (ctx, next) => {
        if (ctx.type === 'callback_query') {
            await ctx.deleteMessage(ctx.m.message_id);
        }
        const regex = '[-—]+skip=[0-9]*';
        let result;
        const keyWords = ctx.cmd.args.replace(new RegExp(regex, 'i'), '').trim();
        let catchArgs = ctx.cmd.args.replace(new RegExp(`^.*(${regex}).*$`, 'i'), '$1');
        catchArgs === ctx.cmd.args && (catchArgs = '');
        const offset = ~~catchArgs.replace(/^.*=([0-9]*).*$/i, '$1');
        if (!keyWords) { return await ctx.er('Topic is required.'); }
        switch (hal._?.database?.provider) {
            case dbio.MYSQL:
                result = await hal._.database?.client?.query?.(
                    'SELECT *, MATCH(`distilled`) '
                    + 'AGAINST(? IN NATURAL LANGUAGE MODE) AS `relevance` '
                    + 'FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? '
                    + 'HAVING relevance > 0 '
                    + 'ORDER BY `relevance` DESC, `id` DESC '
                    + `LIMIT ${SEARCH_LIMIT} OFFSET ?`,
                    [keyWords, table, ctx.botInfo.id, ctx.chatId, offset]
                );
                break;
            case dbio.POSTGRESQL:
                globalThis.debug = 2;
                const vector = await hal._.embedding(keyWords);
                result = await hal._.database?.client?.query?.(
                    `SELECT * FROM ${table} WHERE bot_id = $1 AND chat_id = $2`
                    + ` ORDER BY distilled_vector <-> $3 LIMIT ${SEARCH_LIMIT}`
                    + ` OFFSET $4`, [
                    ctx.botInfo.id, ctx.chatId,
                    await dbio.encodeVector(vector), offset
                ]);
                break;
        }
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
                text: `/search@${ctx.botInfo.username} ${keyWords} `
                    + `--skip=${offset + result.length}`,
            }]
        })));
        result.length || await ctx.er('No more records.');
    }, help: bot.lines([
        'Search history.',
        'Example 1: /search Answer to the Ultimate Question',
        'Example 2: /search Answer to the Ultimate Question --skip=10',
    ]), cmds: {
        search: 'Usage: /search `ANYTHING` --skip=`OFFSET`',
    }
}, {
    run: true, priority: 8960, name: 'text-to-speech', func: async (ctx, next) => {
        await ctx.shouldSpeech();
        await next();
    }, help: bot.lines([
        'When enabled, the bot will speak out the answer if available.',
        'Example 1: /set --tts on',
        'Example 2: /set --tts off',
    ]), args: {
        tts: {
            type: 'string', short: 't', default: ON,
            desc: `\`(${BINARY_STRINGS.join(', ')})\` Enable/Disable TTS. Default \`${ON}\` except in groups.`,
            validate: utilitas.humanReadableBoolean,
        },
    },
}];

const establish = module => {
    if (!module.run) { return; }
    assert(module?.func, 'Skill function is required.', 500);
    hal._.skills[module.name || (module.name = uuidv4())] = {
        args: module.args || {},
        cmds: module.cmds || {},
        cmdx: module.cmdx,
        help: module.help || '',
        hidden: !!module.hidden,
    };
    hal._.args = { ...hal._.args, ...module.args || {} };
    for (let sub of ['cmds', 'cmdx']) {
        Object.keys(module[sub] || {}).map(command => hal._.cmds.push(
            newCommand(command, module[sub][command])
        ));
    }
    log(`Establishing: ${module.name} (${module.priority})`, { force: true });
    return hal.use(utilitas.countKeys(module.cmds) && !module.cmdx ? async (ctx, next) => {
        for (let c in module.cmds) {
            if (utilitas.insensitiveCompare(ctx.cmd?.cmd, c)) {
                ctx.skipMemorize();
                return await module.func(ctx, next);
            }
        }
        return next();
    } : module.func);
};

const parseArgs = async (args, ctx) => {
    const { values, tokens } = _parseArgs({
        args: utilitas.splitArgs((args || '').replaceAll('—', '--')),
        options: hal._.args, tokens: true
    });
    const result = {};
    for (let x of tokens) {
        result[x.name] = hal._.args[x.name]?.validate
            ? await hal._.args[x.name].validate(values[x.name], ctx)
            : values[x.name];
    }
    return result;
};

const init = async (options) => {
    if (options) {
        hal = await bot.init(options);
        if (callosum.isPrimary) {
            const pkg = await utilitas.which();
            mime = await utilitas.need('mime');
            lorem = new (await utilitas.need('lorem-ipsum')).LoremIpsum;
            hal._ = {
                args: { ...options?.args || {} },
                auth: Function.isFunction(options?.auth) && options.auth,
                chatType: new Set(options?.chatType || ['mention', PRIVATE]),   // ignore GROUP, CHANNEL by default
                cmds: [...options?.cmds || []],
                hello: options?.hello || HELLO,
                help: { ...options?.help || {} },
                homeGroup: options?.homeGroup,
                info: options?.info || bot.lines([`[${EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description]),
                magicWord: options?.magicWord && new Set(options.magicWord),
                private: options?.private && new Set(options.private),
                session: { get: options?.session?.get, set: options?.session?.set },
                skills: { ...options?.skills || {} },
                speech: options?.speech,
                vision: options?.vision,
                supportedMimeTypes: options?.supportedMimeTypes || [],
                database: options?.database,
                memorize: options?.memorize,
                embedding: options?.embedding,
            };
            (!options?.session?.get || !options?.session?.set)
                && log(`WARNING: Sessions persistence is not enabled.`);
            const mods = [
                ...subconscious.map(s => ({ ...s, run: s.run && !options?.silent })),
                ...utilitas.ensureArray(options?.skill),
            ];
            if (hal._.database) {
                assert(
                    [dbio.MYSQL, dbio.POSTGRESQL].includes(hal._.database?.provider),
                    'Invalid database provider.'
                );
                assert(
                    hal._.database?.client?.query
                    && hal._.database?.client?.upsert,
                    'Database client is required.'
                );
                const dbResult = [];
                try {
                    for (const act of initSql[hal._.database?.provider]) {
                        dbResult.push(await hal._.database.client.query(...act));
                    }
                } catch (e) { console.error(e); }
            }
            for (let skillPath of utilitas.ensureArray(options?.skillPath)) {
                log(`SKILLS: ${skillPath}`);
                const files = (readdirSync(skillPath) || []).filter(
                    file => /\.mjs$/i.test(file) && !file.startsWith('.')
                );
                for (let f of files) {
                    const m = await import(join(skillPath, f));
                    mods.push({ ...m, name: m.name || f.replace(/^(.*)\.mjs$/i, '$1') });
                }
            }
            mods.sort((x, y) => ~~x.priority - ~~y.priority).map(establish);
            assert(mods.length, 'Invalid skill set.', 501);
            await parseArgs(); // Validate args options.
        }
    }
    assert(hal, 'Hal have not been initialized.', 501);
    return hal;
};



export default init;
export {
    _NEED,
    BINARY_STRINGS,
    COMMAND_DESCRIPTION_LENGTH,
    COMMAND_LENGTH,
    COMMAND_LIMIT,
    EMOJI_BOT,
    EMOJI_SPEECH,
    GROUP_LIMIT,
    HELLO,
    PRIVATE_LIMIT,
    end,
    init,
    lines2,
    newCommand,
    oList,
    uList
};
