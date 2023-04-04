#!/usr/bin/env node

import { cache, dbio, memory, storage, utilitas } from 'utilitas';
import halbot from '../index.mjs';

const debug = utilitas.humanReadableBoolean(process.env['DEBUG']);
const log = content => utilitas.log(content, import.meta.url);
const getConfig = async () => (await storage.getConfig())?.config;

let session = {
    get: async key => (await getConfig())?.sessions?.[key],
    set: async (k, v) => await storage.setConfig({ sessions: { [k]: v } }),
};

try {
    const { filename, config } = await storage.getConfig();
    assert(utilitas.countKeys(config), `Error loading config from ${filename}.`);
    const sessionType = utilitas.trim(config.session?.type, { case: 'UP' });
    if (config.session?.type) { delete config.session.type; }
    switch (sessionType) {
        case 'MARIADB': case 'MYSQL':
            await dbio.init(config.session);
            await memory.init();
            session = memory;
            break;
        case 'REDIS':
            await cache.init(config.session);
            session = cache;
            break;
        default:
            config.session && utilitas.throwError('Invalid session config.');
    }
    await halbot({ ...config, session });
} catch (err) { debug ? utilitas.throwError(err) : log(err); }
