
const action = async (ctx, next) => {
    const prompt = ctx.session.prompts?.[ctx.cmdExt?.cmd]
        || ctx._.prompts?.[ctx.cmdExt?.cmd]?.prompt;
    if (prompt) {
        ctx.clear();
        ctx.context = { cmd: ctx.cmdExt.cmd, prompt };
        ctx.overwrite(prompt);
    }
    await next();
};

export const { run, priority, func, help, cmds } = {
    run: true,
    priority: 40,
    func: action,
};
