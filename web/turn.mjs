import { dbio, hal, utilitas } from '../index.mjs';
import { readFile } from 'fs/promises';

const getPath = (subPath) => utilitas.__(import.meta.url, subPath);
const getHtml = async () => await readFile(getPath('turn.html'), 'utf-8');
const renderHtml = async (data) => await getHtml().then((html) => html.replace("'{{data}}'", data));

const file = async (ctx) => {
    try {
        const url = await hal._.bot.telegram.getFileLink(ctx.params.id);
        const resp = await fetch(url.href);
        ctx.set('Content-Type', resp.headers.get('Content-Type'));
        ctx.body = Buffer.from(await resp.arrayBuffer());
    } catch (err) {
        ctx.status = 404;
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
    // print(result);
    const messages = [{
        role: `${result.received.message.from.username} (${result.received.message.from.first_name} ${result.received.message.from.last_name})`,
        text: result.received_text,
        time: new Date(result.received.message.date * 1000),
    }];

    const last = result.response?.[result.response?.length - 1];
    const defaultTime = new Date((last?.edit_date || last?.date || result.received.message.date) * 1000);

    if (result.response_text) {
        messages.push({
            role: 'HAL9000',
            text: result.response_text,
            time: defaultTime,
        });
    }

    result.response.map(x => {
        const p = x.photo?.[x.photo?.length - 1];
        if (p) {
            messages.push({
                role: 'HAL9000',
                text: `![Image](/file/${p.file_id})`,
                time: new Date((x.edit_date || x.date || result.received.message.date) * 1000),
            });
        }
    });
    ctx.body = await renderHtml(JSON.stringify({
        bot_id: result.bot_id, chat_id: result.chat_id,
        chat_type: result.chat_type, messages, prompt_count,
    }));
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
