import { bot } from '../index.mjs';

const GEMINI = 'GEMINI';
const types = { image: 'photo', video: 'video' };

const action = async (ctx, next) => {
    let [provider, func] = [GEMINI, 'image'];
    switch (ctx.cmd.cmd) {
        case 'gptimage': provider = 'OPENAI'; break;
        case 'fantasy': func = 'video';
    }
    if (!ctx.cmd.args) {
        return await ctx.ok('Please input your prompt.');
    }
    let [objMsg, output] = [(await ctx.ok('💭'))[0], null]; //tts = null
    try {
        output = (await ctx._.gen[func](ctx.cmd.args, {
            provider, expected: 'FILE'
        })) || [];
    } catch (err) {
        return await ctx.er(err.message || `Error generating ${func}.`,
            { lastMessageId: objMsg.message_id });
    }
    await ctx.deleteMessage(objMsg.message_id);
    await ctx.media(
        output.map(x => ({ type: types[func], src: x.data })),
        { caption: output[0]?.caption || '' }
    );
    // tts = output.tts || '';
    // await ctx.shouldSpeech(tts);
};

export const { name, run, priority, func, cmds, help } = {
    name: 'Dream',
    run: true,
    priority: 40,
    func: action,
    help: bot.lines([
        '¶ Use Google `Imagen` (default) or OpenAI `GPT Image` to generate images.',
        'Example 1: /dream a cat in a rocket',
        '¶ Use Google `Veo` to generate videos.',
        'Example 2: /fantasy two cats are kissing each other',
        '¶ Use `Imagen` to generate images.',
        'Example 3: /imagen a cat in a car',
        '¶ Use `GPT Image` to generate images.',
        'Example 4: /gptimage a cat on a bike',
    ]),
    cmds: {
        dream: 'Generate images with default model: /dream `PROMPT`',
        fantasy: 'Generate videos with `Veo`: /fantasy `PROMPT`',
        imagen: 'Generate images with `Imagen`: /imagen `PROMPT`',
        gptimage: 'Generate images with `GPT Image`: /gptimage `PROMPT`',
    },
};
