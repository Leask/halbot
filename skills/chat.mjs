import { bot, utilitas } from 'utilitas';

const onProgress = { onProgress: true };
const [BOT, LN2] = [`${bot.EMOJI_BOT} `, '\n\n'];
const [joinL1, joinL2] = [a => a.join(LN2), a => a.join(LN2)];
const enrich = name => name === 'Bing' ? `${name} (Sydney)` : name;
const log = content => utilitas.log(content, import.meta.url);

const action = async (ctx, next) => {
    if (!ctx.text) { return await next(); }
    const [YOU, msgs, ctxs, tts, pms, extra]
        = [`${ctx.avatar} You:`, {}, {}, {}, [], {}];
    let [lastMsg, lastSent] = ['', 0];
    const packMsg = options => {
        const said = !options?.tts && ctx.action ? ctx.action : '';
        const packed = [...said ? [joinL2([YOU, said])] : []];
        const source = options?.tts ? tts : msgs;
        const pure = [];
        ctx.selectedAi.map(n => {
            const content = source[n] || '';
            pure.push(content);
            packed.push(joinL2([
                ...ctx.multiAi || !ctx.isDefaultAi(n) || said || ctxs[n]?.cmd ? [
                    `${BOT}${enrich(n)}${ctxs[n]?.cmd && ` > \`${ctxs[n].cmd}\` (exit by /clear)` || ''}:`
                ] : [], content,
            ]));
        });
        return options?.tts && !pure.join('').trim().length ? '' : joinL1(packed);
    };
    const ok = async options => {
        const [curTime, curMsg] = [Date.now(), packMsg(options)];
        if (options?.onProgress && (
            curTime - lastSent < ctx.limit || lastMsg === curMsg
        )) { return; }
        [lastSent, lastMsg] = [curTime, curMsg];
        return await ctx.ok(curMsg, { md: true, ...options || {}, ...extra });
    };
    await ok(onProgress);
    for (let n of ctx.selectedAi) {
        pms.push((async () => {
            try {
                const resp = await ctx._.ai[n].send(ctx.text, ctx.carry, token => {
                    msgs[n] = `${(msgs[n] || '')}${token}`;
                    ok(onProgress);
                });
                ctxs[n] = resp.context;
                msgs[n] = ctx.session.config?.render === false
                    ? resp.response : resp.responseRendered;
                tts[n] = msgs[n].split('\n').some(x => /^```/.test(x)) ? '' : resp.spokenText;
                extra.buttons = resp?.suggestedResponses?.map?.(label => ({
                    label, text: `/bing ${label}`,
                }));
                return resp;
            } catch (err) {
                msgs[n] = err?.message || err;
                tts[n] = msgs[n];
                log(err);
            }
        })());
    }
    ctx.session._latest = {
        prompt: ctx.text,
        carry: ctx.carry,
        responses: await Promise.all(pms),
    };
    await ok();
    // ctx.responses = msgs; // save responses-to-user for next middleware
    ctx.tts = packMsg({ tts: true });
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 70,
    func: action,
};
