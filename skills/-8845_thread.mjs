import { alan, hal, uoid, utilitas } from '../index.mjs';

const [EMIJI_FINISH, END, NEW, THREAD, CLR] = ['☑️', '❎', '✨', '🧵', '🆑'];

const [CREATED, SWITCHED] = [
    `${NEW} Thread created: `, `${EMIJI_FINISH} Thread switched: `
];

// https://stackoverflow.com/questions/69924954/an-error-is-issued-when-opening-the-telebot-keyboard
const keyboards = [[
    { text: `/ai ${hal.EMOJI_BOT}` },
    { text: `/new ${NEW}` },
    { text: `/end ${END}` },
    { text: `/list ${THREAD}` },
], [
    { text: '/help 🛟' },
    { text: '/set --tts=🔇' },
    { text: '/set --tts=🔊' },
]];

const action = async (ctx, next) => {
    // reset session storage
    const resetSession = () => ctx.session.sessionId = uoid.create({
        type: `ALAN_SESSION_${ctx.chatId}`, security: true,
    });
    const resetSessions = () => ctx.session.sessions = [];
    const resetContext = context => ctx.session.context = context || {};
    const now = Date.now();
    const preSessionId = ctx.session.sessionId || resetSession();
    ctx.session.sessions || resetSessions();
    ctx.session.context || resetContext();
    ctx.carry || (ctx.carry = {});
    ctx.carry.threadInfo || (ctx.carry.threadInfo = []);
    // load functions
    ctx.clear = async context => {
        await alan.resetSession(
            ctx.session.sessionId,
            { systemPrompt: context?.prompt } // @todo: switch to real system prompt
        );
        resetContext(context);
        const id = findSession(ctx.session.sessionId);
        ctx.cmd && (ctx.cmd.ignored = true);
        ctx.session.sessions?.[id] && (
            ctx.session.sessions[id].context = ctx.session.context
        );
        ctx.hello();
    };
    const switchSession = async () => {
        let resp;
        for (const session of ctx.session.sessions) {
            if (session.id === ctx.session.sessionId) {
                ctx.session.sessionId = session.id;
                ctx.session.context = session.context;
                session.touchedAt = now;
                resp = session;
                preSessionId !== ctx.session.sessionId
                    && ctx.carry.threadInfo.push(SWITCHED
                        + getLabel(findSession(ctx.session.sessionId)));
                break;
            }
        }
        if (!resp) {
            ctx.session.sessions.push(resp = {
                id: resetSession(),
                createdAt: now, touchedAt: now, context: {},
            });
            ctx.carry.threadInfo.push(CREATED
                + `\`${getLabel(findSession(ctx.session.sessionId))}\``);
            await ctx.clear();
        }
        ctx.carry.sessionId = ctx.session.sessionId;
        ctx.carry.threadInfo.length && (ctx.carry.keyboards = keyboards);
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
    const ok = async (message, options) => await ctx.ok(message, {
        ...options || {},
        ...options?.buttons ? {} : (options?.keyboards || { keyboards }),
    });
    const listThreads = async (names, lastMsgId) => {
        lastMsgId = lastMsgId || ctx.update?.callback_query?.message?.message_id;
        const message = `${THREAD} Thread${ctx.session.sessions.length > 0 ? 's' : ''}:`;
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
    const switched = async (preTitle, newThread) => await ok(
        `${preTitle ? `${END} Thread ended: \`${preTitle}\`\n\n` : ''}`
        + (newThread ? CREATED : SWITCHED)
        + `\`${getLabel(findSession(ctx.session.sessionId))}\``,
        { pageBreak: true }
    );
    // handle commands
    switch (ctx.cmd?.cmd) {
        case 'clearkb':
            return await ok(EMIJI_FINISH, { keyboards: [] });
        case 'clear':
            ctx.carry.threadInfo.push(`${CLR} Thread cleared: \``
                + `${getLabel(findSession(ctx.session.sessionId))}\``);
            await ctx.clear();
            break;
        case 'endall':
            ctx.carry.threadInfo.push(`🔄 All threads have been cleared.`);
            resetSessions();
            break;
        case 'new':
            resetSession();
            break;
        case 'list':
            const resp = await listThreads();
            utilitas.ignoreErrFunc(async () => {
                const sNames = await alan.analyzeSessions(
                    ctx.session.sessions.filter(
                        x => (x.labelUpdatedAt || 0) < x.touchedAt
                    ).map(x => x.id), { ignoreRequest: hal.HELLO }
                );
                return await listThreads(sNames, resp[0]?.message_id);
            }, { log: true });
            return resp;
        case 'end':
            const id = findSession(
                ctx.cmd.args.startsWith('ALAN_SESSION_')
                && utilitas.trim(ctx.cmd.args) || ctx.session.sessionId
            );
            let preTitle = '';
            ctx.session.sessions?.[id] && (preTitle = getLabel(id))
                && (ctx.session.sessions.splice(id, 1));
            const newThread = ctx.session.sessions.length === 0
            const sorted = ctx.session.sessions.slice().sort(
                (x, y) => y.touchedAt - x.touchedAt
            );
            ctx.session.sessionId = sorted?.[0]?.id;
            await switchSession();
            return await switched(preTitle, newThread);
        case 'switch':
            ctx.session.sessionId = utilitas.trim(ctx.cmd.args);
            await switchSession();
            await listThreads();
            return await switched();
        case 'factory':
        case 'reset':
            await alan.resetSession(ctx.session.sessionId);
            break;
    }
    await switchSession();
    await next();
};

export const { name, run, priority, func, help, cmdx } = {
    name: 'Thread',
    run: true,
    priority: -8845,
    func: action,
    help: '¶ Thread management.',
    cmdx: {
        clear: 'Clear current thread.',
        end: 'End current thread.',
        endall: 'End all threads.',
        list: 'List all threads.',
        new: 'Create a new thread.',
        switch: 'Switch to a thread. Usage: /switch `THREAD_ID`.',
    },
};
