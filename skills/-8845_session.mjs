import { alan, bot, uoid, utilitas } from 'utilitas';

const EMIJI_FINISH = '☑️';

// moved to help and configs
const keyboards = [[
    { text: '/clear this thread 🆑' },
    { text: '/clearall threads 🔄' }
], [
    { text: '/end this thread ❎' },
    { text: '/list threads 🧵' },
    { text: '/new thread ✨' },
], [
    { text: '/help 🛟' },
    { text: '/ttsoff 🔇' },
    { text: '/ttson 🔊' },
]];

const action = async (ctx, next) => {
    // reset session storage
    const resetSession = () => ctx.session.sessionId = uoid.create({
        type: `ALAN_SESSION_${ctx.chatId}`, security: true,
    });
    const resetSessions = () => ctx.session.sessions = [];
    const resetContext = context => ctx.session.context = context || {};
    const now = Date.now();
    ctx.session.sessionId || resetSession();
    ctx.session.sessions || resetSessions();
    ctx.session.context || resetContext();
    // load functions
    const switchSession = async () => {
        let resp;
        for (const session of ctx.session.sessions) {
            if (session.id === ctx.session.sessionId) {
                ctx.session.sessionId = session.id;
                ctx.session.context = session.context;
                session.touchedAt = now;
                resp = session;
                break;
            }
        }
        if (!resp) {
            ctx.session.sessions.push(resp = {
                id: resetSession(),
                createdAt: now, touchedAt: now, context: {},
            });
            await ctx.clear();
        }
        ctx.carry = { sessionId: ctx.session.sessionId };
        return resp;
    };
    const defauleTitle = i => (ctx.session.sessions[i]?.context?.cmd
        ? `\`${ctx.session.sessions[i].context.cmd}\` ` : 'Untitled thread '
    ) + `(${new Date(ctx.session.sessions[i].createdAt).toLocaleString()})`;
    const getLabel = i => ctx.session.sessions[i].label || defauleTitle(i);
    const findSession = id => {
        for (let i = 0; i < ctx.session.sessions.length; i++) {
            if (ctx.session.sessions[i].id === utilitas.trim(id)) {
                return i;
            }
        }
    };
    ctx.clear = async context => {
        await alan.resetSession(
            ctx.session.sessionId,
            // { systemPrompt: context?.prompt } // @todo: switch to real system prompt
        );
        resetContext(context);
        const id = findSession(ctx.session.sessionId);
        ctx.cmd.ignored = true;
        ctx.session.sessions?.[id] && (
            ctx.session.sessions[id].context = ctx.session.context
        );
        ctx.hello(context?.prompt);
    };
    const ok = async (message, options) => await ctx.ok(message, {
        ...options || {}, ...options?.buttons ? {} : { keyboards }
    });
    // handle commands
    const sendList = async (names, lastMsgId) => {
        lastMsgId = lastMsgId || ctx.update?.callback_query?.message?.message_id;
        const message = `🧵 Thread${ctx.session.sessions.length > 0 ? 's' : ''}:`;
        const buttons = ctx.session.sessions.map((x, i) => {
            names?.[x.id]
                && (ctx.session.sessions[i].label = names[x.id])
                && (ctx.session.sessions[i].labelUpdatedAt = now);
            return {
                label: `${ctx.session.sessions[i].id === ctx.session.sessionId
                    ? `${EMIJI_FINISH} ` : ''}${getLabel(i)}`,
                text: `/switch ${x.id}`,
            };
        });
        return await ok(message, { lastMessageId: lastMsgId, buttons });
    };
    const switched = async preTitle => await ok(
        `${preTitle ? `❎ Thread ended: \`${preTitle}\`.\n\n` : ''}` +
        `${EMIJI_FINISH} Thread switched: \`${getLabel(findSession(ctx.session.sessionId))}\`.`
    );
    switch (ctx.cmd?.cmd) {
        case 'clear': await ctx.clear(); break;
        case 'clearall': resetSessions(); break;
        case 'new': resetSession(); break;
        case 'list':
            const resp = await sendList();
            utilitas.ignoreErrFunc(async () => {
                const sNames = await alan.analyzeSessions(
                    ctx.session.sessions.filter(
                        x => (x.labelUpdatedAt || 0) < x.touchedAt
                    ).map(x => x.id), { ignoreRequest: bot.HELLO }
                );
                return await sendList(sNames, resp[0]?.message_id);
            });
            return resp;
        case 'end':
            const id = findSession(
                ctx.cmd.args.startsWith('ALAN_SESSION_')
                && utilitas.trim(ctx.cmd.args) || ctx.session.sessionId
            );
            let preTitle = '';
            ctx.session.sessions?.[id] && (preTitle = getLabel(id))
                && (ctx.session.sessions.splice(id, 1));
            const sorted = ctx.session.sessions.slice().sort(
                (x, y) => y.touchedAt - x.touchedAt
            );
            ctx.session.sessionId = sorted?.[0]?.id;
            await switchSession();
            return await switched(preTitle);
        case 'switch':
            ctx.session.sessionId = utilitas.trim(ctx.cmd.args);
            await switchSession();
            return await sendList();
        case 'factory':
        case 'reset':
            await alan.resetSession(ctx.session.sessionId);
            break;
    }
    await switchSession();
    await next();
};

export const { name, run, priority, func, help, cmds, cmdx } = {
    name: 'session',
    run: true,
    priority: -8845,
    func: action,
    help: '',
    cmdx: {
        new: 'Add a session.',
        end: 'Delete a session.',
        switch: 'Switch to a session.',
        clear: 'Clear current AI conversation session and start a new one.',
        clearall: 'Clear all AI conversation sessions.',
        list: 'List all AI conversation sessions.',
    },
};
