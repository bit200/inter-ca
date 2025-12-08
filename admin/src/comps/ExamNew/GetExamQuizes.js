export function getExamQuizes(exam) {
    let templateInfo = exam?.templateInfo;
    return [...templateInfo?.quizesDb || [], ...templateInfo?.audioDb || []]
}

