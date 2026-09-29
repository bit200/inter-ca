import {initialSection, readSection, resolveSection, saveSection, sectionBlocks, SECTION_KEY} from './sectionTabs';

const tech = {key: 'a', technical: true};
const soft = {key: 'b', technical: false};

describe('разделы разбора интервью', () => {
    test('«Техника» - только технические вопросы, «Софт» - только нетехнические', () => {
        expect(sectionBlocks('tech', [tech, soft])).toEqual([tech]);
        expect(sectionBlocks('soft', [tech, soft])).toEqual([soft]);
        expect(sectionBlocks('overview', [tech, soft])).toEqual([tech, soft]);
    });

    test('пустая часть уступает «Обзору», без вопросов - «Диалогу»', () => {
        expect(resolveSection('tech', [soft])).toBe('overview');
        expect(resolveSection('soft', [tech])).toBe('overview');
        expect(resolveSection('soft', [])).toBe('dialog');
        expect(resolveSection('soft', [soft])).toBe('soft');
        expect(resolveSection('dialog', [tech])).toBe('dialog');
    });

    test('без запомненного раздела - «Обзор», если есть вопросы', () => {
        expect(initialSection(null, [tech])).toBe('overview');
        expect(initialSection(null, [])).toBe('dialog');
        expect(initialSection('soft', [])).toBe('soft');
    });

    test('раздел хранится в localStorage, мусор и сломанное хранилище игнорируются', () => {
        let data = {};
        let storage = {getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = value; }};
        saveSection('tech', storage);
        expect(data[SECTION_KEY]).toBe('tech');
        expect(readSection(storage)).toBe('tech');
        data[SECTION_KEY] = 'junk';
        expect(readSection(storage)).toBeNull();
        let broken = {getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }};
        expect(readSection(broken)).toBeNull();
        expect(() => saveSection('tech', broken)).not.toThrow();
    });
});
