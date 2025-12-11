import {
    bot as b, callosum, dbio, media, speech, storage, uoid, utilitas, web,
} from 'utilitas';

import { basename, join } from 'path';
import { parseArgs as _parseArgs } from 'node:util';
import { readdirSync } from 'fs';

const _NEED = ['mime'];
// 👇 https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
const table = 'utilitas_hal_events';
const log = (c, o) => utilitas.log(c, import.meta.url, { time: 1, ...o || {} });
const [end] = [b.end];
const lines2 = arr => b.lines(arr, '\n\n');
const uList = arr => b.lines(arr.map(x => `- ${x}`));
const oList = arr => b.lines(arr.map((v, k) => `${k + 1}. ${v}`));
const getFile = async (id, op) => (await web.get(await getFileUrl(id), op)).content;
const compact = (str, op) => utilitas.ensureString(str, { ...op || {}, compact: true });
const compactLimit = (str, op) => compact(str, { ...op || {}, limit: 140 });
const SEARCH_LIMIT = 10;

const [ // https://limits.tginfo.me/en
    HELLO, GROUP, PRIVATE, CHANNEL, MENTION, API_ROOT,
    jsonOptions, sessions, HALBOT,
    COMMAND_LIMIT, EMOJI_SPEECH,
    EMOJI_LOOK, EMOJI_BOT, ON, OFF, BOT_COMMAND,
] = [
        'Hello!', 'group', 'private', 'channel', 'mention',
        'https://api.telegram.org/', { code: true, extraCodeBlock: 1 }, {},
        'HALBOT', 100,
        '👂', '👀', '🤖', 'on', 'off', 'bot_command',
    ];

const [BUFFER_ENCODE, BINARY_STRINGS] = [{ encode: storage.BUFFER }, [OFF, ON]];



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
            distilled_vector VECTOR(768)  NOT NULL,
            created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`)
    ], [
        `CREATE INDEX IF NOT EXISTS ${table}_bot_id_index ON ${table} (bot_id)`,
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

let bot, mime;

const [COMMAND_LENGTH, COMMAND_DESCRIPTION_LENGTH] = [32, 256];
const newCommand = (command, description) => ({
    command: utilitas.ensureString(command, { case: 'SNAKE' }).slice(0, COMMAND_LENGTH),
    description: utilitas.trim(description).slice(0, COMMAND_DESCRIPTION_LENGTH),
});


const getFileUrl = async (file_id) => {
    assert(file_id, 'File ID is required.', 400);
    const file = await (await init()).telegram.getFile(file_id);
    assert(file.file_path, 'Error getting file info.', 500);
    return `${API_ROOT}file/bot${hal.token}/${file.file_path}`;
};

const officeParser = async file => await utilitas.ignoreErrFunc(
    async () => await vision.parseOfficeFile(file, { input: storage.BUFFER }), { log: true }
);

const json = obj => b.lines([
    '```json', utilitas.prettyJson(obj, jsonOptions).replaceAll('```', ''), '```'
]);









