import {markTranslation, stripMarks} from './translateMarks';

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
