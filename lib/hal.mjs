import { bot, callosum, dbio, utilitas, } from 'utilitas';
import { join } from 'path';
import { parseArgs as _parseArgs } from 'node:util';
import { readdirSync } from 'fs';

// 👇 https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
const table = 'utilitas_hal_events';
const log = (c, o) => utilitas.log(c, import.meta.url, { time: 1, ...o || {} });
const [end] = [bot.end];
const uList = arr => bot.lines(arr.map(x => `- ${x}`));
const oList = arr => bot.lines(arr.map((v, k) => `${k + 1}. ${v}`));

const [ // https://limits.tginfo.me/en
    HELLO, GROUP, PRIVATE, CHANNEL, MENTION, jsonOptions, HALBOT, COMMAND_LIMIT,
    EMOJI_BOT, ON, OFF, BOT_COMMAND, CHECK, logOptions,
] = [
        'Hello!', 'group', 'private', 'channel', 'mention',
        { code: true, extraCodeBlock: 1 },
        'HALBOT', 100, '🤖', 'on', 'off', 'bot_command', '☑️', { log: true },
    ];

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

const [COMMAND_LENGTH, COMMAND_DESCRIPTION_LENGTH] = [32, 256];
const newCommand = (command, description) => ({
    command: utilitas.ensureString(command, { case: 'SNAKE' }).slice(0, COMMAND_LENGTH),
    description: utilitas.trim(description).slice(0, COMMAND_DESCRIPTION_LENGTH),
});




const json = obj => bot.lines([
    '```json', utilitas.prettyJson(obj, jsonOptions).replaceAll('```', ''), '```'
]);










const establish = module => {
    if (!module.run) { return; }
    assert(module?.func, 'Pipeline function is required.', 500);
    _.pipeline[module.name || (module.name = uuidv4())] = {
        args: module.args || {},
        cmds: module.cmds || {},
        cmdx: module.cmdx,
        help: module.help || '',
        hidden: !!module.hidden,
    };
    _.args = { ..._.args, ...module.args || {} };
    for (let sub of ['cmds', 'cmdx']) {
        Object.keys(module[sub] || {}).map(command => _.cmds.push(
            newCommand(command, module[sub][command])
        ));
    }
    log(`Establishing: ${module.name} (${module.priority})`, { force: true });
    return _.bot.use(utilitas.countKeys(module.cmds) && !module.cmdx ? async (ctx, next) => {
        for (let c in module.cmds) {
            if (utilitas.insensitiveCompare(ctx._?.cmd?.cmd, c)) {
                return await module.func(ctx, next);
            }
        }
        return await next();
    } : async (ctx, next) => {
        print(module.name);
        await module.func(ctx, next);
        // return await next();
    });
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

const init = async (options) => {
    if (options) {
        const _bot = await bot.init(options);
        if (callosum.isPrimary) {
            const pkg = await utilitas.which();
            _ = {
                bot: _bot,
                args: { ...options?.args || {} },
                auth: Function.isFunction(options?.auth) && options.auth,
                chatType: new Set(options?.chatType || [MENTION, PRIVATE]),   // ignore GROUP, CHANNEL by default
                cmds: [...options?.cmds || []],
                hello: options?.hello || HELLO,
                help: { ...options?.help || {} },
                homeGroup: options?.homeGroup,
                info: options?.info || bot.lines([`[${EMOJI_BOT} ${pkg.title}](${pkg.homepage})`, pkg.description]),
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
            if (_.database) {
                assert(
                    [dbio.MYSQL, dbio.POSTGRESQL].includes(_.database?.provider),
                    'Invalid database provider.'
                );
                assert(
                    _.database?.client?.query
                    && _.database?.client?.upsert,
                    'Database client is required.'
                );
                const dbResult = [];
                try {
                    for (const act of initSql[_.database?.provider]) {
                        dbResult.push(await _.database.client.query(...act));
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
    assert(_, 'Bot have not been initialized.', 501);
    return _;
};



export default init;
export {
    BINARY_STRINGS,
    BOT_COMMAND,
    COMMAND_DESCRIPTION_LENGTH,
    COMMAND_LENGTH,
    COMMAND_LIMIT,
    EMOJI_BOT,
    HELLO,
    MENTION,
    PRIVATE,
    parseArgs,
    ON,
    CHECK,
    OFF,
    _,
    table,
    end,
    json,
    logOptions,
    init,
    newCommand,
    oList,
    uList
};
