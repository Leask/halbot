import { bot } from '../index.mjs';

const action = async (ctx, next) => {
    if (!ctx.cmd.args) {
        return await ctx.ok('Please input your prompt.');
    }
    let [objMsg, tts, images] = [(await ctx.ok('💭'))[0], null, null];
    try {
        images = await ctx._.image.generate(ctx.cmd.args, { expected: 'URL' });
    } catch (err) {
        return await ctx.er(err.message || 'Error generating image.',
            { lastMessageId: objMsg.message_id });
    }
    await ctx.deleteMessage(objMsg.message_id);
    for (let image of images || []) {
        tts = image.tts || '';
        await ctx.image(image.data, { caption: image.caption || '' });
        await ctx.timeout();
    }
    await ctx.shouldSpeech(tts);
};

export const { name, run, priority, func, cmds, help } = {
    name: 'Dream',
    run: true,
    priority: 40,
    func: action,
    help: bot.lines([
        '¶ Use Google `Imagen` (default) or OpenAI `DALL-E` to generate images.',
        'Example 1: /dream a cat in a rocket',
        '¶ Use `Imagen` to generate images.',
        'Example 2: /imagen a cat in a car',
        '¶ Use `DALL-E` to generate images.',
        'Example: /dalle a cat on a bike',
    ]),
    cmds: {
        dream: 'Generate images with default model: /dream `PROMPT`',
        imagen: 'Generate images with `Imagen`: /imagen `PROMPT`',
        dalle: 'Generate images with `DALL-E`: /dalle `PROMPT`',
    },
};
