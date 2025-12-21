import { alan } from '../index.mjs';

const _name = 'Chat';
const log = (c, o) => utilitas.log(c, _name, { time: 1, ...o || {} });

const action = async (ctx, next) => {
    if (!ctx._.text && !ctx._.collected.length) { return await next(); }
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
            await ctx.timeout(1000 * ctx._.limit);
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
    while (status < 2) {
        // console.log('Waiting...');
        await ctx.timeout();
    }
    // console.log('Finished');
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
