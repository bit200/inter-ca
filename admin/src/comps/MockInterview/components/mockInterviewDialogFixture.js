// TODO(mock): temporary fixture to preview the dialog-chat UI before the backend ships
// turn.dialog. Remove this file and its usage in MockInterviewResults.js once real data lands.
const MOCK_DIALOG = [
    { type: 'answer', text: 'Использую подход с разделением ответственности: бизнес-логику выношу в отдельный слой сервисов, а контроллеры оставляю максимально тонкими.' },
    { type: 'question', text: 'Уточните, пожалуйста, как вы обрабатываете ошибки в этом случае?' },
    {
        type: 'answer',
        text: 'Оборачиваю вызовы сервисов в try/catch на границе модуля и логирую ошибку через общий логгер, дальше отдаю понятный код ответа наружу.',
        advice: [
            'Стоит упомянуть про идемпотентность обработки повторных запросов.',
            'Хорошо бы привести конкретный пример из своей практики.',
        ],
    },
    { type: 'question', text: 'А как бы вы масштабировали это решение при росте нагрузки в 10 раз?' },
    { type: 'answer', text: 'Вынес бы тяжёлые операции в очередь и добавил горизонтальное масштабирование воркеров.' },
];

export const withMockDialog = (turns) => {
    if (!Array.isArray(turns) || !turns.length) return turns;
    return turns.map((turn, index) => (
        index === 0 && !turn.dialog ? { ...turn, dialog: MOCK_DIALOG } : turn
    ));
};