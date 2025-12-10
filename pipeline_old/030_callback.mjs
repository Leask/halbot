{
    run: true, priority: -8945, name: 'callback', func: async (ctx, next) => {
        if (ctx.type === 'callback_query') {
            const data = utilitas.parseJson(ctx.update[ctx.type].data);
            const cb = ctx.session.callback.filter(x => x.id === data?.callback)[0];
            if (cb?.text) {
                log(`Callback: ${cb.text}`); // Avoid ctx.text interference:
                ctx.collect(cb.text, null, { refresh: true });
            } else {
                return await ctx.er(
                    `Command is invalid or expired: ${ctx.m.data}`
                );
            }
        }
        await next();
    },
}
