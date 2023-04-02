#!/usr/bin/env node

import { storage, utilitas } from 'utilitas';
import halbot from '../index.mjs';

const debug = utilitas.humanReadableBoolean(process.env['DEBUG']);
const log = content => utilitas.log(content, import.meta.url);
const getConfig = async () => (await storage.getConfig())?.config;

// Disabled for current version.
// const args = await (async (options) => {
//     const { parseArgs } = await import('node:util');
//     if (parseArgs) { // https://kgrz.io/node-has-native-arg-parsing.html
//         const { values } = parseArgs({
//             options: {
//                 // xxx: { type: 'string', short: 'x', default: '' }
//             },
//             ...options || {},
//         });
//         return values;
//     }
//     let args = {}; // simple fallback for node version < 19
//     process.argv.map(arg => {
//         const item = arg.replace(/^\-*([^=]*)=(.*)$/ig, '$1<,>$2').split('<,>');
//         item.length > 1 && (args[item[0]] = item[1]);
//     });
//     return args;
// })();

const session = {
    get: async key => (await getConfig())?.sessions?.[key],
    set: async (k, v) => await storage.setConfig({ sessions: { [k]: v } }),
};

try {
    const { config } = await storage.getConfig();
    await halbot({ ...config, session });
} catch (err) { debug ? utilitas.throwError(err) : log(err); }
