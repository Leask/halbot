import { bot, utilitas } from 'utilitas';

const onProgress = { onProgress: true };
const [BOT, LN2] = [`${bot.EMOJI_BOT} `, '\n\n'];
const [joinL1, joinL2] = [a => a.join(LN2), a => a.join(LN2)];
const enrich = name => name === 'Bing' ? `${name} (Sydney)` : name;
const log = content => utilitas.log(content, import.meta.url);

const action = async (ctx, next) => {
    if (!ctx.prompt) { return await next(); }
    const [YOU, msgs, tts, pms, extra] = [`${ctx.avatar} You:`, {}, {}, [], {}];
    let [lastMsg, lastSent] = [null, 0];
    const packMsg = options => {
        const said = !options?.tts && ctx.result ? ctx.result : '';
        const packed = [...said ? [joinL2([YOU, said])] : []];
        const source = options?.tts ? tts : msgs;
        const pure = [];
        ctx.selectedAi.map(n => {
            const content = source[n] || '';
            const cmd = ctx.session.context[n]?.cmd;
            const context = cmd && ` > \`${cmd}\` (exit by /clear)` || '';
            pure.push(content);
            packed.push(joinL2([
                ...ctx.multiAi || !ctx.isDefaultAi(n) || said || context
                    ? [`${BOT}${enrich(n)}${context}:`] : [], content,
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
                const response = await ctx._.ai[n].send(ctx.prompt, {
                    ...ctx.carry,
                    session: ctx.session.latest[n]?.response,
                    promptPrefix: ctx.session.context[n]?.prompt,
                }, token => {
                    msgs[n] = `${(msgs[n] || '')}${token}`;
                    ok(onProgress);
                });
                msgs[n] = ctx.session.config?.render === false
                    ? response.response : response.responseRendered;
                tts[n] = msgs[n].split('\n').some(x => /^```/.test(x)) ? '' : response.spokenText;
                extra.buttons = response?.suggestedResponses?.map?.(label => ({
                    label, text: `/bing@${ctx.botInfo.username} ${label}`,
                }));
                return ctx.session.latest[n] = {
                    carry: ctx.carry, context: ctx.session.context[n],
                    prompt: ctx.prompt, response,
                };
            } catch (err) {
                msgs[n] = err?.message || err;
                tts[n] = msgs[n];
                log(err);
            }
        })());
    }
    await Promise.all(pms);
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
