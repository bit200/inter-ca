import React, { useEffect, useState } from 'react';
import styles from '../mockInterview.module.scss';
import MockInterviewQuestionList from './MockInterviewQuestionList';
import MockInterviewTurnDetail from './MockInterviewTurnDetail';

const MockInterviewResults = ({ interview }) => {
    const rawTurns = interview.turns || [];
    const evaluateByQuestion = {};
    (interview.evaluate || []).forEach(e => {
        evaluateByQuestion[e.questionId] = e.evaluate;
    });
    const turns = rawTurns.map(turn => ({
        ...turn,
        evaluate: evaluateByQuestion[turn.question_id],
    }));
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [adviceRules, setAdviceRules] = useState([]);
    const [metricSchemas, setMetricSchemas] = useState([]);

    useEffect(() => {
        global.http.get('/eval-advice-rule', { per_page: 200 }).then(r => setAdviceRules(r.items || []));
        global.http.get('/eval-metric-schemas').then(r => setMetricSchemas(r.items || []));
    }, []);

    if (!turns.length) {
        return (
            <div className={styles.card}>
                <p className={styles.cardName}>{interview.name}</p>
                <div className={styles.noInfo}>Результаты пока недоступны</div>
            </div>
        );
    }

    return (
        <div className={`mainCont2 row`}>
            <div className="col-sm-3 sticky3">
                <MockInterviewQuestionList
                    turns={turns}
                    selectedIndex={selectedIndex}
                    onSelect={setSelectedIndex}
                />
            </div>
            <div className="col-sm-9 sticky3">
                <MockInterviewTurnDetail
                    turn={turns[selectedIndex]}
                    adviceRules={adviceRules}
                    metricSchemas={metricSchemas}
                />
            </div>
        </div>
    );
};

export default MockInterviewResults;
