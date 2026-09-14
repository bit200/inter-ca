import {saveSpots, withTabSave, saveLabel} from './editActions';

describe('место кнопки «Сохранить» в карточке', () => {
    test('по умолчанию сохранение в шапке и под формой', () => {
        expect(saveSpots({})).toEqual({header: true, footer: true});
        expect(saveSpots(undefined)).toEqual({header: true, footer: true});
    });

    test('saveInTabs убирает общее сохранение из шапки и из-под формы', () => {
        expect(saveSpots({saveInTabs: true})).toEqual({header: false, footer: false});
    });

    test('полоса сохранения попадает только во вкладки, где есть что сохранять', () => {
        let bar = {size: 12, Component: 'SaveBar'};
        let tabs = [
            {urlKey: 'main', save: true, childs: [{key: 'name'}]},
            {urlKey: 'dialog', childs: [{key: 'x'}]},
            null,
            {urlKey: 'admin', save: true},
        ];
        let out = withTabSave(tabs, bar);
        expect(out[0].childs).toEqual([{key: 'name'}, bar]);
        expect(out[1].childs).toEqual([{key: 'x'}]);
        expect(out[2]).toBe(null);
        expect(out[3].childs).toEqual([bar]);
        expect(tabs[0].childs).toEqual([{key: 'name'}]);
    });

    test('подпись кнопки идёт за состоянием сохранения', () => {
        expect(saveLabel('idle')).toBe('save');
        expect(saveLabel('saving')).toBe('saving');
        expect(saveLabel('saved')).toBe('saved');
        expect(saveLabel('error')).toBe('save');
    });
});
