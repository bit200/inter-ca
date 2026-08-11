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
                <div key={i} className={styles.chatAdviceModalItem}>{tip}</div>
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

const MockInterviewDialogChat = ({ dialog }) => {
    const [activeAdvice, setActiveAdvice] = useState(null);

    if (!Array.isArray(dialog) || !dialog.length) return null;

    const messages = dialog.flatMap((turn) => ([
        { type: 'question', text: turn.question },
        { type: 'answer', text: turn.transcript, advice: turn.advice },
    ]));

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
