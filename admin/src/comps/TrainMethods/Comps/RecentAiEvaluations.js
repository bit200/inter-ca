import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_LABEL, STATUS_COLOR } from '../../EvaluationDetail/evaluationStatus';

const RECENT_COUNT = 10;

// Только для подписи статуса в этом виджете - в полном списке (/evaluations) цвета
// статусов не трогаем.
const LABEL_COLOR = { done: 'var(--bs-primary)' };

function getQuestionTitle(item) {
    const ti = item.titleInfo || {};
    return ti.title || ti.smallTitle || ti.desc || `Вопрос #${item.question}`;
}

// Небольшая витрина последних оценок ИИ прямо на вкладке "Фидбеки" (не отдельная
// вкладка - продуктовое решение) - полный список с группировкой по экзамену/модулю
// живёт на /evaluations (EvaluationList.js), сюда просто последние 10 ответов.
function RecentAiEvaluations() {
    const [items, setItems] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Без mode (exam/module) - в отличие от EvaluationList.js, здесь просто
        // "последнее по времени" вперемешку. Бэкенд (itk-platform-en) не в этом
        // репозитории - допущение, что без mode он не требует параметр и просто
        // возвращает все типы, а items отсортированы новыми сверху так же, как это
        // видно на /evaluations; сортируем ещё и на клиенте по cd на случай, если это
        // не так. wo_notify + catch - виджет должен молча не показаться, а не уронить
        // страницу, если эндпоинт недоступен.
        global.http.get('/evaluate-list', { page: 1, per_page: RECENT_COUNT }, { wo_notify: true })
            .then(data => setItems(data?.items || []))
            .catch(() => setItems(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !items || !items.length) return null;

    // error-записи молча ретраятся сами (см. EvaluationListItemGroup.js/бэкенд) -
    // тот же принцип, что и в полном списке: пока не восстановятся, показывать
    // тут нечем и незачем.
    const visible = items
        .filter(item => item.evaluate?.status !== 'error')
        .slice()
        .sort((a, b) => new Date(b.cd || 0) - new Date(a.cd || 0))
        .slice(0, RECENT_COUNT);

    if (!visible.length) return null;

    return (
        <div className="card" data-testid="recent-ai-evaluations">
            <div className="card-body">
                <p className="text-dark mb-3 fw-semibold fs-14">Оценка ИИ</p>
                {visible.map(item => {
                    const ev = item.evaluate || {};
                    const score = ev.result?.score;
                    const scoreColor = score >= 7 ? STATUS_COLOR.done : score >= 4 ? STATUS_COLOR.processing : STATUS_COLOR.error;
                    return (
                        <div key={item._id} className="d-flex align-items-center justify-content-between border-dashed-bottom pb-2 mb-2"
                             data-testid="recent-ai-evaluation-item" data-item-id={item._id}>
                            <Link to={`/evaluations/${item._id}`} className="text-truncate" style={{ flex: 1, marginRight: 10 }}>
                                {getQuestionTitle(item)}
                            </Link>
                            {/* Слово статуса ("Оценено") - основным зелёным портала
                                (--bs-primary), а не бирюзовым STATUS_COLOR.done: на
                                дашборде это спокойная подпись фирменным цветом, смысл
                                несёт балл рядом, он и светофорит по порогам. */}
                            <span className="fs-12 fw-semibold me-2" style={{ color: LABEL_COLOR[ev.status] || STATUS_COLOR[ev.status] || STATUS_COLOR.pending, whiteSpace: 'nowrap' }}>
                                {STATUS_LABEL[ev.status] || ev.status}
                            </span>
                            {score != null && (
                                <span className="fw-bold" style={{ color: scoreColor, whiteSpace: 'nowrap' }}>
                                    {score}/10
                                </span>
                            )}
                        </div>
                    );
                })}
                <div className="pull-right">
                    <Link to="/evaluations" className="btn btn-light btn-sm">
                        <i className="iconoir-double-check"></i>
                        {' '}Все оценки
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default RecentAiEvaluations;
