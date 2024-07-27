import { alan, bot, utilitas } from 'utilitas';

const onProgress = { onProgress: true };
const [joinL1, joinL2] = [a => a.join(LN2), a => a.join(LN2)];
const enrich = name => name === 'VERTEX' ? 'Gemini' : name;
const log = content => utilitas.log(content, import.meta.url);
const [BOT, BOTS, LN2]
    = [`${bot.EMOJI_BOT} `, { ChatGPT: '⚛️', Gemini: '♊️', Mistral: 'Ⓜ️' }, '\n\n'];

const action = async (ctx, next) => {
    if (!ctx.prompt) { return await next(); }
    const [YOU, msgs, tts, pms, extra] = [`${ctx.avatar} You:`, {}, {}, [], {}];
    let [lastMsg, lastSent] = [null, 0];
    const packMsg = options => {
        const said = !options?.tts && ctx.result ? ctx.result : '';
        const packed = [
            ...ctx.carry?.threadInfo, ...said ? [joinL2([YOU, said])] : [],
        ];
        const source = options?.tts ? tts : msgs;
        const pure = [];
        ctx.selectedAi.map(n => {
            const content = source[n] || '';
            pure.push(content);
            packed.push(joinL2([
                ...(ctx.multiAi || !ctx.isDefaultAi(n) || said) && !options?.tts
                    ? [`${BOTS[n]} ${enrich(n)}:`] : [], content
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
        const cmd = ctx.session.context?.cmd;
        options?.final && cmd && (extra.buttons = [{
            label: `❎ End context: \`${cmd}\``, text: '/clear',
        }]);
        return await ctx.ok(curMsg, {
            ...ctx.carry.keyboards ? { keyboards: ctx.carry.keyboards } : {},
            md: true, ...extra, ...options || {},
        });
    };
    ctx.carry.threadInfo.length || await ok(onProgress);
    for (let n of ctx.selectedAi) {
        pms.push((async () => {
            try {
                const resp = await alan.talk(ctx.prompt, {
                    engine: ctx._.ai[n].engine, ...ctx.carry,
                    stream: async r => {
                        msgs[n] = r[0].text;
                        ctx.carry.threadInfo.length || await ok(onProgress);
                    },
                });
                msgs[n] = ctx.session.config?.render === true
                    ? resp.rendered : resp.text;
                tts[n] = ctx.selectedAi.length === 1
                    && !msgs[n].split('\n').some(x => /^\s*```/.test(x))
                    ? resp.spoken : '';
                return resp;
            } catch (err) {
                msgs[n] = err?.message || err;
                tts[n] = msgs[n];
                log(err);
            }
        })());
    }
    await Promise.all(pms);
    await ok({ final: true });
    ctx.tts = packMsg({ tts: true });
    await next();
};

export const { name, run, priority, func } = {
    name: 'Chat',
    run: true,
    priority: 70,
    func: action,
};
