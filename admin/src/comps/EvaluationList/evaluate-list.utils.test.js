import { sortItemsByScore } from './evaluate-list.utils';

const item = (id, score, status = 'done') => ({
    _id: id,
    evaluate: score == null ? { status } : { status, result: { score } },
});

const ids = list => list.map(it => it._id);

describe('sortItemsByScore: порядок ответов по баллу', () => {
    const items = [item(1, 5.7), item(2, 3.5), item(3, 9), item(4, null, 'pending')];

    it('по убыванию - сначала высокие баллы', () => {
        expect(ids(sortItemsByScore(items, 'desc'))).toEqual([3, 1, 2, 4]);
    });

    it('по возрастанию - сначала низкие баллы', () => {
        expect(ids(sortItemsByScore(items, 'asc'))).toEqual([2, 1, 3, 4]);
    });

    it('записи без балла всегда внизу, а не в начале "по возрастанию"', () => {
        expect(ids(sortItemsByScore(items, 'asc')).pop()).toBe(4);
        expect(ids(sortItemsByScore(items, 'desc')).pop()).toBe(4);
    });

    it('без сортировки порядок исходный и массив не копируется зря', () => {
        expect(sortItemsByScore(items, 'none')).toBe(items);
        expect(sortItemsByScore(items, null)).toBe(items);
    });

    it('исходный массив не мутируется', () => {
        sortItemsByScore(items, 'desc');
        expect(ids(items)).toEqual([1, 2, 3, 4]);
    });
});
