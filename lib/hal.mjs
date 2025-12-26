import { alan, bot, callosum, dbio, storage, utilitas } from 'utilitas';
import { join } from 'path';
import { parseArgs as _parseArgs } from 'node:util';
import { readdirSync } from 'fs';
import { ignoreErrFunc } from 'utilitas/lib/utilitas.mjs';

// 👇 https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
const [ // https://limits.tginfo.me/en
    HELLO, GROUP, PRIVATE, CHANNEL, MENTION, jsonOptions, COMMAND_LIMIT, ON,
    OFF, BOT_COMMAND, CHECK, logOptions, COMMAND_LENGTH,
    COMMAND_DESCRIPTION_LENGTH, RELEVANCE, SEARCH_LIMIT, SUB_LIMIT,
] = [
        'Hello!', 'group', 'private', 'channel', 'mention',
        { code: true, extraCodeBlock: 1 }, 100, 'on', 'off', 'bot_command',
        '☑️', { log: true }, 32, 256, 0.2, 10, 200, // Google Rerank limit
    ];

const table = 'utilitas_hal_events';
const log = (c, o) => utilitas.log(c, import.meta.url, { time: 1, ...o || {} });
const [end] = [bot.end];
const uList = arr => bot.lines(arr.map(x => `- ${x}`));
const oList = arr => bot.lines(arr.map((v, k) => `${k + 1}. ${v}`));
const [BINARY_STRINGS] = [[OFF, ON]];

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

let _;

const newCommand = (command, description) => ({
    command: utilitas.ensureString(command, { case: 'SNAKE' }).slice(0, COMMAND_LENGTH),
    description: utilitas.trim(description).slice(0, COMMAND_DESCRIPTION_LENGTH),
});

const json = obj => bot.lines([
    '```json', utilitas.prettyJson(obj, jsonOptions).replaceAll('```', ''), '```'
]);

const establish = module => {
    assert(module?.func, 'Pipeline function is required.', 500);
    _.pipeline[module.name || (module.name = uuidv4())] = {
        help: module.help || '', args: module.args || {},
        hidden: !!module.hidden,
    };
    _.args = { ..._.args, ...module.args || {} };
    Object.keys(module?.cmds || {}).map(command => _.cmds.push(
        newCommand(command, module?.cmds[command])
    ));
    log(`Establishing: ${module.name} (${module.priority})`, { force: true });
    return _.bot.use(utilitas.countKeys(module.cmds) ? (async (ctx, next) =>
        await (utilitas.insensitiveHas(
            Object.keys(module.cmds), ctx._?.cmd?.cmd
        ) || module.run ? module.func(ctx, next) : next())
    ) : module.func);
};

const parseArgs = async (args, ctx) => {
    const { values, tokens } = _parseArgs({
        args: utilitas.splitArgs((args || '').replaceAll('—', '--')),
        options: _.args, tokens: true
    });
    const result = {};
    for (let x of tokens) {
        result[x.name] = _.args[x.name]?.validate
            ? await _.args[x.name].validate(values[x.name], ctx)
            : values[x.name];
    }
    return result;
};

const packMessage = (messages) => messages.map(x => ({
    message_id: x.message_id, score: x.score, created_at: x.created_at,
    request: x.received_text, response: x.response_text,
}));

