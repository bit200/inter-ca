// Оценки компонентов приходят от LLM сырыми дробями (7/9 -> 0.7777777777777778)
// и в таком виде распирают строку заголовка. Округляем до двух знаков и
// убираем хвостовые нули, чтобы 1 осталась единицей, а не "1.00".
export const formatScore = (score) => {
    if (score == null) return '';
    const num = typeof score === 'number' ? score : Number(score);
    if (!Number.isFinite(num)) return String(score);
    return String(+num.toFixed(2));
};

export default formatScore;
