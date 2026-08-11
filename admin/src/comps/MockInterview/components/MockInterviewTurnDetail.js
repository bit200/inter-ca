import React from 'react';
import styles from '../mockInterview.module.scss';
import MockInterviewEvaluationBlock from './MockInterviewEvaluationBlock';
import MockInterviewDialogChat from './MockInterviewDialogChat';
import MDEditor from "@uiw/react-md-editor";

const MockInterviewTurnDetail = ({ turn, adviceRules, metricSchemas }) => {
    if (!turn) {
        return null;
    }

    const hasDialog = Array.isArray(turn.dialog) && turn.dialog.length > 0;

    return (
        <div className={'p20'}>
            <div className={'card'}>
                <div className={'card-body'}>
                    <div className="quiz-preview animChilds">
                        <div className={styles.questionItemRow}>
                            <div className="quiz-submit-title no-select">
                                <MDEditor.Markdown source={turn.question}/>
                            </div>
                        </div>
                    </div>
                    {true && <hr/>}
                    {!hasDialog && <div className={`quiz-answer-it no-select`}>
                        <MDEditor.Markdown
                            source={turn.transcript || '—'}
                        />
                    </div>}
                    {hasDialog && <MockInterviewDialogChat dialog={turn.dialog}/>}
                </div>
            </div>
            <MockInterviewEvaluationBlock
                evaluation={turn.evaluate}
                adviceRules={adviceRules}
                metricSchemas={metricSchemas}
            />
        </div>
    );
};

export default MockInterviewTurnDetail;
