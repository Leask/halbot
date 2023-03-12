import { utilitas } from 'utilitas';

const iCmp = (stA, stB) => utilitas.insensitiveCompare(stA, stB, { w: true });
const getTranslatePrompt = (lang) => // https://github.com/yetone/bob-plugin-openai-translator/blob/main/src/main.js
    'You are a translation engine that can only translate text and cannot interpret it.'
    + ` Translate the following text into ${lang}: `;
const getPolishPrompt = () => // https://github.com/yetone/bob-plugin-openai-polisher/blob/main/src/main.js
    'Revise the following text to make them more clear, concise, and coherent.'
    + ' Please note that you need to list the changes and briefly explain why: ';

const action = async (bot) => {
    bot.ai && bot.use(async (ctx, next) => {
        if (ctx.end || !ctx.text) { return await next(); }
        ctx.session.ai || (ctx.session.ai = new Set());
        const [msgs, tts, onProgress, pms, matchReg]
            = [{}, {}, { onProgress: true }, [], /^\/([^\ ]*)(.*)$/ig];
        let [lastMsg, lastSent, firstBot] = ['', 0, null];
        const packMsg = (options) => {
            const packed = [...ctx.stt ? [`😸 You: ${ctx.stt}`] : []];
            const source = options?.tts ? tts : msgs;
            for (let name of ctx.session.ai.size ? ctx.session.ai : [firstBot]) {
                packed.push([
                    ...ctx.session.ai.size > 1 || name !== firstBot || ctx.stt ? [`🤖️ ${name}:`] : [],
                    options?.onProgress ? (
                        source[name] ? `${source[name].trim()} |` : '...'
                    ) : (source[name] || ''),
                ].join('\n\n'));
            }
            return packed.join('\n\n---\n\n');
        };
        const ok = async (options) => {
            const [curTime, curMsg] = [Date.now(), packMsg(options)];
            if (options?.onProgress && (
                curTime - lastSent < ctx.limit || lastMsg === curMsg
            )) { return; }
            [lastSent, lastMsg] = [curTime, curMsg];
            return await ctx.ok(curMsg, options);
        }
        const curAi = new Set();
        const cmd = ctx.text.split('\n')?.[0]?.replace(matchReg, '$1');
        for (let name in bot.ai) {
            firstBot || (firstBot = name);
            (iCmp(cmd, name) || cmd === '*') && curAi.add(name);
        }
        switch (cmd) {
            case '2en': ctx.text = ctx.text.replace('/2en ', getTranslatePrompt('English')); break;
            case '2zh': ctx.text = ctx.text.replace('/2zh', getTranslatePrompt('Traditional Chinese')); break;
            case '2zht': ctx.text = ctx.text.replace('/2zht', getTranslatePrompt('Traditional Chinese')); break;
            case '2zhs': ctx.text = ctx.text.replace('/2zhs', getTranslatePrompt('Simplified Chinese')); break;
            case '2fr': ctx.text = ctx.text.replace('/2fr', getTranslatePrompt('French')); break;
            case 'p': ctx.text = ctx.text.replace('/p', getPolishPrompt()); break;
        }
        curAi.size && (ctx.session.ai = curAi);
        ctx.session.ai.size
            && (ctx.text = ctx.text.replace(matchReg, '$2').trim() || bot.hello);
        await ok(onProgress);
        for (let name of ctx.session.ai.size ? ctx.session.ai : [firstBot]) {
            if (iCmp('/clear', ctx.text)) {
                bot.ai[name].clear(ctx.chatId);
                ctx.text = bot.hello;
            }
            pms.push((async () => {
                try {
                    const resp = await bot.ai[name].send(
                        ctx.text, { session: ctx.chatId },
                        tkn => {
                            msgs[name] = `${(msgs[name] || '')}${tkn}`;
                            ok(onProgress);
                        }
                    );
                    msgs[name] = resp.responseRendered;
                    tts[name] = resp.spokenText;
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
    });
};

export const { run, priority, func } = {
    run: true,
    priority: 10,
    name: 'ai',
    func: action,
};
