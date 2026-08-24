// Вердикт словом рядом с баллом. Цифра "7/10" сама по себе не отвечает на
// вопрос "это хорошо?" - пороги те же, что и у цвета шкалы (scoreColor.js),
// поэтому слово и цвет всегда говорят одно и то же.
import { SCORE_THRESHOLD } from './scoreColor';

export const VERDICT_STRONG = 0.85;

export const scoreVerdict = (score, max = 10) => {
    if (score == null || score === '') return '';
    const num = Number(score);
    if (!Number.isFinite(num)) return '';
    const t = Math.max(0, Math.min(1, num / max));
    if (t >= VERDICT_STRONG) return 'Отличный ответ';
    if (t >= SCORE_THRESHOLD.good) return 'Уверенный ответ';
    if (t >= SCORE_THRESHOLD.mid) return 'Есть куда расти';
    return 'Ответ не засчитан';
};

export default scoreVerdict;
