import {readConversation, separateSharedWords} from './dialogAnalysisFormat';

const word = (id, text, startMs) => ({id, text, startMs, endMs: startMs + 200});

describe('слово на стыке двух реплик достаётся одной из них', () => {
    // Интервью 1008: хвост ответа кандидата распознан ещё и началом реплики интервьюера.
    const candidate = {
        id: 'seg-1133', role: 'client', startMs: 4431237, endMs: 4438561,
        text: 'Я тестовые делала, так, чуть -чуть знакома.',
        words: [word('w1', 'Я', 4435000), word('w2', 'тестовые', 4435260), word('w3', 'делала,', 4436040),
            word('w4', 'так,', 4436620), word('w5', 'чуть', 4437420), word('w6', '-чуть', 4437640), word('w7', 'знакома.', 4437860)],
    };
    const interviewer = {
        id: 'seg-1134', role: 'manager', startMs: 4437447, endMs: 4447370,
        text: 'чуть -чуть знакома. Да, есть Nuxt для Vue, но в целом',
        words: [word('w5', 'чуть', 4437420), word('w6', '-чуть', 4437640), word('w7', 'знакома.', 4437860),
            word('w8', 'Да,', 4438500), word('w9', 'есть', 4439440), word('w10', 'Next', 4442920), word('w11', 'для', 4443420),
            word('w12', 'Vue,', 4443900), word('w13', 'но', 4444260), word('w14', 'в', 4444400), word('w15', 'целом', 4444560)],
    };
    const echo = {
        id: 'seg-1135', role: 'client', startMs: 4444180, endMs: 4444737, text: 'но в целом',
        words: [word('w13', 'но', 4444260), word('w14', 'в', 4444400), word('w15', 'целом', 4444560)],
    };

    test('законченная фраза остаётся у кандидата, из реплики интервьюера уходит', () => {
        const turns = readConversation({turns: [candidate, interviewer, echo]}).turns;
        expect(turns.map(turn => turn.id)).toEqual(['seg-1133', 'seg-1134']);
        expect(turns[0].text).toBe('Я тестовые делала, так, чуть -чуть знакома.');
        expect(turns[1].text).toBe('Да, есть Nuxt для Vue, но в целом');
        expect(turns[1].words.map(item => item.id)).not.toContain('w5');
        expect(turns[1].startMs).toBe(4438500);
    });

    test('незаконченный кусок - начало поздней реплики', () => {
        const turns = separateSharedWords([
            {id: 'a', startMs: 0, endMs: 3000, text: 'как вот добавить. У нас', words: [word('a1', 'как', 0), word('a2', 'вот', 300), word('a3', 'добавить.', 600), word('s1', 'У', 2600), word('s2', 'нас', 2800)]},
            {id: 'b', startMs: 2500, endMs: 6000, text: 'У нас setItem и getItem', words: [word('s1', 'У', 2600), word('s2', 'нас', 2800), word('b1', 'setItem', 3200), word('b2', 'и', 3600), word('b3', 'getItem', 3800)]},
        ]);
        expect(turns.map(turn => turn.text)).toEqual(['как вот добавить.', 'У нас setItem и getItem']);
    });

    test('реплики без общих слов не меняются', () => {
        const turns = [candidate, {...echo, words: [word('x', 'но', 1)]}];
        expect(separateSharedWords(turns)).toBe(turns);
    });
});
