import { bot } from 'utilitas';

const action = async (ctx, next) => {
    if (!ctx.cmd.args) {
        return await ctx.ok('Please input your prompt.');
    }
    const objMsg = (await ctx.ok('💭'))[0];
    const images = await ctx._.image.generate(ctx.cmd.args, { expected: 'URL' });
    await ctx.deleteMessage(objMsg.message_id);
    for (let image of images) {
        await ctx.image(image.url, { caption: image.revised_prompt });
        await ctx.shouldSpeech(image.revised_prompt)
    }
};

export const { name, run, priority, func, cmds, help } = {
    name: 'Dream',
    run: true,
    priority: 40,
    func: action,
    help: bot.lines([
        'Use DALL-E to generate images.',
        'Example: /dream a cat',
    ]),
    cmds: {
        dream: 'Use DALL-E to generate images: /dream `PROMPT`',
    },
};
