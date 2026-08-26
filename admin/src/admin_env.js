

global.is_local = /localhost|192\.168\./.test(window.location.host) ? 1 : 0;

let local = 'http://' + window.location.hostname + ':6057';
let isAqa = /aqa\./gi.test(window.location.hostname)
let isKedu = /itkedu\./gi.test(window.location.hostname)
// let local = 'http://212.8.247.141:6057'
// local = 'https://api-razvitie.itrum.ru'
local = 'http://localhost:6057'

let isDemo = window.location.href.indexOf('demo.') > -1;
let isAcademy = window.location.href.indexOf('itk.academy') > -1;
// Домен стейджинга (staging-app.itk.academy) сам по себе попал бы под isAcademy ниже и
// молча стучался бы в боевой api-razvitie.itk.academy — проверяем его первым.
let isStaging = /^staging/i.test(window.location.hostname);
// Прод-хост (portal.itk.academy) тоже содержит "itk.academy" и попал бы под isAcademy,
// уйдя мимо nginx-прокси этого же хоста прямо на api-razvitie.itk.academy — проверяем его
// раньше isAcademy и ходим по относительному /api, который nginx проксирует на бэкенд.
let isProd = /^portal\./i.test(window.location.hostname);

let servers = {
    local: local,
    staging: 'https://staging-api-razvitie.itk.academy',
    prod: window.location.origin + '/api',
    aqa: 'https://aqa-api.javacode.ru',
    demo: 'https://demo-api.itk.academy',
    academy:  'https://api-razvitie.itk.academy',
    kedu:  'https://api.itkedu.com',
    def:  'https://api-razvitie.itrum.ru'
}
let Demo =  {
    login: <>
        <img src={'/st/logoSk.svg'} height={25} style={{opacity: .8}}/>
        {/*<div style={{marginTop: '10px'}}></div>*/}
        {/*Портал Развития*/}
    </>,
    main: <img src={'/logos/academy/logo_vert.png'} height={100} />,
}


let logoImgs = {
    def: {
        login: 'Портал развития',
        main: 'Развитие',
    },
    aqa: {
        login: 'Портал Развития',
        main: 'Развитие',
    },
    demo: Demo,
    academy: Demo,
}

let serverKey = global.is_local ? 'local' : isStaging ? 'staging' : isProd ? 'prod' : isDemo ? 'demo' : isAcademy ? 'academy': isAqa ? 'aqa' : isKedu ? 'kedu' : 'def'
if (global?.is_local) {
    // serverKey = 'academy'
    // isDemo = true;
}

// Аплоадер аудио-надиктовок (AudioShort/Player) — свой сервис на каждое окружение,
// т.к. домены разные и live-запись должна писаться не в общий прод-сторедж.
// Статика (уже загруженные файлы) отдаётся отдельно через S3 — сюда не относится.
let videoUploaders = {
    local: 'http://localhost:1111',
    staging: 'https://staging-api-razvitie.itk.academy/uploader',
    def: 'https://uploader.itconsult-web.ru',
}

window.env = {
    domain: servers[serverKey] || servers.def,
    // Хэш коммита и время сборки — прокидываются в билд деплой-скриптом (REACT_APP_BUILD_SHA/
    // REACT_APP_BUILD_TIME) для отображения версии на экране логина и в логах при деплое.
    buildSha: process.env.REACT_APP_BUILD_SHA || 'dev',
    buildTime: process.env.REACT_APP_BUILD_TIME || '',
    isDemo,
    isAcademy,
    serverKey,
    logoImg: logoImgs[serverKey] || logoImgs.def,
    RUN_CODE_DOMAIN: 'http://localhost:4988',
    VIDEO_UPLOAD_DOMAIN: 'https://uploader.itconsult-web.ru',
    VIDEO_STATIC_DOMAIN: 'https://static.itconsult-web.ru',
    VIDEO_DOMAIN: videoUploaders[serverKey] || videoUploaders.def,
    title: 'Портал развития',
    login_title: 'Портал развития',
    // login_title: 'Interview Portal',
    wo_token: false,
    redirect_after_login: '/admin/users',
    woTableSelect: true,
    nameFn: null
}

