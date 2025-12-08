import user from 'libs/user/user';

let mouseMove = 0;
let mouseClick = 0;
let keyDown = 0;
let pause = 0;
let actions = 0;
let attrs = {};
let tempArr = [];
let deviceCode = Storage.get('deviceCode');

const originalDate = Date;
const gmtOffsetMinutes = new Date().getTimezoneOffset();

// Example usage

let Date2 = function() {
    if (arguments.length === 0) {
        // If no arguments provided, return the current time in Moscow (UTC+3)
        const now = new originalDate();
        const offset = (180 + (gmtOffsetMinutes)) * 60 * 1000; // UTC+3 offset in milliseconds
        now.setTime(now.getTime() + offset);
        return now;
    } else {
        // If arguments are provided, create a Date object as usual
        return new originalDate(...arguments);
    }
};



window.tempArr = tempArr;
setInterval(trySendMetersToServer, 10000)
setTimeout(() => {
    trySendMetersToServer();
}, 2000)

function trySendMetersToServer () {
    let newStorageSession = Storage.get('StorageActiveSession')

    let sendingArr = [...tempArr, ...Storage.get('sendingArr') || []]
    if (!sendingArr.length) {
        return;
    }

    Storage.set('sendingArr', sendingArr)
    tempArr = [];
    global.http.post('/send-meters-by-seconds', {arr: sendingArr, deviceCode}, {wo_notify: true})
        .then(r => {
            Storage.set('sendingArr', [])
        })
        .catch(e => {
        })
}


// read all events;
setInterval(() => {
    if (!user.get_id()) {
        setToZero();
        return;
    }
    let cd = new Date2().getTime()

    actions && tempArr.push({cd, ...getMinutes(cd), deviceCode, stats: {mouseMove, mouseClick, keyDown, pause, attrs} })
    setToZero();
}, 1000)

document.addEventListener('mousemove',onMouseMove);
document.addEventListener('click',onMouseClick);
document.addEventListener('touch',onMouseClick);
document.addEventListener('keydown',onKeyDown);
document.addEventListener("visibilitychange", onPause);

function getMinutes (_cd) {
    let cd = _cd ? new Date2(_cd) : new Date2();
    function pub (v) {
        return v < 10 ? `0${v}` : v;
    }

    return {seconds: cd.getSeconds(), minutes: cd.getMinutes(), hours: cd.getHours(), odb: [cd.getFullYear(), pub(cd.getMonth() + 1), pub(cd.getDate())].join('-')}
}

function onPause (e) {
    let isActive = !document.hidden;

    pause++
    actions++

    window.onLooseFocus && window.onLooseFocus({active: isActive})
   //console.log("qqqqq [[ visibility CHANGE", isActive);

}

function onKeyDown (event) {
    keyDown++
    actions++
    // console.log('eventtttt', event.key, event)
    
    if ((event.ctrlKey || event.metaKey || event.cmdKey || event.altKey) && event.key === 's') {
        // Your custom save logic goes here
        window.listenCtrlS && window.listenCtrlS()
        event.preventDefault(); // Prevent the default browser save action
        event.stopPropagation();
        return false
    }

}

function onMouseClick(e){
    let attr = e.target.getAttribute('data-click-target');
    attrs[attr] = (attrs[attr] || 0) + 1
    mouseClick++
    actions++
}

function onMouseMove(e){
    mouseMove++
    actions++
}


if (!deviceCode) {
    function makeid(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }

    deviceCode = makeid(5) + '_' + new Date2().getTime();
    Storage.set('deviceCode', deviceCode)
}
function setToZero () {
    mouseMove = 0;
    mouseClick = 0;
    keyDown = 0;
    pause = 0;
    actions = 0;
    attrs = {};
}


export default {}
