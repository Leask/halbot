import { alan, bot, rag, web, utilitas } from 'utilitas';
import * as hal from './lib/hal.mjs';

await utilitas.locate(utilitas.__(import.meta.url, 'package.json'));
const pipelinePath = utilitas.__(import.meta.url, 'pipeline');

const init = async (options = {}) => {
    assert(options.telegramToken, 'Telegram Bot API Token is required.');
    let [pkg, _embed, _rerank, opts] =
        [await utilitas.which(), options?.embed, options?.rerank, null];
    const info = bot.lines([
        `[${bot.BOT} ${pkg.title}](${pkg.homepage})`, pkg.description
    ]);
    // use google rerank
    if (options?.googleCredentials && options.googleProjectId) {
        opts = {
            provider: 'GOOGLE', credentials: options.googleCredentials,
            projectId: options.googleProjectId,
        };
        if (!_rerank) {
            await rag.initReranker(opts);
            _rerank = rag.rerank;
        }
    }
    // use jina search and reranker
    if (options.jinaApiKey) {
        opts = { provider: 'JINA', apiKey: options.jinaApiKey };
        await web.initSearch(opts);
        if (!_rerank) {
            await rag.initReranker(opts);
            _rerank = rag.rerank;
        }
    }
    // use openrouter's AI models
    if (options.openrouterApiKey) {
        opts = { provider: 'OPENROUTER', apiKey: options.openrouterApiKey };
        await alan.init({
            ...opts,
            model: options.openrouterModel,
            priority: options.openrouterPriority, ...options,
        })
        if (!_embed) {
            await rag.initEmbedding(opts);
            _embed = rag.embed;
        }
        // use openai models, embedding if openrouter is disabled
    } else if (options.openaiApiKey && options.openaiModels) {
        opts = { provider: 'OPENAI', apiKey: options.openaiApiKey };
        await alan.init({
            ...opts, model: options.openaiModel || '*',
            priority: options.openaiPriority, ...options,
        });
        if (!_embed) {
            await rag.initEmbedding(opts);
            _embed = rag.embed;
        }
    }
    // use google's veo
    if (options.googleApiKey) {
        opts = { provider: 'GOOGLE', apiKey: options.googleApiKey };
        await alan.init({
            ...opts, model: options.googleModel || '*',
            priority: options.googlePriority, ...options,
        });
    }
    // use ollama
    if (options?.ollamaEnabled || options?.ollamaEndpoint) {
        await alan.init({
            provider: 'OLLAMA', model: options?.ollamaModel || '*',
            priority: options?.ollamaPriority,
            host: options?.ollamaEndpoint, ...options
        });
    }
    // init hal
    const _hal = await hal.init({
        args: options?.args,
        auth: options?.auth,
        botToken: options?.telegramToken,
        chatType: options?.chatType,
        cmds: options?.cmds,
        embed: _embed,
        hello: options?.hello,
        help: options?.help,
        homeGroup: options?.homeGroup,
        info: options?.info || info,
        lang: options?.lang || 'English',
        pipeline: options?.pipeline,
        pipelinePath: options?.pipelinePath || pipelinePath,
        private: options?.private,
        provider: 'telegram',
        rerank: _rerank,
        storage: options?.storage,
        web: options?.web,
    });
    return _hal;
};

export default init;
export * from 'utilitas';
export { hal, init };
