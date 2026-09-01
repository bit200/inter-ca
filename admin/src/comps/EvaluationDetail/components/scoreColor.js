// Шкала оценки на странице ответа раньше красилась непрерывным градиентом
// красный -> жёлтый -> зелёный, поэтому на одном экране оказывалось пять-шесть
// разных оттенков (жёлто-зелёный, жёлтый, янтарный, оранжевый, красный) и цвет
// переставал что-либо значить. Оставляем три значения, каждое со своим смыслом:
//   красный   - провал, смотреть в первую очередь;
//   оранжевый - есть куда расти;
//   зелёный   - норма.
// Сами цвета живут в css-переменных (scss/colors.scss), как принято в проекте,
// - здесь только ссылки на них, чтобы инлайновая шкала и стили страницы красились
// из одного места.
export const SCORE_COLOR = {
    bad: 'var(--score-bad)',
    mid: 'var(--score-mid)',
    good: 'var(--score-good)',
};

// Границы: до 40% - красный, до 70% - оранжевый, дальше зелёный.
export const SCORE_THRESHOLD = { mid: 0.4, good: 0.7 };

export const getScoreRGB = (score, max = 10) => {
    const t = Math.max(0, Math.min(1, (Number(score) || 0) / max));
    if (t >= SCORE_THRESHOLD.good) return SCORE_COLOR.good;
    if (t >= SCORE_THRESHOLD.mid) return SCORE_COLOR.mid;
    return SCORE_COLOR.bad;
};

export default getScoreRGB;
