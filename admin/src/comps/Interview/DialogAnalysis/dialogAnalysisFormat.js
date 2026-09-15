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

// Акустика и качество записи приходят в разборе, только если конвейер их
// заказывал. Разбор интервью сейчас их не заказывает (только ASR, диаризация
// и таймлайн), поэтому без данных блоки не показываем вовсе - иначе это
// вечные пустые заглушки.
export function hasRecordingSignals(capabilities) {
    let value = capabilities && typeof capabilities === 'object' ? capabilities : {};
    let events = value.acousticEvents && Array.isArray(value.acousticEvents.events) ? value.acousticEvents.events : [];
    if (events.length) return true;
    let snr = value.technicalQuality && value.technicalQuality.snr;
    if (snr && typeof snr.estimatedDb === 'number') return true;
    return Object.keys(value).some(key => key !== 'acousticEvents'
        && value[key] && typeof value[key] === 'object' && value[key].status);
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

// Ключ говорящего: диаризация даёт SPEAKER_00, SPEAKER_01, а если её не было -
// различать участников можно только по роли.
export function speakerKey(turn) {
    let speaker = turn && turn.speaker;
    if (speaker && speaker !== 'unknown') return String(speaker);
    return 'role:' + normalizedRole(turn && turn.role);
}

// Роль, которую человек назначил говорящему руками, сильнее автоматической:
// разбор угадывает интервьюера по дорожкам, а интервьюеров бывает несколько.
export function applySpeakerRoles(turns, roles) {
    let map = roles && typeof roles === 'object' ? roles : {};
    return (turns || []).map(turn => {
        let role = map[speakerKey(turn)];
        return role === 'client' || role === 'manager' ? {...turn, role} : turn;
    });
}

// Участники записи для выбора роли: сколько реплик и сколько времени говорил
// каждый и с чего начал - по первой фразе человек узнаёт голос.
export function listSpeakers(turns) {
    let byKey = new Map();
    (turns || []).forEach(turn => {
        if (!turn) return;
        let key = speakerKey(turn);
        let entry = byKey.get(key);
        if (!entry) {
            entry = {key, speaker: turn.speaker, role: normalizedRole(turn.role), turns: 0, speechMs: 0, sample: ''};
            byKey.set(key, entry);
        }
        entry.turns += 1;
        entry.speechMs += Math.max(0, Number(turn.endMs || 0) - Number(turn.startMs || 0));
        if (!entry.sample && turn.text && String(turn.text).trim().length > 3) entry.sample = String(turn.text).trim();
    });
    return Array.from(byKey.values());
}

// Подпись говорящего в ленте. Если одну роль делят несколько голосов
// (два интервьюера), добавляем номер, иначе реплики разных людей сливаются.
export function speakerLabels(turns) {
    let speakers = listSpeakers(turns);
    let perRole = {};
    speakers.forEach(entry => { perRole[entry.role] = (perRole[entry.role] || 0) + 1; });
    let seen = {};
    let labels = {};
    speakers.forEach(entry => {
        let base = speakerLabel(entry.role, entry.speaker);
        seen[entry.role] = (seen[entry.role] || 0) + 1;
        labels[entry.key] = ROLE_LABELS[entry.role] && perRole[entry.role] > 1 ? base + ' ' + seen[entry.role] : base;
    });
    return labels;
}
