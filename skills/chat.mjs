import { utilitas } from 'utilitas';

const onProgress = { onProgress: true };
const [YOU, BOT, LN2] = ['😸 You:', '🤖️ ', '\n\n'];
const [joinL1, joinL2] = [a => a.join(LN2), a => a.join(LN2)];
const enrich = name => name === 'Bing' ? `${name} (Sydney)` : name;
const log = content => utilitas.log(content, import.meta.url);

const action = async (ctx, next) => {
    if (!ctx.text) { return await next(); }
    const [msgs, tts, pms, extra] = [{}, {}, [], {}];
    let [lastMsg, lastSent] = ['', 0];
    const packMsg = options => {
        const packed = [...ctx._text && !options?.tts ? [joinL2([YOU, ctx.text])] : []];
        const source = options?.tts ? tts : msgs;
        ctx.selectedAi.map(n => packed.push(joinL2([
            ...ctx.multiAi || !ctx.isDefaultAi(n) || ctx._text ? [`${BOT}${enrich(n)}:`] : [],
            options?.onProgress ? (
                source[n] ? `${source[n].trim()} █` : '💬'
            ) : (source[n] || ''),
        ])));
        return joinL1(packed);
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
                const resp = await ctx._.ai[n].send(
                    ctx.text, { session: ctx.chatId }, tkn => {
                        msgs[n] = `${(msgs[n] || '')}${tkn}`;
                        ok(onProgress);
                    }
                );
                msgs[n] = ctx.session.config?.render === false
                    ? resp.response : resp.responseRendered;
                tts[n] = resp.spokenText;
                extra.buttons = resp?.suggestedResponses?.map?.(label => ({
                    label, text: `/bing ${label}`,
                }));
            } catch (err) {
                msgs[n] = err?.message || err;
                tts[n] = msgs[n];
                log(err);
            }
        })());
    }
    await Promise.all(pms);
    await ok();
    ctx.tts = packMsg({ tts: true });
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 60,
    func: action,
};
