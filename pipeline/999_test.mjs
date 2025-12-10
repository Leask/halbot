
const action = async (ctx, next) => {
    await ctx.ok('test');
};
export const { name, run, priority, func } = {
    name: 'Test',
    run: true,
    priority: 70,
    func: action,
};
