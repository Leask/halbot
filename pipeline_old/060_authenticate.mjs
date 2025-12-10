// https://stackoverflow.com/questions/50204633/allow-bot-to-access-telegram-group-messages
{
    run: true, priority: -8920, name: 'authenticate', func: async (ctx, next) => {
        if (!await ctx.shouldReply()) { return; }                               // if chatType is not in whitelist, exit.
        if (!ctx._.private) { return await next(); }                            // if not private, go next.
        if (utilitas.insensitiveHas(ctx._.private, ctx.chatId)                           // auth by chatId
            || (ctx?.from && utilitas.insensitiveHas(ctx._.private, ctx.from.id))) {     // auth by userId
            return await next();
        }
        if (ctx.chatType !== PRIVATE && (                                       // 1 of the group admins is in whitelist
            await ctx.telegram.getChatAdministrators(ctx.chatId)
        ).map(x => x.user.id).some(a => utilitas.insensitiveHas(ctx._.private, a))) {
            return await next();
        }
        if (ctx._.homeGroup && utilitas.insensitiveHas([                                 // auth by homeGroup
            'creator', 'administrator', 'member' // 'left'
        ], (await utilitas.ignoreErrFunc(async () => await ctx.telegram.getChatMember(
            ctx._.homeGroup, ctx.from.id
        )))?.status)) { return await next(); }
        if (ctx._.auth && await ctx._.auth(ctx)) { return await next(); }       // auth by custom function
        await ctx.ok('😿 Sorry, I am not allowed to talk to strangers.');
    },
}
