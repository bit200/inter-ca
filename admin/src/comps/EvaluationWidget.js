import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Skeleton from 'libs/Skeleton';
import UseLocalStorage from 'libs/UseLocalStorage';

function EvaluationWidget() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastSeenDone, setLastSeenDone] = UseLocalStorage('evaluateLastSeenDone', 0);

    useEffect(() => {
        // count_only: this widget only ever needs the two numbers, not every item -
        // see itk-platform-en's getEvaluateList (controllers/evaluate.js)
        global.http.get('/evaluate-list', { count_only: 1 })
            .then(stats => {
                const { done = 0, total = 0 } = stats || {};
                setStats({ done, total, newCount: Math.max(0, done - lastSeenDone) });
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (!loading && !stats) return null;

    const progress = stats && stats.total > 0
        ? Math.round((stats.done / stats.total) * 100)
        : 0;

    return (
        <div className="card">
            <div className="card-body">
                {loading && <Skeleton count={3} abs={true} />}

                <div className="row d-flex justify-content-center border-dashed-bottom pb-3">
                    <div className="col-lg-8">
                        <p className="text-dark mb-0 fw-semibold fs-14">ИИ оценка</p>
                        <h3 className="mt-2 mb-0 fw-bold">
                            {stats ? stats.done : '—'}
                            <span className="text-muted fs-14">
                                {stats ? `/${stats.total}` : ''}
                            </span>
                        </h3>
                    </div>
                    <div className="col-lg-4 align-self-center tr">
                        <div className="d-flex justify-content-center align-items-center thumb-xl bg-light rounded-circle mx-auto">
                            <i className="iconoir-sparks h1 align-self-center mb-0 text-secondary"></i>
                        </div>
                    </div>
                </div>

                <div className="pull-right" style={{ marginTop: '15px' }}>
                    <Link
                        to="/evaluations"
                        className="btn btn-light btn-sm"
                        onClick={() => stats && setLastSeenDone(stats.done)}
                    >
                        <i className="iconoir-double-check"></i>
                        {' '}Смотреть оценки
                        {stats?.newCount > 0 && (
                            <span className="badge bg-success ms-2">{stats.newCount}</span>
                        )}
                    </Link>
                </div>

                <p className="mb-0 text-truncate text-muted mt-3 statsListHead">
                    <span className="text-success">{progress}%</span> оценено
                </p>
            </div>
        </div>
    );
}

export default EvaluationWidget;
