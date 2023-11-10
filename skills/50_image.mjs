import { bot } from 'utilitas';

const action = async (ctx, next) => {
    if (!ctx.cmd.args) {
        return await ctx.ok('Please input your prompt.');
    }
    const objMsg = (await ctx.ok('✍️'))[0];
    const images = await ctx._.image.generate(ctx.cmd.args, { expected: 'URL' });
    await ctx.deleteMessage(objMsg.message_id);
    for (let image of images) {
        await ctx.image(image.url, { caption: image.revised_prompt });
        await ctx.speech(image.revised_prompt);
    }
};

export const { name, run, priority, func, cmds, help } = {
    name: 'Image',
    run: true,
    priority: 50,
    func: action,
    help: bot.lines([
        '¶ Use DALL-E to generate images.',
        'Example 1: /image a cat',
    ]),
    cmds: {
        image: 'Use DALL-E to generate images: /image `PROMPT`',
    },
};
