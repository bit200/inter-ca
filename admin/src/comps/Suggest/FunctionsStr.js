export default `

global.SCRIPT_START_TIME = global.SCRIPT_START_TIME || new Date().getTime();

global.delay = (ms) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            onPushSmartLogs('Completed: ' + ms + 'ms')
            resolve(ms);
        }, ms)
    })
}

global.timer = (cd) => {
    return +((new Date().getTime() - cd) / 1000).toFixed(1) + 's'
}

global.smartLogs = (...args) => {
    onPushSmartLogs(args)
}
global.log = (msg) => {
    return function () {
        // console.log("logsssss", msg)
        onPushSmartLogs(msg)
    }
}

global.logReader = (msg) => {
   //console.log('aaaaa', msg)
    global.results.push(msg)

}

function onPushSmartLogs(value) {
    global.autoLogResults = global.autoLogResults || [];
    global.autoLogResults.push({ value, ms: timer(SCRIPT_START_TIME) })
}


`