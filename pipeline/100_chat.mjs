import { alan } from '../index.mjs';

const _name = 'Chat';
const log = (c, o) => utilitas.log(c, _name, { time: 1, ...o || {} });

const action = async (ctx, next) => {
    if (!ctx._.text && !ctx._.collected.length) { return await next(); }
    let [resp, extra, delay, lock, sResp, lastMsg, lastSent] =
        [null, { buttons: [] }, 1000 * 3, false, null, null, 0];
    const ok = async options => {
        if (options?.processing && (
            Date.now() - lastSent < ctx._.limit || lastMsg === resp.text || lock
        )) { return; }
        [lastSent, lastMsg, lock] = [Date.now() + delay, resp.text, true];
        if (!options?.processing) {
            (resp.annotations || []).map((x, i) => extra.buttons.push({
                label: `${i + 1}. ${x.title}`, url: x.url,
            }));
        }
        sResp = await ctx.ok(resp.text, {
            ...ctx._.keyboards ? { keyboards: ctx._.keyboards } : {},
            ...extra, ...options || {},
        });
        [lastSent, lock] = [Date.now(), false];
        return sResp;
    };
    resp = await alan.talk(ctx._.text, {
        ...ctx._, sessionId: ctx._.chatId, // THIS LINE IS IMPORTANT
        stream: async rsp => { resp = rsp; ok({ processing: true }); }, // Never await, it will block the stream.
    });
    for (let image of resp?.images || []) {
        await ctx.timeout();
        await ctx.image(image.data, { caption: image.caption });
    }
    for (let video of resp?.videos || []) {
        await ctx.timeout();
        await ctx.video(video.data, { caption: video.caption });
    }
    for (let audio of resp?.audios || []) {
        await ctx.timeout();
        await ctx.audio(audio.data, { caption: audio.caption });
    }
    // print(resp);
    await ctx.timeout(1000 * ctx._.done.length);
    await (resp.text.trim() ? ok({ processing: false })
        : ctx.deleteMessage(ctx._.done[0].message_id));
    ctx._.request = resp.request;
    ctx._.response = resp.response;
    ctx.memorize && await ctx.memorize();
    await next();
};

export const { name, run, priority, func } = {
    name: _name, run: true, priority: 100, func: action,
};
