
import { dbio, hal, storage as _storage } from './index.mjs';

const run = async () => {
    const { config } = await _storage.getConfig();
    await dbio.init(config.storage);
    const token = 'TOKEN|8df8db54-3ef1-4d63-b91d-da05ae6eccff-d46ae000661b3509e743d37d55a7e30be8158c008ad93cad88d7af07503e2061c53bce89f042762495d168af02f';
    const result = await dbio.queryOne(
        `SELECT * FROM ${hal.table} WHERE token = $1`,
        [token]
    );

    if (result) {
        console.log('Result found.');
        const response = JSON.parse(result.response);
        console.log('Response count:', response.length);

        response.forEach((msg, i) => {
            console.log(`\nMessage ${i}:`);
            console.log(JSON.stringify(msg, null, 2));
        });
    } else {
        console.log('No result found for token.');
    }
    process.exit(0);
};

run().catch(console.error);
