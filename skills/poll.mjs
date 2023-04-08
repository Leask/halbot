import { bot } from 'utilitas';

const action = async (ctx, next) => {
    if (!ctx.update?.message?.poll) { return next(); }
    ctx.text = bot.lines([
        'Please help me select the best option in this poll.',
        'Try your best to choose between these options.',
        'If you know the answer, please select the best one and justify it.',
        'If you do not have enough info to pick one, explain why.',
        'If you can choose, put option id in the box brackets like [1].',
        '',
        'Question:',
        ctx.update.message.poll.question,
        '',
        'Options:',
        bot.oList(ctx.update.message.poll.options.map(x => x.text)),
    ]);
    await next();
    // let id;
    // for (let key in ctx.responses) {
    //     for (let line of ctx.responses[key].split('\n')) {
    //         id = ~~line.match(/\[\d+\]/)?.[0]?.replace(/^\[(.*)\]$/i, '$1');
    //         if (id) { break; }
    //     }
    //     if (id) { break; }
    // }
};

export const { run, priority, func } = {
    run: true,
    priority: 60,
    func: action,
};
