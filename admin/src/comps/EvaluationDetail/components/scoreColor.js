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

// Те же три значения, но для текста: цифру в чипе красили насыщенным цветом
// деления, и на светлой подложке она читалась хуже собственной подписи
// (оранжевый давал 3.1:1 при норме 4.5:1). Заливкам нужен насыщенный тон,
// тексту - тёмный, поэтому у шкалы два набора, а порог у них общий.
export const SCORE_TEXT_COLOR = {
    bad: 'var(--score-bad-text)',
    mid: 'var(--score-mid-text)',
    good: 'var(--score-good-text)',
};

// Границы: до 40% - красный, до 70% - оранжевый, дальше зелёный.
export const SCORE_THRESHOLD = { mid: 0.4, good: 0.7 };

export const scoreLevel = (score, max = 10) => {
    const t = Math.max(0, Math.min(1, (Number(score) || 0) / max));
    if (t >= SCORE_THRESHOLD.good) return 'good';
    if (t >= SCORE_THRESHOLD.mid) return 'mid';
    return 'bad';
};

export const getScoreRGB = (score, max = 10) => SCORE_COLOR[scoreLevel(score, max)];

export const getScoreTextColor = (score, max = 10) => SCORE_TEXT_COLOR[scoreLevel(score, max)];

export default getScoreRGB;
