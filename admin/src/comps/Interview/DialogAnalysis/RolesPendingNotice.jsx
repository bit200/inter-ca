import React, {useState} from 'react';
import styles from './dialogAnalysis.module.scss';
import {formatDuration} from './dialogAnalysisFormat';
import {draftComplete, draftWithRole, initialDraft} from './speakerRolesDraft';

const CHOICES = [
    {role: 'manager', label: 'Интервьюер'},
    {role: 'client', label: 'Кандидат'},
];

function pluralTurns(count) {
    let mod10 = count % 10;
    let mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return count + ' реплика';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return count + ' реплики';
    return count + ' реплик';
}

// Оценка ответов ждёт ролей: ни разбор, ни модель не поняли, кто интервьюер, а
// кто кандидат. Человек узнаёт участника по первой фразе, отмечает роль - и
// оценка с мок-интервью по слабым ответам продолжаются сами.
export default function RolesPendingNotice({speakers, savedRoles, sending, onSubmit}) {
    let [draft, setDraft] = useState(() => initialDraft(speakers, savedRoles));
    let complete = draftComplete(speakers, draft);

    return <section className={styles.rolesNotice} data-testid="roles-pending-notice">
        <div>
            <h3 className={styles.pipelineTitle}>Отметьте, кто интервьюер, а кто кандидат</h3>
            <p className={styles.pipelineHint}>
                По записи не удалось понять роли участников. Без них ответы некому засчитать:
                отметьте роли, и оценка ответов с мок-интервью по слабым местам запустятся сами.
            </p>
        </div>

        <ul className={styles.rolesSpeakers}>
            {speakers.map(entry => <li key={entry.key} className={styles.rolesSpeaker}>
                <div className={styles.rolesSpeakerText}>
                    <q className={styles.rolesSample}>{entry.sample || 'Без распознанной речи'}</q>
                    <span className={styles.rolesMeta}>
                        {pluralTurns(entry.turns)}, {formatDuration(entry.speechMs)} речи
                    </span>
                </div>
                <div className={styles.rolesChoice} role="group" aria-label="Роль участника">
                    {CHOICES.map(choice => <button
                        key={choice.role}
                        type="button"
                        aria-pressed={draft[entry.key] === choice.role}
                        data-role={choice.role}
                        className={styles.rolesOption}
                        onClick={() => setDraft(draftWithRole(speakers, draft, entry.key, choice.role))}
                    >{choice.label}</button>)}
                </div>
            </li>)}
        </ul>

        <div className={styles.actions}>
            <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!complete || sending}
                onClick={() => onSubmit(draft)}
            >
                {sending && <span className={styles.spinner} aria-hidden="true"/>}
                Продолжить оценку
            </button>
        </div>
    </section>;
}
