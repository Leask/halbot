import { alan } from '../index.mjs';

const _name = 'Chat';
const log = (c, o) => utilitas.log(c, _name, { time: 1, ...o || {} });

const generate = async (ctx) => {
    try {
        let [resp, extra, lock, sResp, lastMsg, lastSent] =
            [null, { buttons: [] }, 1000 * 5, null, null, 0];
        const ok = async options => {
            const curTime = Date.now();
            if (options?.processing && (
                curTime - lastSent < ctx._.limit || lastMsg === resp.text
            )) { return; }
            [lastSent, lastMsg] = [curTime + lock, resp.text];
            if (!options?.processing) {
                (resp.annotations || []).map((x, i) => extra.buttons.push({
                    label: `${i + 1}. ${x.title}`, url: x.url,
                }));
            }
            sResp = await ctx.ok(resp.text, {
                ...ctx._.keyboards ? { keyboards: ctx._.keyboards } : {},
                md: true, ...extra, ...options || {},
            });
            lastSent = curTime;
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
        await resp.text.trim() ? ok({ processing: false })
            : ctx.deleteMessage(ctx._.done[0].message_id);
        ctx._.request = resp.request;
        ctx._.response = resp.response;
        ctx.memorize && await ctx.memorize();
    } catch (err) { log(err); }
};

const action = async (ctx, next) => {
    ctx.finish();
    await next();
    if (!ctx._.text && !ctx._.collected.length) { return; }
    generate(ctx);
};

export const { name, run, priority, func } = {
    name: _name,
    run: true,
    priority: 100,
    func: action,
};
