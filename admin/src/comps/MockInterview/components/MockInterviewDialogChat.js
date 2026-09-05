import React, {useState} from 'react';
import MDEditor from '@uiw/react-md-editor';
import styles from '../mockInterview.module.scss';
import MyModal from '../../../libs/MyModal';


const AdvicesModal = ({ activeAdvice, setActiveAdvice }) => {
    return <MyModal
        size={'small'}
        isOpen={!!activeAdvice}
        onClose={() => setActiveAdvice(null)}
        title={'Рекомендации по ответу'}
    >
        <div className={styles.chatAdviceModalList}>
            {(activeAdvice || []).map((tip, i) => (
                <div key={i} className={styles.chatAdviceModalItem}>
                    <i className="iconoir-sparks"/>
                    <span>{tip}</span>
                </div>
            ))}
        </div>
    </MyModal>
}

const MockInterviewDialogMsg = ({
                                    msg,
                                    setActiveAdvice,
                                    index
                                }) => {
    const isQuestion = msg.type === 'question';
    const hasAdvice = !isQuestion && Array.isArray(msg.advice) && msg.advice.length > 0;

    return (
        <div key={index}
             className={`${styles.chatBubble} ${isQuestion ? styles.chatBubbleQuestion : styles.chatBubbleAnswer}`}>
            <MDEditor.Markdown source={msg.text || '—'}/>
            {hasAdvice && (
                <div
                    className={styles.chatAdviceBadge}
                    onClick={() => setActiveAdvice(msg.advice)}
                >
                    <i className="iconoir-sparks"/>
                    Есть рекомендации
                </div>
            )}
        </div>
    );
}

// Основной вопрос берём из mainQuestion (turn.question родительского turn).
// Follow-up-реплики несут собственный question (текст уточняющего вопроса
// бота) начиная с backend-фикса в mockInterviewHistoryQueue.js - для записей,
// сохранённых до фикса, этого поля в БД ещё нет, тогда как запасной вариант
// показываем mini_evaluation.feedback предыдущей реплики - это реакция бота,
// которая фактически предшествует уточняющему вопросу. Мета-реплики вроде
// "Начнём." (mini_evaluation.action === 'start_interview') из отображения
// исключаем целиком.
function buildMessages(dialog, mainQuestion) {
    const entries = dialog.filter(entry => entry.mini_evaluation?.action !== 'start_interview'
        && entry.mini_evaluation?.quality !== 'meta');

    return entries.flatMap((entry, i) => {
        const questionText = i === 0 ? mainQuestion : (entry.question || entries[i - 1].mini_evaluation?.feedback);
        const messages = [];
        if (questionText) {
            messages.push({ type: 'question', text: questionText });
        }
        messages.push({ type: 'answer', text: entry.transcript, advice: entry.advice });
        return messages;
    });
}

const MockInterviewDialogChat = ({ dialog, mainQuestion }) => {
    const [activeAdvice, setActiveAdvice] = useState(null);

    if (!Array.isArray(dialog) || !dialog.length) return null;

    const messages = buildMessages(dialog, mainQuestion);

    return (
        // <div className={'card'}>
        //     <div className={'card-body'}>
                <div className={styles.chatWrap}>
                    <AdvicesModal activeAdvice={activeAdvice} setActiveAdvice={setActiveAdvice}/>

                    {messages.map((msg, index) => (
                        <MockInterviewDialogMsg msg={msg} key={index} index={index} setActiveAdvice={setActiveAdvice}/>
                    ))}

                </div>
            // </div>
        // </div>

    );
};

export default MockInterviewDialogChat;
