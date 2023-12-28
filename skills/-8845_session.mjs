import { alan } from 'utilitas';

const action = async (ctx, next) => {
    const resetContext = context => ctx.session.context = context || {}
    ctx.session.context || resetContext();
    ctx.carry = { sessionId: `ALAN_SESSION_${ctx.chatId}` };
    ctx.clear = async context => {
        await alan.resetSession(
            ctx.carry.sessionId, // { systemPrompt: context?.prompt } @todo! // switch to real system prompt
        );
        resetContext(context);
        ctx.hello(context?.prompt);
    };
    switch (ctx.cmd?.cmd) {
        case 'clear':
            await ctx.clear();
            break;
        case 'factory':
        case 'reset':
            await alan.resetSession(ctx.carry.sessionId);
            break;
    }
    await next();
};

export const { name, run, priority, func, help, cmds, cmdx } = {
    name: 'session',
    run: true,
    priority: -8845,
    func: action,
    help: '',
    cmdx: {},
};
