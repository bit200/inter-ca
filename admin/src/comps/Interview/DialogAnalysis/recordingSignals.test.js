import {hasRecordingSignals} from './dialogAnalysisFormat';

describe('блоки «Акустические события» и «Качество записи»', () => {
    it('без данных от конвейера блоков нет', () => {
        expect(hasRecordingSignals(undefined)).toBe(false);
        expect(hasRecordingSignals({})).toBe(false);
        expect(hasRecordingSignals({acousticEvents: {status: 'ready', events: []}})).toBe(false);
    });

    it('есть события, статус сигнала или сигнал/шум - блоки показываются', () => {
        expect(hasRecordingSignals({acousticEvents: {events: [{type: 'music', startSec: 1, endSec: 2}]}})).toBe(true);
        expect(hasRecordingSignals({diarization: {status: 'ready'}})).toBe(true);
        expect(hasRecordingSignals({technicalQuality: {snr: {estimatedDb: 18}}})).toBe(true);
    });
});
