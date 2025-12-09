import reportWebVitals from "./reportWebVitals";
import {createRoot} from "react-dom/client";
import React, {lazy, useEffect, useState, Suspense} from "react";
import _ from "underscore";
import env from "./admin_env";
import nFn from "./comps/i18/NameFn";

import Skeleton from "./libs/Skeleton";
import Login from "./libs/Login/Login";
import DefOne from "./libs/DefOne";
import DefList from "./libs/DefList";
import Fetcher from "./comps/methods/Fetcher";
import EventLoop from "./comps/EventLoop";
import CodeRun from "./comps/Suggest/CodeRun";
import RunExam from "./comps/RunExam";
import Meter from "./comps/Suggest/MeterFn";
import AudioShort, {mediaInit, recognitionInit} from "./comps/TrainMethods/AudioShort/AudioShort"
import './comps/ColorTheme'
import './scss/myStyleLow.scss'
import './scss/index.scss'
import './scss/appStyle.scss'
import './scss/app.min.scss'
import './scss/myStyle.scss'
import './scss/mobile.scss'
import './comps/Suggest/codeRun.scss'
import './scss/autoCompleteStyle.scss'

import {
    createBrowserRouter,
    RouterProvider,
    redirect,
    useLocation,
    useNavigate,
    useLoaderData,
    useParams,
    // useHistory,
    useActionData,
    Link,
    Outlet,
} from "react-router-dom";
import Storage from "./comps/Storage";
import DynamicStyle from "./comps/Suggest/DynamicStyle";
import Player from "./comps/TrainMethods/AudioShort/Player";
import Train from "./comps/TrainMethods/Train";
import DisableScreenWhenTrain from "./comps/TrainMethods/DisableScreenWhenTrain";
import TrainPage from "./comps/TrainMethods/TrainPage";
import colorTheme from "./comps/ColorTheme";
import Agreement from "./comps/Agreement";
import AutoConfirm from "./comps/AutoConfirm";
import ColorTheme from "./comps/ColorTheme";

let err = console.error;
console.error = (...args) => {
    if (/Warning: Cannot update a component/gi.test(args[0])) {
        return;
    }
    err(...args)
}
let timeout;

