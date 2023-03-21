#!/usr/bin/env node

import { storage, utilitas } from 'utilitas';
import halbot from '../index.mjs';

const debug = utilitas.humanReadableBoolean(process.env['DEBUG']);
const log = content => utilitas.log(content, import.meta.url);

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

try {
    const { config } = await storage.getConfig({ pack: { name: 'halbot' } });
    await halbot(config);
} catch (err) { debug ? utilitas.throwError(err) : log(err); }