const recall = async (sessionId, keyword, offset = 0, limit = SEARCH_LIMIT, options = {}) => {
    assert(sessionId, 'Session ID is required.');
    let [result, _limit, exclude] = [
        [], _.rerank ? SUB_LIMIT : limit,
        (options?.exclude || []).map(x => `${~~x}`),
    ];
    if (!keyword) { return result; }
    switch (_.storage?.provider) {
        case dbio.MYSQL:
            result = await _.storage?.client?.query?.(
                'SELECT *, MATCH(`distilled`) '
                + 'AGAINST(? IN NATURAL LANGUAGE MODE) AS `relevance` '
                + "FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? "
                + "AND `received_text` != '' "
                + "AND `received_text` NOT LIKE '/%' "
                + "AND `response_text` != '' HAVING relevance > 0 "
                + (exclude.length ? `AND \`message_id\` NOT IN (${exclude.join(',')}) ` : '')
                + 'ORDER BY `relevance` DESC '
                + `LIMIT ${_limit} OFFSET ?`,
                [keyword, table, _.bot.botInfo.id, sessionId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            // globalThis.debug = 2;
            const vector = await dbio.encodeVector(await _.embed(keyword));
            result = await _.storage?.client?.query?.(
                `SELECT *, (1 - (distilled_vector <=> $1)) as relevance `
                + `FROM ${table} WHERE bot_id = $2 AND chat_id = $3 `
                + `AND received_text != '' `
                + `AND received_text NOT LIKE '/%' `
                + `AND response_text != '' `
                + (exclude.length ? `AND message_id NOT IN (${exclude.join(',')}) ` : '')
                + `ORDER BY (distilled_vector <=> $1) ASC `
                + `LIMIT ${_limit} OFFSET $4`,
                [vector, _.bot.botInfo.id, sessionId, offset]
            );
            break;
    }
    return await rerank(keyword, result, offset, limit, options);
};

const getContext = async (sessionId, offset = 0, limit = SEARCH_LIMIT, options = {}) => {
    assert(sessionId, 'Session ID is required.');
    let result = [];
    switch (_.storage?.provider) {
        case dbio.MYSQL:
            result = await _.storage?.client?.query?.(
                'SELECT * FROM ?? WHERE `bot_id` = ? AND `chat_id` = ? '
                + "AND `received_text` != '' "
                + "AND `received_text` NOT LIKE '/%' "
                + "AND `response_text` != '' "
                + `ORDER BY \`created_at\` DESC LIMIT ${limit} OFFSET ?`,
                [table, _.bot.botInfo.id, sessionId, offset]
            );
            break;
        case dbio.POSTGRESQL:
            result = await _.storage?.client?.query?.(
                `SELECT * FROM ${table} WHERE bot_id = $1 AND chat_id = $2 `
                + `AND received_text != '' `
                + `AND received_text NOT LIKE '/%' `
                + `AND response_text != '' `
                + `ORDER BY created_at DESC LIMIT ${limit} OFFSET $3`,
                [_.bot.botInfo.id, sessionId, offset]
            );
            break;
    }
    return packMessage(result);
};

const rerank = async (keyword, result, offset = 0, limit = SEARCH_LIMIT, options = {}) => {
    if (result.length && _.rerank) {
        const keys = {};
        const _result = [];
        for (const x of result) {
            if (!keys[x.distilled]) {
                keys[x.distilled] = true;
                _result.push(x);
            }
        }
        const resp = await _.rerank(keyword, _result.map(x => x.distilled));
        resp.map(x => result[x.index].score = x.score);
        result.sort((a, b) => b.score - a.score);
        result = result.filter(
            x => x.score > RELEVANCE
        ).slice(offset, offset + limit);
    }
    return packMessage(result);
};

const extendSessionStorage = storage => storage && storage.client && {
    get: async (id, options) => {
        const CONTEXT_LIMIT_WITH_RAG = 5;
        let resp = await storage.get(id);
        if (resp) {
            const ctxResp = await getContext(id, undefined, undefined);
            const ragResp = await recall(
                id, options?.prompt, undefined, undefined, {
                exclude: ctxResp.map(x => x.message_id),
            });
            ctxResp.sort((a, b) => ~~a.message_id - ~~b.message_id);
            ragResp.sort((a, b) => a.score - b.score);
            resp.messages = [...ragResp, ...ragResp?.length ? ctxResp.slice(
                ctxResp.length - CONTEXT_LIMIT_WITH_RAG
            ) : ctxResp];
        } else {
            resp = { messages: [] };
        }
        // print(resp);
        return resp;
    },
    set: async (id, session, options) => await storage.set(id, session, options),
};

const subconscious = {
    name: 'Subconscious', run: true, priority: 0,
    func: async (_, next) => { ignoreErrFunc(next, logOptions) }, // non-blocking
};

const init = async (options) => {
    if (options) {
        const { ais } = await alan.initChat({
            sessions: extendSessionStorage(options?.storage),
        });
        if (callosum.isPrimary) {
            const cmds = options?.cmds || [];
            // config multimodal engines
            const supportedMimeTypes = new Set(ais.map(x => {
                // init instant ai selection
                cmds.push(newCommand(`ai_${x.id}`, `${x.name}: ${x.features}`));
                return x.model;
            }).map(x => x.supportedMimeTypes || []).flat().map(x => x.toLowerCase()));
            const _bot = await bot.init(options);
            const pkg = await utilitas.which();
            _ = {
                args: { ...options?.args || {} },
                auth: Function.isFunction(options?.auth) && options.auth,
                bot: _bot,
                chatType: new Set(options?.chatType || [MENTION, PRIVATE]),   // ignore GROUP, CHANNEL by default
                cmds: [...options?.cmds || []],
                embed: options?.embed,
                hello: options?.hello || HELLO,
                help: { ...options?.help || {} },
                homeGroup: options?.homeGroup,
                info: options?.info || bot.lines([`[${bot.BOT} ${pkg.title}](${pkg.homepage})`, pkg.description]),
                lang: options?.lang,
                pipeline: options?.pipeline || {},
                private: options?.private && new Set(options.private),
                rerank: options?.rerank,
                storage: options?.storage,
                supportedMimeTypes,
            };
            if (_.storage) {
                assert([
                    dbio.MYSQL, dbio.POSTGRESQL, storage.FILE
                ].includes(_.storage?.provider), 'Invalid storage provider.');
                if ([
                    dbio.MYSQL, dbio.POSTGRESQL
                ].includes(_.storage?.provider)) {
                    assert(
                        _.storage?.client?.query && _.storage?.client?.upsert,
                        'Invalid storage client.'
                    );
                    const dbResult = [];
                    try {
                        for (const act of initSql[_.storage?.provider]) {
                            dbResult.push(await _.storage.client.query(...act));
                        }
                    } catch (e) { console.error(e); }
                }
            }
            const mods = [subconscious];
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
    assert(_, 'Bot have not been initialized.', 501);
    return _;
};

export default init;
export {
    BINARY_STRINGS,
    BOT_COMMAND,
    CHANNEL,
    CHECK,
    COMMAND_DESCRIPTION_LENGTH,
    COMMAND_LENGTH,
    COMMAND_LIMIT,
    GROUP,
    HELLO,
    MENTION,
    OFF,
    ON,
    PRIVATE,
    SEARCH_LIMIT,
    parseArgs,
    _,
    end,
    getContext,
    init,
    json,
    logOptions,
    newCommand,
    oList,
    recall,
    rerank,
    table,
    uList
};
