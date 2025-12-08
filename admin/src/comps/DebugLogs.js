import React, {useState} from 'react';

export function isDebugLogsFn() {
    let isDebugIds = Storage.get('isDebugIds')
    return !!(isDebugIds);
}

function DebugLogs(props) {
    //console.log('*........ ## ROOT RENDER', props);
    let isDebugLogs = isDebugLogsFn()

    if (!isDebugLogs) {
        return null;
    }
    return <div className={'debugLogs'}>
        {props.children}
    </div>
}

export default DebugLogs
