import {markTranslation, markValue, stripMarks} from './translateMarks';

describe('markTranslation', () => {
    it('ставит метку один раз', () => {
        expect(markTranslation('Название', true)).toBe('*Название*');
        expect(markTranslation('emty', false)).toBe('&&&&&&& emty&&&&&&& ');
    });
    it('повторный вызов на уже помеченном не добавляет меток', () => {
        const once = markTranslation('emty', false);
        expect(markTranslation(markTranslation(once, false), false)).toBe(once);
        const found = markTranslation('Тип', true);
        expect(markTranslation(found, true)).toBe(found);
    });
    it('на https меток нет и старые снимаются', () => {
        expect(markTranslation('&&&&&&& 0&&&&&&&', false, true)).toBe('0');
    });
});

describe('stripMarks', () => {
    it('снимает многократные метки', () => {
        expect(stripMarks('&&&&&&& &&&&&&& local&&&&&&&&&&&&&&')).toBe('local');
        expect(stripMarks('**Статус**')).toBe('Статус');
        expect(stripMarks('-')).toBe('-');
        expect(stripMarks(5)).toBe(5);
    });
});

describe('markValue', () => {
    it('значение без перевода выводится без меток «&&&&&&&»', () => {
        expect(markValue('emty', '')).toBe('emty');
        expect(markValue('&&&&&&& emty&&&&&&&', '')).toBe('emty');
        expect(markValue('0', '')).toBe('0');
    });
    it('переведённое значение помечается один раз', () => {
        expect(markValue('tech', 'Тех')).toBe('*Тех*');
        expect(markValue('tech', 'Тех', true)).toBe('Тех');
    });
});
