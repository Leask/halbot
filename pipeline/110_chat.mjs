import { alan, utilitas } from '../index.mjs';

const onProgress = { onProgress: true };
const LN2 = '\n\n';
const [joinL1, joinL2] = [a => a.join(LN2), a => a.join(LN2)];
const log = content => utilitas.log(content, import.meta.url);

const action = async (ctx, next) => {
    if (!ctx._.prompt && !ctx._.attachments.length) { return await next(); }
    let [
        YOU, msgs, pms, extra, lock, sResp, lastMsg, lastSent, references,
        audio,
    ] = [
            `${ctx._.avatar} You:`, {}, [], { buttons: [] }, 1000 * 5, null, null,
            0, null, null,
        ];
    const packMsg = options => {
        const said = !options?.tts && ctx._.result ? ctx._.result : '';
        const packed = [...said ? [joinL2([YOU, said])] : []];
        const pure = [];
        ctx._.ai.map(n => {
            const content = msgs[n]?.[options?.tts ? 'spoken' : 'text'] || '';
            pure.push(content);
            const ai = ctx._.ais.find(x => x.id === n);
            const aiName = ai.name.replace(
                /^(.*\().*(\))$/,
                `$1${msgs[n]?.model.replace(/^[^\/]*\//, '')}$2`
            );
            packed.push(joinL2([
                ...options?.tts ? [] : [`${aiName}:`], content
            ]));
        });
        return pure.join('').trim().length ? joinL1(packed) : '';
    };
    const ok = async options => {
        const [curTime, curMsg] = [Date.now(), packMsg(options)];
        if (options?.onProgress && (
            curTime - lastSent < ctx._.limit || lastMsg === curMsg
        )) { return; }
        [lastSent, lastMsg] = [curTime + lock, curMsg];
        if (options?.final) {
            (references?.links || []).map((x, i) => extra.buttons.push({
                label: `${i + 1}. ${x.title}`, url: x.uri,
            }));
        }
        sResp = await ctx.ok(curMsg, {
            ...ctx._.keyboards ? { keyboards: ctx._.keyboards } : {},
            md: true, ...extra, ...options || {},
        });
        lastSent = curTime;
        return sResp;
    };
    await ok(onProgress);
    for (const n of ctx._.ai) {
        pms.push((async ai => {
            try {
                const resp = await alan.talk(ctx._.prompt, {
                    aiId: ai, ...ctx._, stream: async r => {
                        msgs[ai] = r;
                        await ok(onProgress);
                    },
                });
                references = resp.references;
                audio = resp.audio;
                msgs[ai] = resp;
                msgs[ai].spoken = ctx._.ai.length === 1
                    && !resp.text.split('\n').some(x => /^\s*```/.test(x))
                    ? resp.spoken : null;
                for (let img of resp?.images || []) {
                    await ctx.image(img.data, { caption: `🎨 by ${resp.model}` });
                    await ctx.timeout();
                }
                for (let video of resp?.videos || []) {
                    await ctx.video(video.data, { caption: `🎬 by ${resp.model}` });
                    await ctx.timeout();
                }
                return resp;
            } catch (err) {
                msgs[ai] = {
                    ...msgs[ai], text: `⚠️ ${err?.message || err}`,
                    spoken: null,
                };
                log(err);
            }
        })(n));
    }
    await Promise.all(pms);
    await (Object.values(msgs).map(x => x.text).join('').trim()
        ? ok({ final: true }) : ctx.deleteMessage(sResp[0].message_id));
    ctx._.generated = Object.values(msgs).map(x => x.text).join('\n\n');
    ctx._.tts = audio || packMsg({ tts: true });
    await next();
};

export const { name, run, priority, func } = {
    name: 'Chat',
    run: true,
    priority: 110,
    func: action,
};
