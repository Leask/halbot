import { utilitas } from 'utilitas';

const onProgress = { onProgress: true };
const [YOU, BOT, LN2] = ['😸 You:', '🤖️ ', '\n\n'];
const [joinL1, joinL2] = [a => a.join('${LN2}---${LN2}'), a => a.join(LN2)];
const enrich = name => name === 'Bing' ? `${name} (Sydney)` : name;

const action = async (ctx, next) => {
    if (ctx.end || !ctx.text) { return await next(); }
    const [multiAi, msgs, tts, pms, extra]
        = [ctx.session.ai.size > 1, {}, {}, [], {}];
    let [lastMsg, lastSent] = ['', 0];
    const packMsg = (options) => {
        const packed = [...ctx.stt ? joinL2([YOU, ctx.stt]) : []];
        const source = options?.tts ? tts : msgs;
        for (let name of ctx.session.ai.size ? ctx.session.ai : [ctx.firstAi]) {
            const defaultAi = name === ctx.firstAi;
            packed.push(joinL2([
                ...multiAi || !defaultAi || ctx.stt ? [`${BOT}${enrich(name)}:`] : [],
                options?.onProgress ? (
                    source[name] ? `${source[name].trim()} |` : '...'
                ) : (source[name] || ''),
            ]));
        }
        return joinL1(packed);
    };
    const ok = async (options) => {
        const [curTime, curMsg] = [Date.now(), packMsg(options)];
        if (options?.onProgress && (
            curTime - lastSent < ctx.limit || lastMsg === curMsg
        )) { return; }
        [lastSent, lastMsg] = [curTime, curMsg];
        return await ctx.ok(curMsg, { ...options || {}, ...extra });
    };
    await ok(onProgress);
    for (let name of ctx.session.ai.size ? ctx.session.ai : [ctx.firstAi]) {
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
                extra.textButtons = resp?.suggestedResponses?.map?.(text => ({
                    text, data: `/bing ${text}`
                }));
            } catch (err) {
                msgs[name] = `[ERROR] ${err?.message || err}`;
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
