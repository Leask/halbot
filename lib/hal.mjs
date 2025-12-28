import { alan, bot, callosum, dbio, storage, utilitas } from 'utilitas';
import { join } from 'path';
import { parseArgs as _parseArgs } from 'node:util';
import { readdirSync } from 'fs';
import { ignoreErrFunc } from 'utilitas/lib/utilitas.mjs';

// 👇 https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
const [ // https://limits.tginfo.me/en
    HELLO, GROUP, PRIVATE, CHANNEL, MENTION, jsonOptions, COMMAND_LIMIT, ON,
    OFF, BOT_COMMAND, CHECK, logOptions, COMMAND_LENGTH,
    COMMAND_DESCRIPTION_LENGTH,
] = [
        'Hello!', 'group', 'private', 'channel', 'mention',
        { code: true, extraCodeBlock: 1 }, 100, 'on', 'off', 'bot_command',
        '☑️', { log: true }, 32, 256,
    ];

const table = 'utilitas_hal_events';
const log = (c, o) => utilitas.log(c, import.meta.url, { time: 1, ...o || {} });
const [end] = [bot.end];
const uList = arr => bot.lines(arr.map(x => `- ${x}`));
const oList = arr => bot.lines(arr.map((v, k) => `${k + 1}. ${v}`));
const [BINARY_STRINGS] = [[OFF, ON]];
const assembleKey = (c, t, k) => `HAL/SESSIONS/${c}/${t}/${k ? `/${k}` : ''}`;
const assembleSettingsKey = (c, k) => assembleKey(c, 'SETTINGS', k);
const assembleCommandsKey = (c, k) => assembleKey(c, 'COMMANDS', k);
const assembleCallbacksKey = (c, k) => assembleKey(c, 'CALLBACKS', k);

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

const subconscious = {
    name: 'Subconscious', run: true, priority: 0,
    func: async (_, next) => { ignoreErrFunc(next, logOptions) }, // non-blocking
};

const init = async (options) => {
    if (options) {
        const { ais } = await alan.initChat({ sessions: null });
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
    _,
    assembleKey,
    assembleCommandsKey,
    assembleSettingsKey,
    assembleCallbacksKey,
    end,
    init,
    json,
    logOptions,
    newCommand,
    oList,
    parseArgs,
    table,
    uList,
};
