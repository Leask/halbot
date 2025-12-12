import { bot, hal, utilitas } from '../index.mjs';

const action = async (ctx, next) => {
    await ctx.shouldSpeech();
    await next();
};

export const { name, run, priority, func, help, args } = {
    name: 'TTS', run: true, priority: 200, func: action,
    help: bot.lines([
        '¶ When enabled, the bot will speak out the answer if available.',
        'Example 1: /set --tts on',
        'Example 2: /set --tts off',
    ]), args: {
        tts: {
            type: 'string', short: 't', default: hal.ON,
            desc: `\`(${hal.BINARY_STRINGS.join(', ')})\` Enable/Disable TTS. Default \`${hal.ON}\` except in groups.`,
            validate: utilitas.humanReadableBoolean,
        },
    },
};
