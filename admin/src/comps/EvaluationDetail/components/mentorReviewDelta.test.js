import { mentorReviewDelta } from './mentorReviewDelta';

test('называет расхождение баллов словами и в обе стороны', () => {
    expect(mentorReviewDelta(8, 5.4)).toBe('на 2.6 выше автоматической');
    expect(mentorReviewDelta(4, 6.2)).toBe('на 2.2 ниже автоматической');
});

test('расхождение в полбалла считает совпадением', () => {
    expect(mentorReviewDelta(6, 5.6)).toBe('совпала с автоматической');
    expect(mentorReviewDelta(6, 6)).toBe('совпала с автоматической');
});

test('без одного из баллов подписи нет', () => {
    expect(mentorReviewDelta(null, 5.4)).toBe('');
    expect(mentorReviewDelta(8, undefined)).toBe('');
});
