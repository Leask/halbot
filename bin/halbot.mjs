#!/usr/bin/env node

import { cache, dbio, memory, storage as _storage, utilitas } from 'utilitas';
import halbot from '../index.mjs';

const debug = utilitas.humanReadableBoolean(process.env['DEBUG']);
const log = content => utilitas.log(content, import.meta.url);
const MEMORY = 'memory';
const _getConfig = async () => await _storage.getConfig();
const getConfig = async key => (await _getConfig())?.config?.[key];

let storage = {
    provider: 'FILE',
    get: async key => (await getConfig(MEMORY))?.[key],
    set: async (k, v) => await _storage.setConfig({ [MEMORY]: { [k]: v } }),
};

try {
    const { filename, config } = await _getConfig();
    assert(utilitas.countKeys(config), `Error loading config from ${filename}.`);
    const provider = utilitas.trim(config.storage?.provider, { case: 'UP' });
    switch (provider) {
        case 'MARIADB': case 'MYSQL': case 'POSTGRESQL':
            await dbio.init(config.storage);
            storage = { ...await memory.init(), provider, client: dbio };
            break;
        case 'REDIS':
            storage = { ...await cache.init(config.storage), provider };
            break;
        default:
            config.storage && utilitas.throwError('Invalid storage config.');
    }
    await halbot({ ...config, storage });
} catch (err) { debug ? utilitas.throwError(err) : log(err); }
