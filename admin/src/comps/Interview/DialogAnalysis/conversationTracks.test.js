import {conversationTracks, turnTone} from './dialogLens';

describe('ход разговора: дорожки по ролям, как в карточке звонка', () => {
    const turns = [
        {role: 'manager', startMs: 0, endMs: 10000, text: 'Расскажите про себя'},
        {role: 'client', startMs: 10000, endMs: 40000, text: 'Я разработчик'},
        {role: 'candidate', startMs: 40000, endMs: 50000, text: 'Ещё', markerIds: ['m1']},
        {role: 'x', startMs: 90000, endMs: 100000, text: '?'},
    ];

    test('интервьюер, кандидат и неопознанные - отдельные дорожки с позициями в процентах', () => {
        const tracks = conversationTracks(turns, 100000, new Map(), new Map());
        expect(tracks.map(t => t.label)).toEqual(['Интервьюер', 'Кандидат', 'Роль не определена']);
        expect(tracks[1].segments.map(s => [s.index, s.left, s.width])).toEqual([[1, 10, 30], [2, 40, 10]]);
    });

    test('цвет отрезка - связь с оценкой ответа, а не эмоция', () => {
        const scores = new Map([[1, {score: 2, max: 10}]]);
        expect(turnTone(1, turns[1], scores, new Map())).toBe('critical');
        expect(turnTone(1, turns[1], new Map([[1, {score: 5, max: 10}]]), new Map())).toBe('warning');
        expect(turnTone(1, turns[1], new Map(), new Map([[1, 'off_topic']]))).toBe('critical');
        expect(turnTone(2, turns[2], new Map(), new Map())).toBe('warning');
        expect(turnTone(0, turns[0], new Map(), new Map())).toBe('speech');
    });

    test('без длительности шкалы нет', () => {
        expect(conversationTracks(turns, 0)).toEqual([]);
    });
});
