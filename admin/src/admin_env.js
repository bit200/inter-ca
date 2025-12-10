

global.is_local = /localhost|192\.168\./.test(window.location.host) ? 1 : 0;

let local = 'http://' + window.location.hostname + ':6057';
let isAqa = /aqa\./gi.test(window.location.hostname)
let isKedu = /itkedu\./gi.test(window.location.hostname)
// let local = 'http://212.8.247.141:6057'
// local = 'https://api-razvitie.itrum.ru'
local = 'http://localhost:6057'

let isDemo = window.location.href.indexOf('demo.') > -1;
let isAcademy = window.location.href.indexOf('itk.academy') > -1;

let servers = {
    local: local,
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

let serverKey = global.is_local ? 'local' : isDemo ? 'demo' : isAcademy ? 'academy': isAqa ? 'aqa' : isKedu ? 'kedu' : 'def'
if (global?.is_local) {
    serverKey = 'academy'
    // isDemo = true;
}
window.env = {
    domain: servers[serverKey] || servers.def,
    isDemo,
    isAcademy,
    serverKey,
    logoImg: logoImgs[serverKey] || logoImgs.def,
    RUN_CODE_DOMAIN: 'http://localhost:4988',
    VIDEO_UPLOAD_DOMAIN: 'https://uploader.itconsult-web.ru',
    VIDEO_STATIC_DOMAIN: 'https://static.itconsult-web.ru',
    VIDEO_DOMAIN: global.is_local ? 'http://localhost:1111' : 'https://uploader.itconsult-web.ru',
    title: 'Портал развития',
    login_title: 'Портал развития',
    // login_title: 'Interview Portal',
    wo_token: false,
    redirect_after_login: '/admin/users',
    woTableSelect: true,
    nameFn: null
}

