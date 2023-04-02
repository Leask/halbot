import { utilitas } from 'utilitas';

const onProgress = { onProgress: true };
const [YOU, BOT, LN2] = ['😸 You:', '🤖️ ', '\n\n'];
const [joinL1, joinL2] = [a => a.join(`${LN2}---${LN2}`), a => a.join(LN2)];
const enrich = name => name === 'Bing' ? `${name} (Sydney)` : name;

const action = async (ctx, next) => {
    if (!ctx.text) { return await next(); }
    const [selectedAi, msgs, tts, pms, extra]
        = [Object.keys(ctx.session.ai), {}, {}, [], {}];
    const multiAi = selectedAi.length > 1;
    let [lastMsg, lastSent] = ['', 0];
    const packMsg = options => {
        const packed = [...ctx.overwrite ? [joinL2([YOU, ctx.overwrite])] : []];
        const source = options?.tts ? tts : msgs;
        for (let name of selectedAi.length ? selectedAi : [ctx.firstAi]) {
            const defaultAi = name === ctx.firstAi;
            packed.push(joinL2([
                ...multiAi || !defaultAi || ctx.overwrite ? [`${BOT}${enrich(name)}:`] : [],
                options?.onProgress ? (
                    source[name] ? `${source[name].trim()} █` : '💬'
                ) : (source[name] || ''),
            ]));
        }
        return joinL1(packed);
    };
    const ok = async options => {
        const [curTime, curMsg] = [Date.now(), packMsg(options)];
        if (options?.onProgress && (
            curTime - lastSent < ctx.limit || lastMsg === curMsg
        )) { return; }
        [lastSent, lastMsg] = [curTime, curMsg];
        return await ctx.ok(curMsg, { ...options || {}, ...extra });
    };
    await ok(onProgress);
    for (let name of selectedAi.length ? selectedAi : [ctx.firstAi]) {
        if (utilitas.insensitiveCompare('/clear', ctx.text)) {
            ctx._.ai[name].clear(ctx.chatId);
            ctx.text = ctx._.hello;
        }
        pms.push((async () => {
            try {
                const resp = await ctx._.ai[name].send(
                    ctx.text, { session: ctx.chatId }, tkn => {
                        msgs[name] = `${(msgs[name] || '')}${tkn}`;
                        ok(onProgress);
                    }
                );
                msgs[name] = ctx.session.raw ? resp.response : resp.responseRendered;
                tts[name] = resp.spokenText;
                extra.buttons = resp?.suggestedResponses?.map?.(label => ({
                    label, text: `/bing ${label}`,
                }));
            } catch (err) {
                msgs[name] = err?.message || err;
                tts[name] = msgs[name];
                utilitas.log(err);
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
    priority: 30,
    name: 'ai',
    func: action,
};
