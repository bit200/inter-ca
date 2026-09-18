// Пересчёт итоговой оценки вопроса на клиенте - та же формула, что складывает
// score на бэкенде (evaluate.result.weights/breakdown), только с частью
// компонентов, обнулённых по выбору проверяющего («не учитывать стиль ответа»).
// Опробовать разные веса, не трогая сохранённую оценку и не гоняя запрос на
// пересчёт, - весь смысл контрола: сравнение считается локально, у каждого
// смотрящего своё, и хранится в браузере (см. dialogMedia.js - тот же приём).
//
// Формула (id="finalScoreWeights", версия бэкенда на дату TASK-написания):
//   positive = Σ value*weight по компонентам с weight >= 0
//   base = positive / Σweight(weight>=0) * 10
//   penalty = Σ|value*weight| по компонентам с weight < 0
//   score = clamp(base - penalty, 0, 10)
// Компонент с обнулённым весом выпадает и из числителя, и из знаменателя base -
// это ровно то же, что и отсутствие компонента в data на бэкенде.
export function computeFinalScore(breakdown, weights, disabled) {
    let source = breakdown && typeof breakdown === 'object' ? breakdown : {};
    let base = weights && typeof weights === 'object' ? weights : {};
    let off = disabled instanceof Set ? disabled : new Set(disabled || []);

    let positive = 0;
    let positiveWeight = 0;
    let penalty = 0;
    Object.keys(base).forEach(name => {
        let entry = source[name];
        let value = entry && typeof entry === 'object' ? entry.value : null;
        if (typeof value !== 'number' || !isFinite(value)) return;
        let weight = off.has(name) ? 0 : Number(base[name]) || 0;
        let weighted = value * weight;
        if (weight >= 0) {
            positive += weighted;
            positiveWeight += weight;
        } else {
            penalty += Math.abs(weighted);
        }
    });

    let raw = positiveWeight > 0 ? (positive / positiveWeight) * 10 : 0;
    let score = Math.max(0, Math.min(10, raw - penalty));
    return Math.round(score * 10) / 10;
}

// Компоненты, которые можно выключить из итоговой оценки, по видам ответа.
// technical - ключ в evaluate.result.weights/breakdown технического ответа;
// soft - ключ веса в DEFAULT_SOFT_WEIGHTS (softScoreWeights.js), обнуляется тем
// же способом, но через другую формулу (softBreakdown в qaBlocks.js). Список
// заведён отдельно от самих формул, чтобы попап конфигурации не знал, как
// устроен пересчёт - только какие переключатели показать и по какому ключу.
// off - как переключатель называется в сводке над списком: там перечисляют не
// то, что учитывается, а то, что человек выключил, поэтому формулировка своя.
export const FINAL_SCORE_TOGGLES = [
    {id: 'style', title: 'Технические ответы', label: 'Учитывать стиль ответа', off: 'Без стиля ответа', kind: 'technical', key: 'style'},
    {id: 'delivery', title: 'Нетехнические ответы', label: 'Учитывать подачу', off: 'Без подачи', kind: 'soft', key: 'delivery'},
];

export const FINAL_SCORE_DISABLED_KEY = 'dlgFinalScoreDisabled';

export function readDisabledToggles(storage) {
    try {
        let raw = (storage || window.localStorage).getItem(FINAL_SCORE_DISABLED_KEY);
        let list = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(list) ? list : []);
    } catch (e) {
        return new Set();
    }
}

export function saveDisabledToggles(disabled, storage) {
    try {
        (storage || window.localStorage).setItem(FINAL_SCORE_DISABLED_KEY, JSON.stringify(Array.from(disabled)));
    } catch (e) {}
}

// Порядок списка вопросов в «Обзоре»: как пришли блоки (по ходу разговора) или
// по итоговому баллу - тому же, что показывает балл вопроса (учитывает
// выключенные компоненты, если проверяющий их выключил).
export const SCORE_SORT_KEY = 'dlgScoreSortOrder';

// summary - подпись для сводки в шапке; у порядка по разговору её нет: это
// исходный вид списка, о нём сообщать нечего.
export const SCORE_SORT_OPTIONS = [
    {order: 'default', label: 'По порядку разговора', summary: ''},
    {order: 'desc', label: 'Сначала высокий балл', summary: 'Сначала высокий балл'},
    {order: 'asc', label: 'Сначала низкий балл', summary: 'Сначала низкий балл'},
];

export const SCORE_SORT_ORDERS = SCORE_SORT_OPTIONS.map(option => option.order);

export function readScoreSortOrder(storage) {
    try {
        let value = (storage || window.localStorage).getItem(SCORE_SORT_KEY);
        return SCORE_SORT_ORDERS.includes(value) ? value : 'default';
    } catch (e) {
        return 'default';
    }
}

export function saveScoreSortOrder(order, storage) {
    try {
        (storage || window.localStorage).setItem(SCORE_SORT_KEY, order);
    } catch (e) {}
}

// Балл вопроса для сортировки - технический или мягкий, что из них есть у
// блока; нет ни одного (оценка ещё не готова) - блок остаётся в исходном месте.
function blockScore(block) {
    let evaluation = block && block.evaluation;
    if (evaluation && evaluation.state === 'done' && typeof evaluation.score === 'number') return evaluation.score;
    let soft = block && block.soft;
    if (soft && soft.state === 'done' && typeof soft.score === 'number') return soft.score;
    return null;
}

export function sortScoredBlocks(blocks, order) {
    let list = Array.isArray(blocks) ? blocks : [];
    if (order !== 'desc' && order !== 'asc') return list;
    // Блоки без готового балла остаются в конце вне зависимости от направления -
    // «по возрастанию» не должно означать «сначала неоценённые».
    let withScore = [];
    let withoutScore = [];
    list.forEach(block => (blockScore(block) === null ? withoutScore : withScore).push(block));
    withScore.sort((a, b) => order === 'desc' ? blockScore(b) - blockScore(a) : blockScore(a) - blockScore(b));
    return [...withScore, ...withoutScore];
}

// Чем вид списка вопросов отличается от исходного: порядок не по разговору и
// выключенные из балла компоненты. Человек настраивает их в попапе, попап
// закрывается - и дальше по одному только списку не видно, почему вопросы идут
// в таком порядке и почему балл ниже сохранённого. Поэтому шапка перечисляет
// отличия, а совпадение с исходным видом не показывает ничего.
export function scoreViewSummary(sortOrder, disabled) {
    let off = disabled instanceof Set ? disabled : new Set(disabled || []);
    let sort = SCORE_SORT_OPTIONS.find(option => option.order === sortOrder);
    let marks = [];
    if (sort && sort.summary) marks.push({id: 'sort', label: sort.summary});
    FINAL_SCORE_TOGGLES.forEach(toggle => {
        if (off.has(toggle.id)) marks.push({id: toggle.id, label: toggle.off});
    });
    return marks;
}
