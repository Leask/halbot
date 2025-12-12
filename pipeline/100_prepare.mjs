import { alan, utilitas } from '../index.mjs';

const collectAttachments = async ctx => {
    ctx._.attachments = [];
    // print(ctx.collected);
    for (const x of ctx._.collected.filter(x => x.type === 'ATTACHMENT')) {
        let notSupported = false;
        ctx._.ai.map(y => {
            const ai = ctx._.ais.find(z => z.id === y);
            if (!ai.model.supportedMimeTypes.includes(x.content?.mime_type)) {
                notSupported = true;
            }
        });
        notSupported || ctx._.attachments.push(x.content);
    }
};

const action = async (ctx, next) => {
    // avatar
    if (ctx._.result) {
        ctx._.avatar = '⚙️';
    } else if (ctx.m?.data) {
        ctx._.avatar = '🔘'; ctx._.result = utilitas.trim(ctx.txt);
    } else if (ctx.m?.poll) {
        ctx._.avatar = '📊';
    } else if (ctx.cmd?.cmd && !ctx.cmd?.ignored) {
        ctx._.avatar = '🚀'; ctx._.result = utilitas.trim(ctx.txt);
    } else {
        ctx._.avatar = '😸';
    }
    // collect input
    await collectAttachments(ctx);
    const maxInputTokens = await alan.getChatPromptLimit({ aiId: ctx._.ai })
        - await alan.getChatAttachmentCost({ aiId: ctx._.ai }) * ctx._.attachments.length;
    const additionInfo = ctx._.collected.filter(
        x => String.isString(x.content)
    ).map(x => x.content).join('\n').split(' ').filter(x => x);
    ctx._.prompt = ctx._.text ? (ctx._.text + '\n\n') : '';
    while (await alan.countTokens(
        `${ctx._.prompt}${additionInfo?.[0] || ''}`
    ) < maxInputTokens && additionInfo.length) {
        ctx._.prompt += `${additionInfo.shift()} `;
    }
    // rag
    ctx._.sessionId = ctx._.chatId; // THIS LINE IS IMPORTANT
    if (ctx._.prompt) {
        const ragResp = await ctx.recall(ctx._.prompt);
        const ctxResp = await ctx.getContext();
        print(ragResp, ctxResp);
    }
    // prompt
    ctx._.prompt = utilitas.trim(ctx._.prompt);
    additionInfo.filter(x => x).length && (ctx._.prompt += '...');
    // next
    await next();
};

export const { name, run, priority, func } = {
    name: 'Prepare',
    run: true,
    priority: 100,
    func: action,
};
