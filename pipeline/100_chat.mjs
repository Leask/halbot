import { alan } from '../index.mjs';
import { token } from 'webjam';

const _name = 'Chat';
const log = (c, o) => utilitas.log(c, _name, { time: 1, ...o || {} });

const assembleContext = async (ctx) => {
    const CONTEXT_LIMIT_WITH_RAG = 5;
    const ctxResp = await ctx.getContext();
    const ragResp = await ctx.recall(ctx._.prompt, undefined, undefined, {
        exclude: ctxResp.map(x => x.message_id),
    });
    ctxResp.sort((a, b) => ~~a.message_id - ~~b.message_id);
    ragResp.sort((a, b) => a.score - b.score);
    ctx._.messages = [...ragResp, ...ragResp?.length ? ctxResp.slice(
        ctxResp.length - CONTEXT_LIMIT_WITH_RAG
    ) : ctxResp];
};

const action = async (ctx, next) => {
    if (!ctx._.text && !ctx._.collected.length) { return await next(); }
    await assembleContext(ctx);
    let [resp, extra, lastLen, status] = [null, { buttons: [] }, 0, 0];
    const ok = async options => {
        const newLen = ~~resp?.text?.length;
        if (options?.processing && lastLen === newLen) { return; }
        lastLen = newLen;
        if (!options?.processing) {
            (resp.annotations || []).map((x, i) => extra.buttons.push({
                label: `${i + 1}. ${x.title}`, url: x.url,
            }));
        }
        return await ctx.ok(resp.text, {
            ...ctx._.keyboards ? { keyboards: ctx._.keyboards } : {},
            ...extra, ...options || {},
        });
    };
    (async () => {
        while (!status) {
            // console.log('Processing...');
            await ok({ processing: true });
            await ctx.timeout(0);
        }
        status++;
    })();
    resp = await alan.talk(ctx._.text, {
        ...ctx._, sessionId: ctx._.chatId, // THIS LINE IS IMPORTANT
        stream: rsp => resp = rsp, // Never await, it will block the stream.
    });
    status++;
    // console.log('Done');
    for (let image of resp?.images || []) {
        await ctx.image(image.data, { caption: image.caption });
        await ctx.timeout();
    }
    for (let video of resp?.videos || []) {
        await ctx.video(video.data, { caption: video.caption });
        await ctx.timeout();
    }
    for (let audio of resp?.audios || []) {
        await ctx.audio(audio.data, { caption: audio.caption });
        await ctx.timeout();
    }
    // print(resp);
    while (status < 2) {
        // console.log('Waiting...');
        await ctx.timeout();
    }
    // console.log('Finished');
    await (resp.text.trim() ? ok({ processing: false })
        : ctx.deleteMessage(ctx._.done[0].message_id));
    ctx._.request = resp.request;
    ctx._.response = resp.response;
    ctx._.token = token.newId();
    ctx.memorize && await ctx.memorize();
    await ctx.resp(
        `[📄 View conversation in well-formatted web page.](https://hal.leaskh.com/turns/${ctx._.token})`
    );
    await next();
};

export const { name, run, priority, func } = {
    name: _name, run: true, priority: 100, func: action,
};
