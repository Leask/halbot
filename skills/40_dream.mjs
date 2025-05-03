import { bot, storage } from '../index.mjs';

const GEMINI = 'GEMINI';
const types = { image: 'photo', video: 'video' };

const action = async (ctx, next) => {
    let [provider, func, reference] = [GEMINI, 'image', null];
    switch (ctx.cmd.cmd) {
        case 'fantasy': func = 'video'; break;
        case 'gptimage':
            provider = 'OPENAI';
            reference = ctx.collected.filter(x => [
                storage.MIME_JPEG, storage.MIME_PNG, storage.MIME_WEBP
            ].includes(x?.content?.mime_type)).slice(0, 16).map(
                x => x?.content?.data
            );
    }
    if (!ctx.cmd.args) {
        return await ctx.ok('Please input your prompt.');
    }
    let [objMsg, output] = [(await ctx.ok('💭'))[0], null]; //tts = null
    try {
        output = (await ctx._.gen[func](ctx.cmd.args, {
            provider, expected: 'FILE',
            ...reference?.length ? { reference, input: 'BASE64' } : {},
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
