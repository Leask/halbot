{
    run: true, priority: -8910, name: 'speech-to-text', func: async (ctx, next) => {
        const audio = ctx.m.voice || ctx.m.audio;
        if (audio) {
            await ctx.ok(EMOJI_SPEECH);
            try {
                const url = await getFileUrl(audio.file_id);
                let file = await getFile(audio.file_id, BUFFER_ENCODE);
                if (hal._.supportedMimeTypes.has(storage.MIME_WAV)) {
                    ctx.collect({
                        mime_type: storage.MIME_WAV, url,
                        data: await media.convertAudioTo16kNanoPcmWave(file, {
                            input: storage.BUFFER, expected: storage.BASE64,
                        }),
                    }, 'PROMPT');
                }
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
                const url = await getFileUrl(s.file_id);
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
}
