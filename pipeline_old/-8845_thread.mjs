import { alan, hal } from '../index.mjs';

const [EMIJI_FINISH] = ['☑️'];

// https://stackoverflow.com/questions/69924954/an-error-is-issued-when-opening-the-telebot-keyboard
const keyboards = [[
    { text: `/ai ${hal.EMOJI_BOT}` },
], [
    { text: '/help 🛟' },
    { text: '/set --tts=🔇' },
    { text: '/set --tts=🔊' },
]];

const action = async (ctx, next) => {
    // load functions
    const ok = async (message, options) => await ctx.ok(message, {
        ...options || {},
        ...options?.buttons ? {} : (options?.keyboards || { keyboards }),
    });
    // handle commands
    switch (ctx.cmd?.cmd) {
        case 'clearkb':
            return await ok(EMIJI_FINISH, { keyboards: [] });
        case 'reset':
            return await alan.resetSession(ctx.session.sessionId);
    }
    await next();
};

export const { name, run, priority, func, help, cmdx } = {
    name: 'Keyboard',
    run: true,
    priority: -8845,
    func: action,
    help: '¶ keyboard management.',
    cmdx: {},
};
