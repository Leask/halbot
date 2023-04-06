import { bot, shot, utilitas } from 'utilitas';

const action = async (ctx, next) => {
    let prompt = ctx.session.prompts?.[ctx.cmdExt?.cmd] || (
        ctx._.prompts[ctx.cmdExt?.cmd] && ctx._.prompts[ctx.cmdExt.cmd].prompt
    );
    if (prompt) {
        ctx.clear();
        ctx.overwrite = ctx.text = prompt;
    }
    await next();
};

export const { run, priority, func, help, cmds } = {
    run: true,
    priority: 40,
    func: action,
};
