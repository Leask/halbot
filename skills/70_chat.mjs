import { alan, bot, storage, utilitas } from 'utilitas';

const onProgress = { onProgress: true };
const [joinL1, joinL2] = [a => a.join(LN2), a => a.join(LN2)];
const log = content => utilitas.log(content, import.meta.url);
const enrich = m => m ? ` ${BOTS[m.split(':')[0]]
    ? `| ${BOTS[m.split(':')[0]]} ${m}` : `(${m})`}` : '';
const [BOT, BOTS, LN2] = [`${bot.EMOJI_BOT} `, {
    ChatGPT: '⚛️', Gemini: '♊️', Claude: '✴️', Ollama: '🦙', 'deepseek-r1': '🐳',
    Azure: '☁️',
}, '\n\n'];

const action = async (ctx, next) => {
    if (!ctx.prompt && !ctx.carry.attachments.length) { return await next(); }
    const [YOU, msgs, tts, rsm, pms, extra, firstResp, lock] = [
        `${ctx.avatar} You:`, {}, {}, {}, [], { buttons: [] }, Date.now(),
        1000 * 5
    ];
    let [lastMsg, lastSent, references, audio] = [null, 0, null, null];
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
            packed.push(joinL2([...options?.tts ? [] : [
                `${BOTS[n]} ${n}${enrich(rsm[n])}:`
            ], content]));
        });
        return pure.join('').trim().length ? joinL1(packed) : '';
    };
    const ok = async options => {
        const [curTime, curMsg] = [Date.now(), packMsg(options)];
        if (options?.onProgress && (
            curTime - lastSent < ctx.limit || lastMsg === curMsg
        )) { return; }
        [lastSent, lastMsg] = [curTime + lock, curMsg];
        const cmd = ctx.session.context?.cmd;
        if (options?.final) {
            (references?.links || []).map((x, i) => extra.buttons.push({
                label: `${i + 1}. ${x.title}`, url: x.uri,
            }));
            cmd && (extra.buttons.push({
                label: `❎ End context: \`${cmd}\``, text: '/clear',
            }));
        }
        const resp = await ctx.ok(curMsg, {
            ...ctx.carry.keyboards ? { keyboards: ctx.carry.keyboards } : {},
            md: true, ...extra, ...options || {},
        });
        lastSent = curTime;
        return resp;
    };
    ctx.carry.threadInfo.length || await ok(onProgress);
    for (const n of ctx.selectedAi) {
        pms.push((async ai => {
            try {
                const resp = await alan.talk(ctx.prompt, {
                    aiId: ai, ...ctx.carry, stream: async r => {
                        msgs[ai] = r.text;
                        ctx.carry.threadInfo.length || ok(onProgress);
                    },
                });
                references = resp.references;
                audio = resp.audio;
                msgs[ai] = resp.text;
                tts[ai] = ctx.selectedAi.length === 1
                    && !msgs[ai].split('\n').some(x => /^\s*```/.test(x))
                    ? resp.spoken : '';
                rsm[ai] = resp.model;
                for (let img of resp?.images || []) {
                    await ctx.image(img.data, { caption: `🎨 by ${resp.model}` });
                    await ctx.timeout();
                }
                return resp;
            } catch (err) {
                msgs[ai] = `⚠️ ${err?.message || err}`;
                tts[ai] = null;
                rsm[ai] = null;
                log(err);
            }
        })(n));
    }
    await Promise.all(pms);
    await ok({ final: true });
    ctx.tts = audio || packMsg({ tts: true });
    await next();
};

export const { name, run, priority, func } = {
    name: 'Chat',
    run: true,
    priority: 70,
    func: action,
};
