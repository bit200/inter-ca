// Расшифровку оценки пишет LLM, и названия компонентов приходят от неё
// техническими ключами метрик ("DEPTH", "relevance", "practice_score") - на
// экране это выглядело как латинские аббревиатуры посреди русского текста.
// Переводим известные ключи в те же названия, которыми группы метрик уже
// подписаны в "Деталях оценки" (evalmetricschema.group), чтобы один и тот же
// параметр назывался везде одинаково.
//
// Неизвестный ключ возвращаем как есть: словарь тут - улучшение читаемости, а
// не фильтр, и новая метрика с бэкенда не должна пропадать из интерфейса.
// Названия, которые бэкенд уже прислал по-русски, проходят через ту же ветку.
const LABELS = {
    relevance: 'Релевантность',
    is_offtop: 'Уход от темы',
    depth: 'Глубина',
    errors: 'Ошибки',
    practice: 'Практика',
    fillers: 'Слова-паразиты',
    speech: 'Речь',
    style: 'Стиль',
    structure: 'Структура',
    clarity: 'Ясность',
    logic: 'Логика',
    terminology: 'Терминология',
    examples: 'Примеры',
    completeness: 'Полнота',
    accuracy: 'Точность',
    fact_verify: 'Факты',
    communication: 'Коммуникация',
    confidence: 'Уверенность',
    overall: 'Общая оценка',
    total: 'Общая оценка',
    // Критическая ошибка называется на экране ровно так же, как в колонке
    // советов (см. AdviceSection) - один и тот же провал ответа не должен
    // называться в двух местах по-разному.
    critical_error: 'Критическая ошибка',
    is_critical: 'Критическая ошибка',
    critical: 'Критическая ошибка',
    offtop: 'Уход от темы',
    filler_words: 'Слова-паразиты',
    speech_rate: 'Темп речи',
    answer: 'Ответ',
};

export function explainComponentLabel(name) {
    if (!name) return '';
    // "evaluation.depth.depth_score" -> "depth_score" -> "depth": ключ приходит
    // в разной форме - голым именем, путём до метрики, с суффиксом _score.
    let key = String(name).trim().toLowerCase().split('.').pop().replace(/\s+/g, '_');
    if (LABELS[key]) return LABELS[key];
    // Одну и ту же метрику LLM называет то в единственном числе, то во
    // множественном, то с суффиксом и приставкой ("critical_errors",
    // "is_critical_error") - сводим все формы к ключу словаря, иначе на экране
    // посреди русского текста остаётся латинский ключ.
    const forms = [
        k => k.replace(/_(score|value|rating|count|level)$/, ''),
        k => k.replace(/s$/, ''),
        k => k.replace(/^(is|has)_/, ''),
    ];
    for (const form of forms) {
        const next = form(key);
        if (next !== key) {
            key = next;
            if (LABELS[key]) return LABELS[key];
        }
    }
    return LABELS[key] || String(name).trim();
}
