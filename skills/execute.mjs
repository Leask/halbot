
const action = async (ctx, next) => {
    const cmd = ctx.cmd?.cmd;
    const prompt = ctx.session.prompts?.[cmd] || ctx._.prompts?.[cmd]?.prompt;
    if (prompt) {
        ctx.clear();
        ctx.context = { cmd, prompt };
        ctx.collect(prompt);
    }
    await next();
};

export const { run, priority, func, help, cmds } = {
    run: true,
    priority: 40,
    func: action,
};
