import { bot, hal, media, storage, utilitas, vision, web } from '../index.mjs';

const collectableFiles = ['document', 'sticker', 'video_note', 'video'];

const [API_ROOT, BUFFER_ENCODE, EMOJI_SPEECH, EMOJI_LOOK, ATTACHMENT, PROMPT]
    = [
        'https://api.telegram.org/', { encode: storage.BUFFER }, '👂', '👀',
        'ATTACHMENT', 'PROMPT',
    ];

const collectableObjects = [
    'venue', 'location', 'contact', 'poll', 'left_chat_member',
    'new_chat_member', 'checklist'
];

const metaPrompt = "The following are meta information changes or attachment details for the current chat. Please respond appropriately. For example, if it's a poll, make a selection based on your understanding. If there are changes in group members, greet or bid farewell to the respective individuals. If it's a geographical location description, provide a suitable answer based on the context. You may also receive other types of information, for which a reasonable, human-like response is expected.";

// Processing will bypass the keyboard update while keeping the message editable.
const sendInit = async (ctx, txt) => ctx._.done.length
    || await ctx.ok(txt, { processing: true });

const getFileUrl = async (ctx, file_id) => {
    assert(file_id, 'File ID is required.', 400);
    const file = await ctx.telegram.getFile(file_id);
    assert(file.file_path, 'Error getting file info.', 500);
    return `${API_ROOT}file/bot${ctx.telegram.token}/${file.file_path}`;
};

const officeParser = async file => await utilitas.ignoreErrFunc(async () =>
    await vision.parseOfficeFile(file, { input: storage.BUFFER }), { log: true }
);

const ctxExt = ctx => {
    ctx.getFileUrl = async (file_id) => await getFileUrl(ctx, file_id);
    ctx.getFile = async (file_id, options) => (await web.get(
        await ctx.getFileUrl(file_id), { ...BUFFER_ENCODE, ...options }
    )).content;
};

let mime;

const collectFile = async (ctx, f) => {
    f = { ...f };
    f.url || (f.url = await ctx.getFileUrl(f.file_id));
    f.file_name || (f.file_name = utilitas.basename(f.url));
    f.data || (f.data = await ctx.getFile(f.file_id));
    f.mime_type || (f.mime_type = (await storage.getMime(f.data, f.file_name))?.mime);
    let text = '';
    f.emoji && ctx.collect(f.emoji, PROMPT);
    if (hal._.supportedMimeTypes.has(f.mime_type)) {
        ctx.collect({ mime_type: f.mime_type, data: f.data }, ATTACHMENT);
    } else if (await storage.isTextFile(f.data)) {
        text = f.data.toString();
    } else if (/^.*\.(docx|xlsx|pptx)$/.test(f.file_name)) {
        text = await officeParser(f.data);
    }
    if (text) {
        ctx.collect(bot.lines([
            '---', `file_name: ${f.file_name}`,
            `mime_type: ${f.mime_type}`, `type: DOCUMENT`,
            '---', text
        ]), PROMPT);
    }
};

const extract = async (ctx, m) => {
    collectableObjects.map(k => {
        if (k === 'new_chat_member' && m[k]?.user?.id === ctx.botInfo.id) {
            return; // ignore current bot joining the group
        }
        return m[k] && ctx.collect(
            bot.lines([
                '---', metaPrompt, `type: ${k}`,
                '---', JSON.stringify(m[k])
            ]), PROMPT
        );
    });
    await Promise.all(collectableFiles.map(async k => {
        if (!m[k]) { return; }
        await sendInit(ctx, EMOJI_LOOK);
        await collectFile(ctx, m[k]);
    }));
    if (m.photo?.[m.photo?.length - 1]) {
        await sendInit(ctx, EMOJI_LOOK);
        const f = m.photo[m.photo.length - 1];
        await collectFile(ctx, { ...f, file_name: `${f.file_unique_id}.jpg` });
    }
    let a;
    if ((a = m.voice || m.audio)) {
        await sendInit(ctx, EMOJI_SPEECH);
        await collectFile(ctx, {
            ...a, mime_type: storage.MIME_WAV,
            data: await media.convertAudioTo16kNanoPcmWave(
                await ctx.getFile(a.file_id)
            ),
        });
    }
};

const action = async (ctx, next) => {
    // init
    ctxExt(ctx);
    mime || (mime = await utilitas.need('mime'));
    // collect objects
    await Promise.all([
        ctx._.message, ctx._.message?.reply_to_message
    ].filter(x => x).map(async m => await extract(ctx, m)));
    // collect reply_to_message
    ctx._.message.reply_to_message?.text && ctx.collect(
        ctx._.message.reply_to_message.text, PROMPT
    );
    ctx._.message.reply_to_message?.caption && ctx.collect(
        ctx._.message.reply_to_message.caption, PROMPT
    );
    // print(JSON.stringify(ctx.update, null, 2));
    // print(ctx._.text);
    // print(ctx._.collected);
    await next();
};

export const { _NEED, name, run, priority, func } = {
    _NEED: ['mime'], name: 'Collect', run: true, priority: 70, func: action,
};
