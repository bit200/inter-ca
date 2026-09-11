// Подписи и форматирование разбора диалога. Порт чистых функций из
// voice-manager (web-ui-script.ts): сам разбор приходит в тех же терминах -
// роли, маркеры, эмоции, акустические события, - и переводить их надо так же,
// иначе один и тот же звонок в двух кабинетах называется по-разному.

const ROLE_LABELS = {manager: 'Интервьюер', client: 'Кандидат'};

const MARKER_LABELS = {
    filler: 'Слово-паразит',
    uncertainty: 'Неуверенность',
    rudeness: 'Грубость',
    profanity: 'Ненормативная речь',
    empathy: 'Эмпатия',
    apology: 'Извинение',
    interruption: 'Перебивание',
};

const EVENT_LABELS = {
    music: 'Музыка',
    music_tv: 'Музыка или ТВ',
    television: 'Телевизор',
    child: 'Ребёнок',
    dog: 'Собака',
    keyboard: 'Клавиатура',
    notification: 'Уведомление',
    traffic: 'Транспорт',
    secondary_speech: 'Посторонняя речь',
    room_noise: 'Фоновый шум',
    voice: 'Посторонняя речь',
};

const EMOTION_LABELS = {
    neutral: 'Нейтрально',
    angry: 'Злость',
    positive: 'Позитив',
    sad: 'Грусть',
    stressed: 'Напряжение',
    uncertain: 'Неуверенность',
    enthusiasm: 'Воодушевление',
    fear: 'Страх',
    disgust: 'Отвращение',
    other: 'Другое',
    monoton: 'Монотонность',
    excited: 'Возбуждение',
};

const CAPABILITY_LABELS = {
    diarization: 'Разделение говорящих',
    speakerIdentification: 'Сопоставление участника',
    managerVoiceIsolation: 'Изоляция интервьюера',
    technicalQuality: 'Техническое качество',
    noiseEvents: 'Остаточный шум',
    speechMetrics: 'Речевые метрики',
    emotionModel: 'Эмоции',
    emotionProsody: 'Просодия',
    acousticEvents: 'Акустические события',
};

const CAPABILITY_STATUS_LABELS = {
    ready: 'Получено',
    degraded: 'Ограничено',
    unavailable: 'Недоступно',
    not_applicable: 'Не применяется',
    partial: 'Частично',
};

// Роли в разборе называются по-разному в зависимости от источника дорожек,
// поэтому сводим их к двум своим, а всё непонятное оставляем «неизвестным».
export function normalizedRole(role) {
    let value = String(role || 'unknown').toLowerCase();
    if (value === 'manager' || value === 'our' || value === 'near_end' || value === 'interviewer') return 'manager';
    if (value === 'client' || value === 'external' || value === 'far_end' || value === 'candidate') return 'client';
    return 'unknown';
}

export function speakerLabel(role, speaker) {
    let normalized = normalizedRole(role);
    if (ROLE_LABELS[normalized]) return ROLE_LABELS[normalized];
    return speaker && speaker !== 'unknown' ? String(speaker) : 'Говорящий';
}

export function roleSummary(turns) {
    let roles = new Set((turns || []).map(turn => normalizedRole(turn && turn.role)));
    if (roles.has('manager') && roles.has('client')) return 'Определены';
    return roles.size === 1 && roles.has('unknown') ? 'Не определены' : 'Частично';
}

export function markerLabel(category) {
    return MARKER_LABELS[category] || category || 'Маркер';
}

export function eventLabel(type, fallback) {
    return EVENT_LABELS[type] || fallback || type || 'Событие';
}

export function emotionLabel(value) {
    return EMOTION_LABELS[value] || value || 'Не определена';
}

export function capabilityLabel(key) {
    return CAPABILITY_LABELS[key] || key;
}

export function capabilityStatusLabel(status) {
    return CAPABILITY_STATUS_LABELS[status] || status || 'Получено';
}

export function formatDuration(milliseconds) {
    let total = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
    return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

export function formatSeconds(value) {
    return formatDuration(Number(value || 0) * 1000);
}

export function formatPercent(value) {
    return Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100) + '%';
}

export function formatNumber(value, digits) {
    return Number(value).toFixed(digits).replace('-', '−').replace('.', ',');
}

export function formatDb(value) {
    return formatNumber(value, 1) + ' дБ';
}

export function formatDbfs(value) {
    return formatNumber(value, 1) + ' дБFS';
}

// Верхние вероятности источника одной строкой: три класса читаются, десять - нет.
// Главный класс из строки убираем - он уже назван рядом, и повтор читается
// как два разных вывода.
export function emotionDistribution(summary, options) {
    let probabilities = summary && typeof summary.probabilities === 'object' ? summary.probabilities : {};
    let skip = options && options.exclude ? options.exclude : (summary && summary.dominant);
    return Object.keys(probabilities)
        .filter(name => typeof probabilities[name] === 'number' && name !== skip)
        .sort((left, right) => probabilities[right] - probabilities[left])
        .slice(0, 3)
        .map(name => emotionLabel(name) + ' ' + formatPercent(probabilities[name]))
        .join(' · ') || 'Недостаточно данных';
}

export function emotionDominant(summary) {
    if (!summary || !summary.dominant) return 'Нет вывода';
    let probability = typeof summary.dominantProbability === 'number'
        ? ' · ' + formatPercent(summary.dominantProbability)
        : '';
    return emotionLabel(summary.dominant) + probability;
}

// Реплики достаём терпимо: разбор может лежать и плоско (result.turns),
// и внутри conversation - на бэкенде форма ещё устаканивается.
export function readConversation(result) {
    let value = result && typeof result === 'object' ? result : {};
    let conversation = value.conversation && typeof value.conversation === 'object' ? value.conversation : value;
    return {
        turns: Array.isArray(conversation.turns) ? conversation.turns : [],
        markers: Array.isArray(conversation.markers) ? conversation.markers : [],
        summary: conversation.summary && typeof conversation.summary === 'object' ? conversation.summary : {},
        capabilities: value.capabilities && typeof value.capabilities === 'object' ? value.capabilities : {},
    };
}

// Сколько раз встретился каждый вид замечания - это и есть краткий итог разбора.
export function markerCounts(markers) {
    let counts = new Map();
    (markers || []).forEach(marker => {
        let category = marker && marker.category;
        counts.set(category, (counts.get(category) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([category, count]) => ({category, count}));
}
