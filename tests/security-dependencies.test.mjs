import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { getTextExtractor } from 'office-text-extractor';
import { fileTypeFromBuffer } from 'file-type';
import yaml from 'js-yaml';

const require = createRequire(import.meta.url);

test('both archive consumers retain compression and extraction support', () => {
    for (const consumer of ['satori', 'office-text-extractor']) {
        const consumerRequire = createRequire(require.resolve(consumer));
        const { zipSync, unzipSync, strToU8, strFromU8 } = consumerRequire('fflate');
        const archive = zipSync({ 'fixture.txt': strToU8('HAL fixture') });
        assert.equal(strFromU8(unzipSync(archive)['fixture.txt']), 'HAL fixture');
    }
});

test('Office extraction detects and reads an in-memory DOCX document', async () => {
    const { zipSync, strToU8 } = require('fflate');
    const fixture = zipSync({
        '[Content_Types].xml': strToU8(`<?xml version="1.0"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Override PartName="/word/document.xml"
                ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
            </Types>`),
        '_rels/.rels': strToU8(`<?xml version="1.0"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Target="word/document.xml"
                Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"/>
            </Relationships>`),
        'word/document.xml': strToU8(`<?xml version="1.0"?>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:body><w:p><w:r><w:t>HAL document fixture</w:t></w:r></w:p></w:body>
            </w:document>`)
    });
    const bytes = Buffer.from(fixture);
    assert.equal((await fileTypeFromBuffer(bytes)).ext, 'docx');
    const extractor = getTextExtractor();
    assert.match(await extractor.extractText({ input: bytes, type: 'buffer' }),
        /HAL document fixture/);
    assert.equal(await fileTypeFromBuffer(Buffer.from('not a document')),
        undefined);
});

test('YAML settings preserve the existing load and dump API', () => {
    const fixture = { model: 'fixture', enabled: true, modes: ['text', 'image'] };
    assert.deepEqual(yaml.load(yaml.dump(fixture)), fixture);
});
