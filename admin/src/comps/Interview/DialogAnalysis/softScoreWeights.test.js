import {DEFAULT_SOFT_WEIGHTS, getSoftWeights, loadSoftWeights, normalizeSoftWeights, resetSoftWeights} from './softScoreWeights';

describe('веса балла нетехнического ответа', () => {
    afterEach(() => {
        resetSoftWeights();
        delete global.http;
    });

    it('с сервера берутся только известные неотрицательные числа', () => {
        expect(normalizeSoftWeights([
            {key: 'content', value: 0.8}, {key: 'fillers', value: -1}, {key: 'llm', value: 5}, {key: 'delay', value: ''},
        ])).toEqual({...DEFAULT_SOFT_WEIGHTS, content: 0.8});
        expect(normalizeSoftWeights(null)).toEqual(DEFAULT_SOFT_WEIGHTS);
    });

    it('загружаются один раз и становятся текущими, сбой оставляет дефолты', async () => {
        let get = jest.fn(() => Promise.resolve({items: [{key: 'overall', value: 1}]}));
        global.http = {get};
        await loadSoftWeights();
        await loadSoftWeights();
        expect(get).toHaveBeenCalledTimes(1);
        expect(get.mock.calls[0][0]).toBe('/soft-score-weights');
        expect(getSoftWeights().overall).toBe(1);

        resetSoftWeights();
        global.http = {get: () => Promise.reject(new Error('down'))};
        expect(await loadSoftWeights()).toBe(DEFAULT_SOFT_WEIGHTS);
    });
});
