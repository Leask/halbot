import { hal, utilitas } from '../index.mjs';

// https://stackoverflow.com/questions/50204633/allow-bot-to-access-telegram-group-messages
const action = async (ctx, next) => {
    if (!await ctx.shouldReply()) { return; }                                   // if chatType is not in whitelist, exit.
    if (!hal._.private) { return await next(); }                            // if not private, go next.
    if (utilitas.insensitiveHas(hal._.private, ctx._.chatId) || (           // auth by chatId
        ctx._.message?.from?.id && utilitas.insensitiveHas(                     // auth by userId
            hal._.private, ctx._.message?.from?.id
        ))) {
        return await next();
    }
    if (ctx._.chatType !== hal.PRIVATE && (                                     // 1 of the group admins is in whitelist
        await ctx.telegram.getChatAdministrators(ctx._.chatId)
    ).map(x => x.user.id).some(a => utilitas.insensitiveHas(ctx._.private, a))) {
        return await next();
    }
    if (hal._.homeGroup && utilitas.insensitiveHas([                        // auth by homeGroup
        'creator', 'administrator', 'member' // 'left'
    ], (await utilitas.ignoreErrFunc(async (
    ) => await ctx.telegram.getChatMember(
        hal._.homeGroup, ctx._.message?.from?.id
    )))?.status)) { return await next(); }
    if (hal._.auth && await hal._.auth(ctx)) { return await next(); }   // auth by custom function
    await ctx.ok('😿 Sorry, I am not allowed to talk to strangers.');
};

export const { name, run, priority, func } = {
    name: 'Auth', run: true, priority: 50, func: action,
};
