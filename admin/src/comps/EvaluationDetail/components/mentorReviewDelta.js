// Балл куратора и автоматический балл стоят рядом, и первый вопрос к ним -
// "они вообще про одно и то же?". Подпись отвечает на него словами, чтобы
// кандидату не приходилось вычитать одно число из другого в уме.
// Полбалла и меньше - это шум округления, а не расхождение: такие случаи
// называем совпадением.
export const MENTOR_DELTA_EPS = 0.5;

export const mentorReviewDelta = (mentorScore, autoScore) => {
    if (typeof mentorScore !== 'number' || typeof autoScore !== 'number') return '';
    if (!Number.isFinite(mentorScore) || !Number.isFinite(autoScore)) return '';

    const diff = mentorScore - autoScore;
    if (Math.abs(diff) <= MENTOR_DELTA_EPS) return 'совпала с автоматической';

    const value = String(+Math.abs(diff).toFixed(1));
    return diff > 0 ? `на ${value} выше автоматической` : `на ${value} ниже автоматической`;
};

export default mentorReviewDelta;
