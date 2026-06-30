import React, { useEffect, useState } from 'react';
import UseLocalStorage from '../../libs/UseLocalStorage';
import styles from './evaluationList.module.scss'
import EvaluationListItemGroup from "./components/EvaluationListItemGroup";
import {groupItems} from "./evaluate-list.utils";

function EvaluationList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [, setLastSeenDone] = UseLocalStorage('evaluateLastSeenDone', 0);
    const [groupMode, setGroupMode] = useState('exam');
    const done = items.filter(it => it.evaluate?.status === 'done').length;
    const groups = groupItems(items, groupMode);

    useEffect(() => {
        global.http.get('/evaluate-list', {}).then(data => {
            const list = data || [];
            setItems(list);
            setLastSeenDone(list.filter(it => it.evaluate?.status === 'done').length);
        }).finally(() => setLoading(false));
    }, []);


    if (loading) {
        return <div style={{ padding: 20 }}>Загрузка...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h4>Оценки ИИ</h4>
                <span>{done}/{items.length} оценено</span>
                <div>
                    {['exam', 'module'].map(mode => (
                        <button key={mode} onClick={() => setGroupMode(mode)}
                            className={'btn btn-sm ' + (groupMode === mode ? 'btn-primary' : 'btn-light')}>
                            {t(mode === 'exam' ? 'by_exam' : 'by_module')}
                        </button>
                    ))}
                </div>
            </div>

            {!groups.length && <div className={styles.noInfo}>Нет оценок</div>}
            {groups.map(({ key, items: groupRows }) => {
                const examId = groupMode === 'exam' ? key : null;
                const label = groupMode === 'exam' ? `Экзамен #${key}` : key;
                return <EvaluationListItemGroup key={key} examId={examId} label={label} items={groupRows} />;
            })}
        </div>
    );
}

export default EvaluationList;
