--bs-body-bg
--bs-secondary-bg
HR: --bs-card-color


Проверка страницы кураторов


- Интеграция стеков в интервью

-- RELEASE RELEASE RELEASE RELEASE --------------------------------------------
- VS CODE - лайвкодинг
- Buggy with audio preview functionality
- Lock system if open intrview
- my-interview api update to keep UsersByStats relative only (do not rewrite)
  - Does it make sense to save usersByStats in another table???
- 
- Golden Answer
- Course Digest 1000

# Video Short
Interview Split on shorts - Watch 1hour shorts daily
Create favorite from Audio & Videos
Golden answers list

# future
Exam - load quizes - quiz/audio/code count balance
Remove Questions recently repeated - btn to download ALL
Courses & Questions - datepicker for admin

Smart Exam template
- based on course and load Quizes in a time of start
- show more details
- AQ for admin - is it easy possible?
- live coding render скатал line
- 
- Live coding replace dynamic variables
- Code Compare - show results
- ???? Additional questions intergration???
- sales (assign Users to interview)
  Text errors for questions completion

- Interview Questions
  - Suggests
- Загрузка только вопросов в рамках свовего стека

~~~~~~~
ffmpeg -i input.mp4 -ss 00:00:00 -to 00:10:00 -c copy output1.mp4
~~~~~~~
- API
  - Save Duplicate & New history
  - InterviewQuestion isValid property??

- Find Duplicates
- Поиск по вопросам
--------

- Q Модал
  - Едит тег
  - едит вордс
  - Mark as duplicate

- Поиск по словам
  - Подсветка слов
  - Серч по ключевым словам

- Moderator Tag Modal (or Page)
  - Questions list with change hashTags
  - Create new HashTag
  - Combine Two Hashtags
  - Find not LeafFinal questions
  
--------
- Stack filter for questions
  - У каждого стека есть хэш теги родительские

-------
- Find Duplicate question

- Find Question & Tag by String
  - Load auto suggests (by words, by tags, by keywords)
  - 
- Type problem
- Search by Words
  - Good Words
  - Show tags for a question
---------
# Add Question
Individual rate for interview question (not global)
Questions add in system after curator's update - not directly from interview page
Finalize Design interview Page

- Interview API integration

- Set Time End automatically? yes

- Total interview Percentage

- On click next - add start time based on last end time (or current video Time)
  - start / end time problem
  
- Interview Questions
  - Suggests
  - NO duplicate - only hash tags
  - 3 options
    - Add new Question
    - Edit
    - Approve
  - What change next user( what starts from 0)
    - rate & Hashtags

  - 3 most interesting
  - 3 best answers


- Start & End

-------
BIG BIG TESTING
- Bugs:
- 
Smart life Form integration

Is Reviewed Feedback
Test Default Flow
Sessions Preview - Get Title FOr QuizHistory
Кол-во не проработанных фидбеков - не показывается корректно название фидбека

Exam results
- Keep Order & CSS for elements
- Warning to rate (red label)
- 
На данный момент вы повторили все задания
- Повторите попытку позже

Courses & interview day Filter
- Counts inside Courses & Questions

Keep sessions days filter

-----------
INterview Correct name
FB - correct name

Exam
- getSTartInd
- clearHistory
- Rate Elements AFter completion


Audio Short Update - not correctly handling hash details (title moved from the next element already)

Correct title in sessions mode

Exam Not loaded Quiz
Combine sessions - see only rate 5 sessions
Exam reender texts

Начать запись не доступна до оценки

List of questions & list of train problem. Question Id = 1076 QuizId = 1031

Какая стала типизация
- На данный момент вы повторили все задания ????? looks like a problem here
Exam CLick mic to start recording

isErr - red circle around mic
Exam Mode Do not play Audio
Auto-interview play button on everything

Admin Courses & Questions
- Get Quizes list & Quizes stats

Admin Train2 Page  - user selector in top
JS-task special tasks - not sending correctly Name
-------

LONG JS-tasks Text to speech
- Small Title for JS_tasks and other tasks


Stat times update to UTC+3

- Questions List - Quizes Count is 0
- Temp QUestion 1055 - 1040 ID is changed

Mic not working - alert with modal
- error callback to stop timer and everything

MicTestPage
- Stop Playing after reopening next Audio item
- Close Player

Recognition Speed - recognition SpentTime is not working as expected
autoPlay for elements
Interview Msg - play not working correclty
Play msg - if played start - then need to stop playing
Recording system fix
--------
Reivew Answer Level inside interview Page

Новый вопрос
- interview Add items
- 
- label for not answered questions
- 
- Quiz Timeout Toggle - need to reload
  - Need correctly reload timers!!!
  - Timers to save in localStorage or somewhere



- Перезаписать еще раз - недоступна до оценки
Train - fix calcs - not correctly building sessions

Load trains
- Config File {new, old, audio} Based
- Remove Recently repeated 30%

Quiz
- Time
- %
- Count
- Type (audio, code, quiz)
- Sorted Quiz Order -th (1-st, 2-nd etc.)
-
- Question Time
- Question %
- Quiz Time
- Quiz %
- Quiz Count
- Question Count

