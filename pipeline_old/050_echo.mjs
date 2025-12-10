{
    run: true, priority: -8930, name: 'echo', hidden: true, func: async (ctx, next) => {
        let resp, md = false;
        switch (ctx.cmd.cmd) {
            case 'echo':
                resp = json({ update: ctx.update, session: ctx.session });
                break;
            case 'uptime':
                resp = utilitas.uptime();
                break;
            case 'thethreelaws':
                resp = bot.lines([
                    `Isaac Asimov's [Three Laws of Robotics](https://en.wikipedia.org/wiki/Three_Laws_of_Robotics):`,
                    oList([
                        'A robot may not injure a human being or, through inaction, allow a human being to come to harm.',
                        'A robot must obey the orders given it by human beings except where such orders would conflict with the First Law.',
                        'A robot must protect its own existence as long as such protection does not conflict with the First or Second Laws.',
                    ])
                ]);
                md = true;
                break;
            case 'ultimateanswer':
                resp = '[The Answer to the Ultimate Question of Life, The Universe, and Everything is `42`](https://en.wikipedia.org/wiki/Phrases_from_The_Hitchhiker%27s_Guide_to_the_Galaxy).';
                md = true;
                break;
            case 'lorem':
                const ipsum = () => text += `\n\n${lorem.generateParagraphs(1)}`;
                const [demoTitle, demoUrl] = [
                    'Lorem ipsum', 'https://en.wikipedia.org/wiki/Lorem_ipsum',
                ];
                let [text, extra] = [`[${demoTitle}](${demoUrl})`, {
                    buttons: [{ label: demoTitle, url: demoUrl }]
                }];
                await ctx.ok(bot.EMOJI_THINKING);
                for (let i = 0; i < 2; i++) {
                    await ctx.timeout();
                    await ctx.ok(ipsum(), { ...extra, onProgress: true });
                }
                await ctx.timeout();
                await ctx.ok(ipsum(), { ...extra, md: true });
                // testing incomplete markdown reply {
                // await ctx.ok('_8964', { md: true });
                // }
                // test pagebreak {
                // await ctx.timeout();
                // await ctx.ok(ipsum(), { md: true, pageBreak: true });
                // }
                return;
        }
        await ctx.ok(resp, { md });
    }, help: bot.lines([
        '¶ Basic behaviors for debug only.',
    ]), cmds: {
        thethreelaws: `Isaac Asimov's [Three Laws of Robotics](https://en.wikipedia.org/wiki/Three_Laws_of_Robotics)`,
            ultimateanswer: '[The Answer to the Ultimate Question of Life, The Universe, and Everything](https://bit.ly/43wDhR3).',
                echo: 'Show debug message.',
                    uptime: 'Show uptime of this bot.',
                        lorem: '[Lorem ipsum](https://en.wikipedia.org/wiki/Lorem_ipsum)',
    },
}
