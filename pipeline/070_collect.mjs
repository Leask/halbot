import { bot, hal, media, storage, utilitas, vision, web } from '../index.mjs';

const [API_ROOT, BUFFER_ENCODE, EMOJI_SPEECH] = [
    'https://api.telegram.org/', { encode: storage.BUFFER }, '👂',
];

const getFileUrl = async (ctx, file_id) => {
    assert(file_id, 'File ID is required.', 400);
    const file = await ctx.telegram.getFile(file_id);
    assert(file.file_path, 'Error getting file info.', 500);
    return `${API_ROOT}file/bot${ctx.telegram.token}/${file.file_path}`;
};

const officeParser = async file => await utilitas.ignoreErrFunc(
    async () => await vision.parseOfficeFile(file, { input: storage.BUFFER }), { log: true }
);

const ctxExt = ctx => {
    ctx.getFileUrl = async (file_id) => await getFileUrl(ctx, file_id);
    ctx.getFile = async (file_id, options) => (await web.get(
        await ctx.getFileUrl(file_id), { ...BUFFER_ENCODE, ...options }
    )).content;
};

let mime;

const action = async (ctx, next) => {
    // init
    ctxExt(ctx);
    mime || (mime = await utilitas.need('mime'));
    // audio
    const audio = ctx._.message.voice || ctx._.message.audio;
    if (audio) {
        await ctx.ok(EMOJI_SPEECH);
        try {
            const url = await ctx.getFileUrl(audio.file_id);
            let file = await ctx.getFile(audio.file_id);
            if (hal._.supportedMimeTypes.has(storage.MIME_WAV)) {
                ctx.collect({
                    mime_type: storage.MIME_WAV, url,
                    data: await media.convertAudioTo16kNanoPcmWave(file, {
                        input: storage.BUFFER, expected: storage.BASE64,
                    }),
                }, 'PROMPT');
            }
        } catch (err) { return await ctx.err(err); }
    }
    // location
    const venue = ctx._.message.venue;
    const location = ctx._.message.location;
    if (venue) {
        ctx.collect(bot.lines(['Venue:', hal.uList([
            `title: ${venue.title}`,
            `address: ${venue.address}`,
            `latitude: ${venue.location.latitude}`,
            `longitude: ${venue.location.longitude}`,
            `foursquare_id: ${venue.foursquare_id}`,
            `foursquare_type: ${venue.foursquare_type}`,
        ])]));
    } else if (location) {
        ctx.collect(bot.lines(['Location:', hal.uList([
            `latitude: ${location.latitude}`,
            `longitude: ${location.longitude}`,
        ])]));
    }
    // contact
    const contact = ctx._.message.contact;
    if (contact) {
        ctx.collect(bot.lines(['Contact:', hal.uList([
            `first_name: ${contact.first_name}`,
            `last_name: ${contact.last_name}`,
            `phone_number: ${contact.phone_number}`,
            `user_id: ${contact.user_id}`,
            `vcard: ${contact.vcard}`,
        ])]));
    }
    // chat member changes
    const member = ctx._.message.new_chat_member || ctx._.message.left_chat_member;
    if (member) {
        if (member?.id === ctx.botInfo.id) { return ctx.end(); }
        ctx.collect(bot.lines([
            `Say ${ctx._.message.new_chat_member ? 'hello' : 'goodbye'} to:`,
            hal.uList([
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
    // poll
    const poll = ctx._.message.poll;
    if (poll) {
        ctx.collect(bot.lines([
            'Question:', poll.question, '',
            'Options:', hal.oList(poll.options.map(x => x.text)),
        ]));
    }
    // context
    ctx._.message.reply_to_message?.text && ctx.collect(
        ctx._.message.reply_to_message.text, 'CONTEXT'
    );
    // vision
    ctx.collect(ctx._.message.caption || '');
    const files = [];
    for (const m of [
        ctx._.message, ...ctx._.message.reply_to_message ? [ctx._.message.reply_to_message] : []
    ]) {
        if (m.document) {
            let file = {
                asPrompt: hal._.supportedMimeTypes.has(m.document.mime_type),
                file_name: m.document.file_name, fileId: m.document.file_id,
                mime_type: m.document.mime_type, type: storage.FILE,
                ocrFunc: async f => (await storage.isTextFile(f)) && f.toString(),
            };
            if (storage.MIME_PDF === m.document?.mime_type) {
                file = { ...file, ocrFunc: null, type: 'DOCUMENT' };
            } else if (/^image\/.*$/ig.test(m.document?.mime_type)) {
                file = { ...file, ocrFunc: null, type: 'IMAGE' };
            } else if (/^.*\.(docx|xlsx|pptx)$/.test(m.document?.file_name)) {
                file = { ...file, ocrFunc: officeParser, type: 'DOCUMENT' };
            }
            files.push(file);
        }
        if (m.sticker) {
            const s = m.sticker;
            const url = await ctx.getFileUrl(s.file_id);
            const file_name = basename(url);
            const mime_type = mime.getType(file_name) || 'image';
            files.push({
                asPrompt: hal._.supportedMimeTypes.has(mime_type), file_name,
                fileId: s.file_id, mime_type, type: 'PHOTO',
            });
        }
        if (m.photo?.[m.photo?.length - 1]) {
            const p = m.photo[m.photo.length - 1];
            files.push({
                asPrompt: hal._.supportedMimeTypes.has(storage.MIME_JPEG),
                file_name: `${p.file_id}.jpg`, fileId: p.file_id,
                mime_type: storage.MIME_JPEG, type: 'PHOTO',
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
                const url = await ctx.getFileUrl(f.fileId);
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
};

export const { _NEED, name, run, priority, func } = {
    _NEED: ['mime'], name: 'Collect', run: true, priority: 70, func: action,
};
