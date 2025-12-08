export function getExamTasks(exam) {
    let templateInfo = exam?.templateInfo;
    return [...templateInfo?.tasksDb || [], ...templateInfo?.vsTasksDb || []]
}

