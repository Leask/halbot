{
    run: true, priority: 8960, name: 'text-to-speech', func: async (ctx, next) => {
        await ctx.shouldSpeech();
        await next();
    }, help: bot.lines([
        '¶ When enabled, the bot will speak out the answer if available.',
        'Example 1: /set --tts on',
        'Example 2: /set --tts off',
    ]), args: {
        tts: {
            type: 'string', short: 't', default: ON,
                desc: `\`(${BINARY_STRINGS.join(', ')})\` Enable/Disable TTS. Default \`${ON}\` except in groups.`,
                    validate: utilitas.humanReadableBoolean,
        },
    },
}
