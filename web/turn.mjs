import { callosum, dbio, hal, utilitas } from '../index.mjs';
import { readFile } from 'fs/promises';

const getPath = (subPath) => utilitas.__(import.meta.url, subPath);
const getHtml = async () => await readFile(getPath('turn.html'), 'utf-8');
const safeStringify = (obj) => JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
const renderHtml = async (data, metaTags = '') => await getHtml()
    .then((html) => html.replace("'{{data}}'", () => data).replace('{{meta_tags}}', () => metaTags));

const file = async (ctx) => {
    try {
        const url = await callosum.call('getFileLink', { args: [ctx.params.id] });
        const resp = await fetch(url);
        if (!resp.ok) { throw new Error(`Fetch failed: ${resp.status}`); }
        ctx.set('Content-Type', resp.headers.get('Content-Type'));
        ctx.body = Buffer.from(await resp.arrayBuffer());
    } catch (err) {
        console.error('Error serving file:', ctx.params.id, err);
        ctx.status = 404;
        ctx.body = 'Not Found';
    }
};

const process = async (ctx, next) => {
    const result = await dbio.queryOne(
        `SELECT * FROM ${hal.table} WHERE token = $1`,
        [ctx.params.token]
    );
    if (!result) { return await next(); }
    const prompt_count = await dbio.countAll(hal.table);
    result.received = JSON.parse(result.received);
    result.response = JSON.parse(result.response);

    const msg = result.received.message;
    let userText = result.received_text || '';

    const p = msg.photo?.[msg.photo?.length - 1];
    if (p) { userText = `![Image](/file/${p.file_id})\n\n${userText}`; }

    const a = msg.audio || msg.voice;
    if (a) { userText = `<audio controls src="/file/${a.file_id}" style="width: 100%; display: block; margin-bottom: 8px;"></audio>\n\n${userText}`; }

    const v = msg.video || msg.video_note;
    if (v) { userText = `<video controls src="/file/${v.file_id}" style="width: 100%; display: block; border-radius: 8px; margin-bottom: 8px;"></video>\n\n${userText}`; }

    const messages = [{
        role: `${msg.from.username} (${msg.from.first_name} ${msg.from.last_name})`,
        text: userText.trim(),
        time: new Date(msg.date * 1000),
    }];

    const first = result.response?.[0];
    let modelLine = first?.text?.replace?.(/^📃 PAGE [\d\/ ]*:\n\n/, '')?.split?.('\n')?.[0] || '';
    modelLine = modelLine.includes('/') ? modelLine.replace(/:.*$/g, '') : '';
    let role = 'HAL9000';
    if (/^\p{Extended_Pictographic}/u.test(modelLine)) {
        role = `${modelLine.split(' ')[0]} ${role}`;
        modelLine = modelLine.split(' ').slice(1).join(' ');
    }
    role = `${role} (${modelLine})`;

    const last = result.response?.[result.response?.length - 1];
    const defaultTime = new Date((last?.edit_date || last?.date || result.received.message.date) * 1000);

    if (result.response_text) {
        messages.push({
            role,
            text: result.response_text,
            time: defaultTime,
        });
    }

    result.response.map(x => {
        const p = x.photo?.[x.photo?.length - 1];
        if (p) {
            let text = `![Image](/file/${p.file_id})`;
            if (x.caption) { text += `\n\n${x.caption}`; }
            messages.push({
                role,
                text,
                time: new Date((x.edit_date || x.date || result.received.message.date) * 1000),
            });
        }
        const a = x.audio || x.voice;
        if (a) {
            let text = `<audio controls src="/file/${a.file_id}" style="width: 100%; display: block;"></audio>`;
            if (x.caption) { text += `\n\n${x.caption}`; }
            messages.push({
                role,
                text,
                time: new Date((x.edit_date || x.date || result.received.message.date) * 1000),
            });
        }
        const v = x.video || x.video_note;
        if (v) {
            let text = `<video controls src="/file/${v.file_id}" style="width: 100%; display: block; border-radius: 8px;"></video>`;
            if (x.caption) { text += `\n\n${x.caption}`; }
            messages.push({
                role,
                text,
                time: new Date((x.edit_date || x.date || result.received.message.date) * 1000),
            });
        }
    });
    let previewText = messages.length ? messages[0].text : 'A conversation with HAL9000';
    previewText = previewText.replace(/<[^>]+>/g, '').substring(0, 160).trim() + '...';

    const ogImageUrl = `https://${ctx.host}/og-image/${ctx.params.token}`;

    // Construct dynamic meta tags
    const pageTitle = `Chat ID: ${result.chat_id}`;
    const escapedDesc = previewText.replace(/"/g, '&quot;');
    const escapedTitle = pageTitle.replace(/"/g, '&quot;');

    const metaTags = `
    <!-- Standard Meta -->
    <meta name="description" content="${escapedDesc}">

    <!-- Open Graph / Facebook / Meta -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapedTitle}">
    <meta property="og:description" content="${escapedDesc}">
    <meta property="og:site_name" content="HAL9000">
    <meta property="og:image" content="${ogImageUrl}">

    <!-- Twitter / Telegram -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapedTitle}">
    <meta name="twitter:description" content="${escapedDesc}">
    <meta name="twitter:image" content="${ogImageUrl}">
    `.trim();

    ctx.body = await renderHtml(safeStringify({
        bot_id: result.bot_id, chat_id: result.chat_id,
        chat_type: result.chat_type, messages, prompt_count,
    }), metaTags);
};

export const { actions } = {
    actions: [
        {
            path: 'turns/:token',
            method: 'GET',
            process,
        },
        {
            path: 'file/:id',
            method: 'GET',
            process: file,
        },
    ]
};
