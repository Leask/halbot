const action = async (ctx, next) => {
    if (ctx.message?.voice?.mime_type === 'audio/ogg') {
        ctx.avatar = '🗣️';
    } else if (ctx.update?.[ctx.type]?.data) {
        ctx.avatar = '🔘';
    } else if (ctx.update?.message?.poll) {
        ctx.avatar = '📊';
    } else if (ctx?.cmd?.cmd || ctx?.cmdExt?.cmd) {
        ctx.avatar = '🚀';
    } else {
        ctx.avatar = '😸';
    }
    await next();
};

export const { run, priority, func } = {
    run: true,
    priority: 70,
    func: action,
};