const recall = async (ctx, keyword, offset = 0, limit = SEARCH_LIMIT) => {
    let result = [];
    switch (bot._?.database?.provider) {
        case dbio.MYSQL:
            result = await bot._.database?.client?.query?.(
                'SELECT *, MATCH(`distilled`) '
                + 'AGAINST(? IN NATURAL LANGUAGE MODE) AS `relevance` '
                + 'FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? '
                + 'HAVING relevance > 0 '
                + 'ORDER BY `relevance` DESC '
                + `LIMIT ${limit} OFFSET ?`,
                [keyword, table, ctx.botInfo.id, ctx.chatId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            // globalThis.debug = 2;
            const vector = await dbio.encodeVector(await bot._.embedding(keyword));
            result = await bot._.database?.client?.query?.(
                `SELECT *, (1 - (distilled_vector <=> $1)) as relevance `
                + `FROM ${table} WHERE bot_id = $2 AND chat_id = $3`
                + ` ORDER BY (distilled_vector <=> $1) ASC`
                + ` LIMIT ${limit} OFFSET $4`, [
                vector, ctx.botInfo.id, ctx.chatId, offset
            ]);
            break;
        default:
            result = [];
    }
    return result;
};

const getContext = async (ctx, offset = 0, limit = SEARCH_LIMIT) => {
    let result = [];
    switch (bot._?.database?.provider) {
        case dbio.MYSQL:
            result = await bot._.database?.client?.query?.(
                'SELECT * FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? '
                + `ORDER BY \`created_at\` DESC LIMIT ${limit} OFFSET ?`,
                [table, ctx.botInfo.id, ctx.chatId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            result = await bot._.database?.client?.query?.(
                `SELECT * FROM ${table} WHERE bot_id = $1 AND chat_id = $2 `
                + `ORDER BY created_at DESC LIMIT ${limit} OFFSET $3`,
                [ctx.botInfo.id, ctx.chatId, offset]
            );
            break;
        default:
            result = [];
    }
    return result;
};

const establish = module => {
    if (!module.run) { return; }
    assert(module?.func, 'Pipeline function is required.', 500);
    bot._.pipeline[module.name || (module.name = uuidv4())] = {
        args: module.args || {},
        cmds: module.cmds || {},
        cmdx: module.cmdx,
        help: module.help || '',
        hidden: !!module.hidden,
    };
    bot._.args = { ...bot._.args, ...module.args || {} };
    for (let sub of ['cmds', 'cmdx']) {
        Object.keys(module[sub] || {}).map(command => bot._.cmds.push(
            newCommand(command, module[sub][command])
        ));
    }
    log(`Establishing: ${module.name} (${module.priority})`, { force: true });
    return bot.use(utilitas.countKeys(module.cmds) && !module.cmdx ? async (ctx, next) => {
        for (let c in module.cmds) {
            if (utilitas.insensitiveCompare(ctx._.cmd?.cmd, c)) {
                return await module.func(ctx, next);
            }
        }
        return next();
    } : module.func);
};

const parseArgs = async (args, ctx) => {
    const { values, tokens } = _parseArgs({
        args: utilitas.splitArgs((args || '').replaceAll('—', '--')),
        options: bot._.args, tokens: true
    });
    const result = {};
    for (let x of tokens) {
        result[x.name] = bot._.args[x.name]?.validate
            ? await bot._.args[x.name].validate(values[x.name], ctx)
            : values[x.name];
    }
    return result;
};

const init = async (options) => {
    if (options) {
        bot = await b.init(options);
        if (callosum.isPrimary) {
            const pkg = await utilitas.which();
            mime = await utilitas.need('mime');
            bot._ = {
                args: { ...options?.args || {} },
                auth: Function.isFunction(options?.auth) && options.auth,
                chatType: new Set(options?.chatType || [MENTION, PRIVATE]),   // ignore GROUP, CHANNEL by default
                cmds: [...options?.cmds || []],
                hello: options?.hello || HELLO,
                help: { ...options?.help || {} },
                homeGroup: options?.homeGroup,
                info: options?.info || b.lines([`[${EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description]),
                private: options?.private && new Set(options.private),
                tts: options?.tts,
                vision: options?.vision,
                supportedMimeTypes: options?.supportedMimeTypes || [],
                database: options?.database,
                embedding: options?.embedding,
                pipeline: options?.pipeline || {},
                lang: options?.lang,
            };
            const mods = [];
            if (bot._.database) {
                assert(
                    [dbio.MYSQL, dbio.POSTGRESQL].includes(bot._.database?.provider),
                    'Invalid database provider.'
                );
                assert(
                    bot._.database?.client?.query
                    && bot._.database?.client?.upsert,
                    'Database client is required.'
                );
                const dbResult = [];
                try {
                    for (const act of initSql[bot._.database?.provider]) {
                        dbResult.push(await bot._.database.client.query(...act));
                    }
                } catch (e) { console.error(e); }
            }
            for (let pipeline of utilitas.ensureArray(options?.pipelinePath || [])) {
                log(`PIPELINE: ${pipeline}`);
                const files = (readdirSync(pipeline) || []).filter(
                    file => /\.mjs$/i.test(file) && !file.startsWith('.')
                );
                for (let f of files) {
                    const m = await import(join(pipeline, f));
                    mods.push({ ...m, name: m.name || f.replace(/^(.*)\.mjs$/i, '$1') });
                }
            }
            mods.sort((x, y) => ~~x.priority - ~~y.priority).map(establish);
            assert(mods.length, 'Invalid pipeline.', 501);
            await parseArgs(); // Validate args options.
        }
    }
    assert(bot, 'Bot have not been initialized.', 501);
    return bot;
};



export default init;
export {
    _NEED,
    BINARY_STRINGS,
    COMMAND_DESCRIPTION_LENGTH,
    COMMAND_LENGTH,
    COMMAND_LIMIT,
    EMOJI_BOT,
    BOT_COMMAND,
    EMOJI_SPEECH,
    HELLO,
    bot,
    end,
    json,
    init,
    lines2,
    newCommand,
    oList,
    uList
};
