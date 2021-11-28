import chai from 'chai';
import flexSearch, { IndexSearchResult } from 'flexsearch';
// import { Index, IndexSearchResult } from 'flexsearch';

describe('flexsearch', () => {

    it('should search', async () => {
        // Given
        const index = new flexSearch.Index({});
        await index.addAsync('one', 'stuff junk pync. derp derp.');
        // When
        const r: IndexSearchResult = await index.searchAsync('pync');
        // Then
        chai.assert.equal(r.length, 1);
    });

    it('should search after export and import', async () => {
        
        // Given
        const exportIndex = new flexSearch.Index();
        const importIndex = new flexSearch.Index();
        await exportIndex.addAsync('one', 'stuff and junk');
        await exportIndex.addAsync('two', 'derp derp');
 
        // When

        const d: { [key: string]: string } = {};
        // Contrary to the docs, neither export() nor import() are actually 
        // declared async
        exportIndex.export((key: string|number, value) => {
            // Keys don't match between import() and export()
            // export() nests keys like reg, reg.cfg, reg.cfg.map, and reg.cfg.map.ctx
            // but import() wants them flat like reg, cfg, map, ctx
            const k = key.toString().split('.').pop() || '';
            d[k] = value;
            importIndex.import(k, value);
        });

        // We have to sleep because of function async() in serialize.js
        await new Promise(resolve => setTimeout(resolve, 3000));

        const r: IndexSearchResult = await importIndex.searchAsync('junk');

        // Then
        chai.assert.equal(r.length, 1);
    });

});