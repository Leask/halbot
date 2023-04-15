
const action = async (ctx, next) => {
    const cmd = ctx.cmd?.cmd;
    if (!ctx.context) {
        const prompt = ctx.session.prompts?.[cmd] || ctx._.prompts?.[cmd]?.prompt;
        prompt && (ctx.context = { cmd, prompt });
    }
    ctx.context && await ctx.clear(ctx.context);
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 50,
    func: action,
};
