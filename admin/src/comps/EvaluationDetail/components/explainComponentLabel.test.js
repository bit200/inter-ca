import { explainComponentLabel } from './explainComponentLabel';

describe('explainComponentLabel', () => {
    it('переводит технические имена метрик на русский', () => {
        expect(explainComponentLabel('DEPTH')).toBe('Глубина');
        expect(explainComponentLabel('relevance')).toBe('Релевантность');
        expect(explainComponentLabel('Practice')).toBe('Практика');
    });

    it('понимает имя с суффиксом и полный путь до метрики', () => {
        expect(explainComponentLabel('depth_score')).toBe('Глубина');
        expect(explainComponentLabel('evaluation.errors.errors')).toBe('Ошибки');
    });

    it('оставляет как есть то, что уже пришло по-русски или неизвестно', () => {
        expect(explainComponentLabel('Точность ответа')).toBe('Точность ответа');
        expect(explainComponentLabel('unknown_metric')).toBe('unknown_metric');
        expect(explainComponentLabel('')).toBe('');
        expect(explainComponentLabel(null)).toBe('');
    });
});
