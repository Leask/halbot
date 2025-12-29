import { dbio, hal, utilitas } from '../index.mjs';
import { readFile } from 'fs/promises';

const getPath = (subPath) => utilitas.__(import.meta.url, subPath);
const getHtml = async () => await readFile(getPath('turn.html'), 'utf-8');
const renderHtml = async (data) => await getHtml().then((html) => html.replace("'{{data}}'", data));

const process = async (ctx, next) => {
    const result = await dbio.queryOne(
        `SELECT * FROM ${hal.table} WHERE token = $1`,
        [ctx.params.token]
    );
    result.received = JSON.parse(result.received);
    result.response = JSON.parse(result.response);
    // print(result);
    const messages = [{
        role: `${result.received.message.from.username} (${result.received.message.from.first_name} ${result.received.message.from.last_name})`,
        text: result.received_text,
        time: new Date(result.received.message.date * 1000),
    }];
    result.response.forEach(r => {
        messages.push({
            role: 'HAL9000',
            text: r.raw,
            time: new Date((r.edit_date || r.date) * 1000),
        });
    });
    ctx.body = await renderHtml(JSON.stringify({
        bot_id: result.bot_id, chat_id: result.chat_id,
        chat_type: result.chat_type, messages,
    }));
};

export const { actions } = {
    actions: [
        {
            path: 'turns/:token',
            method: 'GET',
            process,
        },
    ]
};