export const stopAnyPlay = (key) => {
    clearTimeout(timeout)
    console.log("qqqqq titlttl stopAnyPlay", key);

    try {
        myPlayer({src: ''})
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    } catch (e) {

    }
}
window.textToVoice = (params, cb, delay = 5) => {
    let {text, lng = 'ru-RU', textToVoiceTimeoutMS} = params || {};
    let speed = params.textToVoiceSpeedMSPerSymbolLimit || 100
    delay = textToVoiceTimeoutMS || (((text || '').length * speed) + 2000)
    stopAnyPlay('speech start');

    console.log("qqqqq delaydelaydelay", delay);
    timeout = setTimeout(() => {
        stopAnyPlay('textToVoice');
        cb && cb();
    }, delay)

    if ('speechSynthesis' in window) {

        const synth = window.speechSynthesis;

        text = (text || '').replace(/\`\`\`([\s\S]*?)\`\`\`/gi, '')
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; // Speech rate (1.0 is the default)
        utterance.pitch = 1.0; // Speech pitch (1.0 is the default)
        utterance.lang = lng;
        utterance.onend = () => {
            clearTimeout(timeout)
            setTimeout(() => {
                console.log("qqqqq titlttl CALLBACK");
                cb && cb();
            }, 0)
        }
        synth.speak(utterance);
    } else {
        alert("Your browser does not support the Web Speech API. Please use a modern browser.");
    }
}

let files = require.context("./comps", true, /\.(js|jsx)$/).keys();
global.Fetcher = Fetcher;

global.question_statuses = [
    {name: "Новый", status: "", desc: "1-2 дня"},
    {name: "Плохо", status: "bad", desc: "1-2 дня"},
    {name: "Норм", status: "norm", desc: "3-4 дня"},
    {name: "Хорошо", status: "good", desc: "8-10 дней"},
    {name: "Очень хорошо", status: "very_good", desc: "30 дней"},
];

function sync_components() {
    Storage.syncCategories(() => {
        global.UpdateRootFn && global.UpdateRootFn();
    });
}

// sync_components();

function getter(opts) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve({_id: 1003, name: "124xzcv"});
        }, 5000);
    });
}

function pub_menu(arr) {
    return arr.filter(it => it).map((it) => {
        return it.name ? it : {name: it, url: "/" + it.toLowerCase(), isVisible: it.isVisible};
    });
}

function to_url_arr(obj) {
    let arr = [];
    _.each(obj, (item, ind) => {
        let url = item.admin_url || ind;

        arr.push({
            path: url,
            element: <DefList props={item}></DefList>,
        });

        arr.push({
            path: url + "/:id",
            element: <DefOne props={item}></DefOne>,
        });
    });
    return arr;
}

window.vv = 12;

let isDemo = global.env.isDemo;
console.log("qqqqq isDemo", isDemo);
global.CONFIG = {
    menu: pub_menu([
        {name: "Профиль", url: "profile"},
        "HR",
        {name: "Выход", url: "/logout"},
    ]),
    header: pub_menu([
        {name: "dashboard", url: "main", icon: 'iconoir-home-simple'},
        {name: "courses", url: "courses", icon: 'iconoir-view-grid'},
        {name: "requests", url: "requests", icon: 'iconoir-chat-bubble-check'},
        {name: "exams", url: "quiz", icon: 'iconoir-peace-hand'},

        isDemo ? null : {name: "interviews", url: "interviews", icon: 'iconoir-strategy'},
        {
            icon: 'iconoir-page-star',
            name: "carrier",
            isActive(href) {
                return (href || '').indexOf('temp/project') > -1
            },
            url: "temp/features-tree", isVisible: () => {
                return ((global.user.get_info() || {}).customData || {}).isCV
            }
        },
        {isMenu: true, name: 'extraMenu'},
        {name: "profile", url: "profile", icon: 'iconoir-user'},
        {name: "video", url: "video", icon: 'iconoir-cloud-upload'},
        {
            icon: 'iconoir-search',
            name: "search", url: "search"
        },
        {name: "micTest", url: "mic", icon: 'iconoir-microphone-check'},
        {name: "suggest", url: "suggestions", icon: 'iconoir-git-fork'},
        // { name: "Таблица Вопросов", url: "table" },

    ]),
    urls: {
        suggestions: {
            woModal: true,
            woAdd: true,
            url: "/my-suggestion",
            autoSave: 500,
            edit: [{size: 12, path: "Suggest/SuggestionItem"}],
            top_filters: [
                {
                    key: "status",
                    title: "Status",
                    def_name: "All",
                    def_value: "",
                    arr: [
                        {
                            value: "edit",
                            name: "Редактирую",
                        },
                        {
                            name: "Отправлено",
                            value: "sent",
                        },
                        {
                            name: "Проверено",
                            value: "approved",
                        },
                        {
                            name: "Отменено",
                            value: "canceled",
                        },
                    ],
                },
            ],
            tabsTitle: "mySuggestions",
            tabs: [
                {
                    name: "Имя", key: "name",
                    component({item}) {
                        let name = item.name || '';
                        let N = 100;
                        if (name.length > N) {
                            name = name.substring(0, N) + ' ...'
                        }
                        return <div className={'ellipse'}>{name}</div>
                    }
                },
                {name: "Статус", key: "status"},
                // {name: 'Вопрос', key: 'question'},
                // {name: 'Пользователь', key: 'user'},
            ],
        },
        requests: {
            // woModal: true,
            // woAdd: true,
            url: "/my-client-req",
            autoSave: 500,
            edit: [
                {size: 12, key: 'name', name: 'title'},
                {size: 12, key: 'desc', type: 'md',
                    rows: 10,
                    preview: 'edit', name: 'question'},
                {size: 12, key: 'type', type: 'select', name: 'urgency',
                    items: ['-', 'norm', 'urgent']},
                {size: '12', type: 'HR'},
                {size: 12, type: 'mdPreview', key: 'answer', name: 'Ответ'},
                {size: '12', type: 'HR'},
                {size: 12, type: 'text', key: 'status', name: 'status'},
                {size: '12', type: 'HR'},

                {size: 12, Component: () => {
                    return <>
                    <small>{nameFn('warnMsg1')}<a href={`mailto:${nameFn('contactEmailValue')}`}>{nameFn('contactEmailValue')}</a></small>
                        <div></div>
                        <small>{nameFn('warnMsg3')}</small>
                    </>
                    }
                    },
                {size: '12', type: 'HR'},
                
            ],
            top_filters: [
                {
                    key: "status",
                    title: "Status",
                    def_name: "All",
                    def_value: "",
                    arr: [
                        // {
                        //     value: "edit",
                        //     name: "Редактирую",
                        // },
                        {
                            name: "Открытые",
                            value: "open",
                        },
                        {
                            name: "Ответ",
                            value: "answered",
                        },{
                            name: "Закрытые",
                            value: "closed",
                        },
                        // {
                        //     name: "Отменено",
                        //     value: "canceled",
                        // },
                    ],
                },
            ],
            tabsTitle: "MyRequests",
            tabs: [
                {
                    name: "Имя", key: "name",
                    component({item}) {
                        let name = item.name || '';
                        let N = 100;
                        if (name.length > N) {
                            name = name.substring(0, N) + ' ...'
                        }
                        return <div className={'ellipse'}>{name}</div>
                    }
                },
                {name: "Статус", key: "status"},
                {name: "Тип", key: "type"},
                // {name: 'Вопрос', key: 'question'},
                // {name: 'Пользователь', key: 'user'},
            ],
        },
        interviews: {
            woModal: true,
            modalSize: "small",
            autoSave: 200,
            url: "/my-interview",
            top_filters: [

                {
                    key: "status",
                    def_name: "All",
                    def_value: "",
                    arr: [
                        {name: "Ожидает старта", value: "waiting"},
                        {name: "Офер", value: "offer"},
                        {name: "След фаза", value: "next_stage"},
                        {name: "Не прошли", value: "bad"},
                    ],
                },
                // {
                //     key: "type",
                //     def_name: "All",
                //     def_value: "",
                //     arr: [
                //         {name: "HR", value: "HR"},
                //         {name: "Тех", value: "tech"},
                //     ],
                // },
            ],
            tabsTitle: "myInterviews",
            create: [
                {size: 12, name: "Название", key: "name"},
                {size: 12, type: "HR"},
            ],
            edit: [
                {
                    path: "Interview/Interview",
                    size: 12,
                },
            ],
            tabs: [
                {name: "Название", key: "name"},
                {name: "Проблем", key: "problemQuestions"},
                {name: "Вопросов", key: "questionsSize"},
                {name: "Клинет", key: "client"},
                {name: "Тип", key: "type"},
                {name: "Статус", key: "status"},
                {name: "Дата", key: "date", type: 'day'},
            ],
        },
        quiz: {
            woModal: true,
            modalSize: "small",
            autoSave: 200,
            url: "/my-exam",
            tabsTitle: "myExams",
            top_filters: [
                {
                    key: "status",
                    def_name: "All",
                    def_value: "",
                    arr: [
                        {name: "Ожидают", value: "waiting"},
                        {name: "Начались", value: "started"},
                        {name: "Закончились", value: "submitted"},
                    ],
                },
            ],
            woAdd: true,
            edit: [
                {
                    path: "RunExam",
                    size: 12,
                },
            ],
            tabs: [
                {name: "Название", key: "name"},
                // {name: '%', key: 'perc'},
                // {name: 'Теор Квиз %', key: 'quizPerc'},
                {name: "Статус", key: "status",},
                {name: "Старт", key: "startCd", type: "date"},
                {name: "Сабмит", key: "submitCd", type: "date"},
                // {name: 'Дата', key: 'date'},
            ],
        },

    },
};

let admin_urls = to_url_arr(global.CONFIG.urls);
const router = createBrowserRouter([
    {
        path: "/",
        element: <Root/>,
        children: [
            {
                path: "profile",
                element: Loader("Profile")(),
            }, {
                path: "search",
                element: Loader("Search")(),
            },
            {
                path: "table",
                element: Loader("Suggest/Table")(),
            },
            {
                path: "dashboard",
                element: Loader("Dashboard")(),
            },
            {
                path: "run",
                element: Loader("CodeRunWrap")(),
            },
            {
                path: "run-by-quiz",
                element: Loader("CodeRunWrapQuiz")(),
            }, {
                path: "video",
                element: Loader("UploadVideo")(),
            }, {
                path: "file",
                element: Loader("UploadFile")(),
            },
            {
                path: "quiz/:id",
                element: Loader("RunExam")(),
            },
            {
                path: "courses/:id",
                element: Loader("Suggest/CourseDetails")(),
            },
            {
                path: "courses",
                element: Loader("TrainMethods/CoursesListOld")(),
            }, {
                path: "mic",
                element: Loader("MicTest")(),
            },
            {
                path: "main",
                element: Loader("TrainMethods/CoursesList")(),
            },

            {
                path: '/temp', element: <TempEl/>, children: [
                    {
                        path: "features-tree",
                        element: Loader('CvTree/Tree')()
                    }, {
                        path: "projects",
                        element: Loader('CvTree/ActiveProjects')()
                    },
                ]
            },
            {
                path: "train",
                element: <TrainPage/>,
            },
        ].concat(admin_urls),
    },
    {
        path: "404",
        element: <div>404</div>,
    },    {
        path: "agreement",
        element: <Agreement />,
    },

    {
        path: "login",
        element: <Login/>,
    },
    // {
    //     // path: 'test/:id',
    //     // element: <RunExam/>
    // },
]);


function TempEl () {

    function isProject () {
        return window.location.href.indexOf('project') > -1
    }
    return <>
        <div className="card22">
            <div className="card-body22">
                <ul className="nav nav-tabs mb-3" role="tablist">
                    <li className={"nav-item "} role="presentation">
                        <Link className={"nav-link fw-medium " + (isProject() ? 'active' : '')} data-bs-toggle="tab"
                              to={'/temp/projects'}>{t('projects')}</Link>
                    </li>
                    <li className="nav-item" role="presentation">
                        <Link className={"nav-link fw-medium " + (!isProject() ? 'active' : '')} data-bs-toggle="tab"
                              to={'/temp/features-tree'}>{t('treeFunctional')}</Link>
                        {/*<a className="nav-link fw-medium" data-bs-toggle="tab" href="#gallery" role="tab"*/}
                        {/*   aria-selected="false" tabIndex="-1">Gallery</a>*/}
                    </li>
                </ul>
            </div>
        </div>

        <>
        <Outlet></Outlet>
        </>
    </>
}


function Loader(path) {
    function def() {
        return function (props) {
            return <Skeleton label={path}></Skeleton>;
        };
    }

    try {
        let _path =
            "./" +
            path.replace(".js", "").replace("./", "").replace(/^\//gi, "") +
            ".js";

        if (files.indexOf(_path) > -1) {
            let Comp = require("./comps/" + path).default;
            return function (props) {
                return <Comp props={props}></Comp>;
            };
        } else {
            //console.log("*........ ## AA FALSE", files);
            return def();
        }
    } catch (e) {
        //console.log("*........ ## root eee", e);
        return def();
    }
}

global.Loader = Loader;
var htmlElement = document.documentElement;

function Root() {
    let [count, setCount] = useState(0);

    global.UpdateRootFn = () => {
        setCount(new Date().getTime());
        setTimeout(() =>{
            ColorTheme.forceToggleTop();
        })
        setTimeout(() => {
            ColorTheme.forceToggleTop();
        }, 1000)
    };
    let location = useLocation();
    const navigate = useNavigate();


    useEffect(() => {
        let token = user.get_token();
        if (!token) {
            navigate('/login')
        }
    }, [])
    useEffect(() => {
        // mediaInit()
        htmlElement.setAttribute('data-url', window.location.pathname)
        let attr = colorTheme.getSize();
        console.log("qqqqq attr444", attr, document.body.clientWidth);
        if (attr == 'default' && document.body.clientWidth < 1200) {
            colorTheme.toggleSize();
        }

        window.scroll(0, 0);

    }, [window.location.pathname])
    global.navigate = navigate;
    global.redirect = redirect;

    // React.useEffect(() => {
    //     // console.log('*........ ## location changed');
    // }, [location]);

    let path = /team124124124/gi.test(window.location.pathname)
        ? "Layouts/Layout2"
        : "Layouts/Layout1";
    let Item = Loader(path);


    if (window.location.pathname == "/") {
        setTimeout(() => {
            // navigate('/')
            navigate("/main");
        }, 100);
    }

    return (
        <>

            <AutoConfirm></AutoConfirm>
            <DynamicStyle></DynamicStyle>
            <Item></Item>
            <Player></Player>
        </>
    );
}

// console.log('*........ ## router', router);
createRoot(document.querySelector('body')).render(
    <RouterProvider router={router}/>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

function Team(props) {
    return <div>Commented</div>;
}