------
- GET START INDEX FOR EXAM PAGE
- Admin give feedback = loose quizId and QuestionId
- А ты что сам думаешь?
  - не открывается тренировка

General titles
- Поясните решение
- Add question special type
- 
-------
- Get start index BUG
Exam Page
- Reopen Exam (start index)
- Final Page - rate exam items

- Exam Page passing - hash is not regenerating correctly
- Toggle Quiz Admin page - do not do anything
- Feedbacks for exam page - prevent quiz
- isOpen Open Count
- Test Exam Mode
- Test Train Mode
- Test Feedback Mode
- 
Integrate DB:
http://localhost:6057/api/load-quizes-by-module?question=1035&_id=1005
http://localhost:6057/api/load-by-any?items%5B0%5D%5Bquestion%5D=1034&isExam=undefined
http://localhost:6057/api/user-start-exam?_id=1153


# video uploading
Create static subdomain name
Insert links on uploaded files

Test & Fix 10 bugs

-------

- Admin - smart session filter to check results
- QuizHistory. Intergrate Exam Field inside the client UI
Admin Train Page
- CodePreview - render that component (with typing results)
- For type 'General' => insert default name

Bug
- Блок оценки не выставляет балл

- API rating problem - fix to send Feedbacks to client page

Admin Exam QuizPreview
Rate Component
- Ability to add feedbacks from exam Quiz Items
- callback
  - global.http.post('/recalc-exam', {exam})
  - 
- EndpointURL1
- EndpointURL2
- isCode props
- 
-------
- LiveCoding force Compare Answer => compare with correct variant
  - do not show resutls - only on review page
- render duration
- render recognized text123
- render correct statsus
- Ability to track Code Changes in live time during play changes

-------
Submit Exam API;
- LOGS: q CHECK CORRECT!!!!!!!
  http://localhost:6057/api/submit-task-by-user?_id=1188
Rate Answer Exam Submit Page 
render quiz on submit page
Code preview IS CORRECT calc functionallity
- 
- LiveCoding one answer or file(s)?
- 
# Quiz Integration
- QUIZAdmin Add/Edit
  - LiveCoding multi files in admin mode (Quizes)
  - LiveCodeing - is 1 answer
  - isValid = has to be red
  - LiveCoding Language selector



--------
- render code multi files??
- Score LiveCoding???
- Code Preview Listen audio on change
- Live Coding Admin Listen and Watch
Exam Page - admin UI to track code changes
Rate LiveCoding - AudioRate & CodeRate
- LiveCoding + Audio Client
Exam page with new quizes
- Audio don't do anything on reopen it (exam mode)
--------
- Save live coding code session results
- Save Code Sessions into server API
- Click between 2 audios not working correctly
- Exam selected Item cannot click Again;
- Exam Mode - click QUiz - then Audio then move back and click Quiz again - drop timeout
- InitTimers() from db forExam
- Start, Stop, ReStart, Attempt, Submit, Next
Upload copy link to ClipBoard
Upload size & duration limit
Instruction for compression video
-------
Quiz in Read http://localhost:6057/api/load-quizes-by-module?question=1035&_id=1005
Live coding preview
INterview page Client UI refactoring

---------
Add video uploading component in system
Interview Page Client. First UI/UX
Реализовано флоу модального окна для редактирования интервью
Продуман концепт добавления интевью на странице клиента
Протестирована загрузка и раздача картинок по чанкам
test open AI to check Questions


--------
**Comment**
- Admin feedback is growTags based
- Admin feedback with comment??
-
Stats
- Сколько курсов открыл - вопросов в модулях и т.д.

- Stats
    - Интервью / Успехи и т.д.
    - Вопросы -> Сколько Новых вопросов
-
- integrate FB in admin page
- Admin Design Feedbacks
- Вопросы на повторение - limit the amount of questions
- Admin
  Design Work Sessions
-
Front
- FB
- Время обработки ОС: 20мин
- % соответствия оценок
- Цвета для фидбеков
- Design Front Page
- Превью самого фидбека
- вывод имени в фидбеке
- double click Audio Record - prevent if already playing in exam
- Result pages after screening
- Modals for Feedbacks
- Modal for Interviews

- Add total Attempts for a Quiz
- SmartClick for all actions & replace CSS
- Next button available
- Интервью - добавить цвета кружочков

------

- Reload on close modal
- Check Calc Algorithm - doesn't work for train
- Not correctly tracking params

- Questions
    - Questions - filter it
    - Not start Train still not opened courses?
    - group based for {new: 15, on5: 1, lastRepeat: 8}
    -
Admin
Courses / Modules / Questions
Stats
Front
Stats Front Page (and Admin Too)
- Open Course to Read it
- Hide Still not open Questions in course
-

- Формирование ответов

- Paul's login system
- Личные статусы изучения по вопросу
- Профиль силы / Progress by tasks
- TRAIN SYSTEM: Tasks to train questions one by one
- Profile


- Добавление тем у вопросов без тем
-
- Stats
    - По человеку



################################
- Пересчет всех вопросов и т.д.
- User to create own interview
