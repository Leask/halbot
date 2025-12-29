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
    ctx.body = await renderHtml(JSON.stringify(result));
    // ctx.body = await renderHtml(JSON.stringify({
    //     bot_id: result.bot_id,
    //     chat_id: result.chat_id,
    //     chat_type: result.chat_type,
    //     messages: [{
    //         role: `${result.received.message.from.username} (${result.received.message.from.firstname} ${result.received.message.from.lastname})`,
    //         text: result.received_text,
    //         time: new Date(result.received.message.date * 1000),
    //     }, {
    //         role: 'HAL9000',
    //         text: result.response_text,
    //         time: new Date(result.updated_at)
    //     }],
    // }));
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
