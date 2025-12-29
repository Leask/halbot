import { dbio, hal, utilitas } from '../index.mjs';
import { readFile } from 'fs/promises';

const getPath = (subPath) => utilitas.__(import.meta.url, subPath);
const getTemplate = async () => await readFile(getPath('turn.html'), 'utf-8');

const renderTemplate = async (data) => {
    const template = await getTemplate();
    return template.replace(/{([^}]+)}/g, (match, key) => data[key] || match);
};

const process = async (ctx, next) => {
    // const resp = await web.get(ctx.request.query.url, { encode: 'BUFFER' });
    // const chT = new Date(ctx.request.header?.['if-modified-since'] || undefined);
    // const mdT = new Date(resp.headers['last-modified']?.[0] || undefined);
    // ctx.set('content-type', resp.headers['content-type']);
    // ctx.set('last-modified', resp.headers['last-modified']);
    // ctx.set('cache-control', 'max-age=0');
    // if (Date.isDate(chT, true) && Date.isDate(mdT, true) && chT >= mdT) {
    //     return ctx.status = 304;
    // }
    // ctx.body = resp.content;
    const result = await dbio.queryOne(`SELECT * FROM ${hal.table} WHERE token = $1`, [ctx.params.token]);
    print(result);
    ctx.body = await renderTemplate({});
};

export const { actions } = {
    actions: [
        {
            path: 'turn/:token',
            method: 'GET',
            process,
        },
    ]
};
