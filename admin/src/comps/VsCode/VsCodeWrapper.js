import react, {useEffect, useRef, useState} from 'react';
import Button from "../../libs/Button";
import VsCode from "./VsCode";
import React from "react";

const VS_CODE_DELAY = 0;

export function VsCodeWrapper(props) {
    let [open, setOpen] = useState(false)
    let [preProgress, setPreProgress] = useState(false)
    let [session, setSession] = useState({})
    let [progress, setProgress] = useState(false)
    let [res, setRes] = useState({})
    let [preRes, setPreRes] = useState({})
    let [info, setInfo] = useState({})
    let [lng, setLng] = useState('')
    let [frameLoading, setFrameLoading] = useState(false)
    let sessRef = useRef();
    let {
        // session_id,
        task_group,
        exam_id,
        on_change_task_group_status,
        selected_block,
        on_change,
        extended_logs,
        theme_question,
        existing_session_history,
        branch_name = 'latest',
        type = 'client'
    } = props;
    useEffect(() => {
        document.documentElement.setAttribute('data-vs-code-open', open ? "1" : "0")
        return () => {
            document.documentElement.setAttribute('data-vs-code-open', "0")
        }
    }, [open])
    let task_group_id = task_group?._id;
    existing_session_history ??= {}
    let session_id = (existing_session_history[lng] || {}).session_id;
    console.log("qqqqq session_id4444", session_id);
    sessRef.current = session_id;

    useEffect(() => {

    }, []); // Empty dependency array means this runs only on mount/unmount


    useEffect(() => {
        lng && fullPreStartAndExec()
    }, [lng])
    useEffect(() => {
        setLng(existing_session_history.lng || '-')
    }, [task_group_id])

    async function fullPreStartAndExec(scb, is_reload) {
        let _session_id;

        if (true || !session_id) {
            let session = await preStartSession({session_id}, is_reload)
            _session_id = session?.session_id;
            // setLng(session?.lng)
            console.log("qqqqq session pre crate", session);
        }
        let xx = await startSession({session_id: _session_id}, is_reload)
        console.log("qqqqq xxxxStart session", xx);
        scb && scb()
    }


    async function preStartSession({session_id}, is_reload) {
        setPreProgress(true)
        setPreRes({})
        if (is_reload) {
            setSession({})
            console.log("qqqqq reload!!", );
        }
        let r = await http.get('/pre-start-session', {
            task_group_id,
            branch_name,
            type,
            exam_id,
            lng,
            existing_session_id: session_id || ''
        })
        console.log("qqqqq pre start_session", r, task_group_id);
        setPreRes(r)
        setSession(r.session)
        on_change({session_id: r.session_id, lng: r.lng})
        setProgress(false)

        return r;
    }


    async function startSession(opts) {
        setProgress(true)
        setRes({})

        let r = await http.get('/exec-start-session', {
            ...opts || {},
            session_id: session_id || opts?.session_id || ''
        })
        setRes(r)

        // scb && scb()
        console.log("qqqqq rrrrrrrr start session complete CALLBACK");
        setProgress(false)


    }


    return <>
        {/*Vs Task open modal {session_id || ''}*/}
        <div className={'frame-wrapper ' + (frameLoading ? 'frame-loading' : 'frame-loading2')}
        data-session-id={session_id || '-'}>
            {extended_logs && <div>
            LNG: {lng}
            SessionId: {session_id}
                <pre>{JSON.stringify(existing_session_history, null, 4)}</pre>
            </div>}
            {/*<Button*/}
            {/*    isDisabled={progress}*/}
            {/*    onClick={(scb) => {*/}
            {/*        fullPreStartAndExec(scb, true).then()*/}
            {/*    }}>Reload session</Button>*/}


            <VsCode
                open={open}
                is_fast_frame_open={true}
                setOpen={setOpen}
                on_change_task_group_status={on_change_task_group_status}
                selected_block={selected_block}
                session={session}
                is_orig={false}
                task_group={task_group}
                with_play_stop={false}
                buttons_key={'def'}
                reload_on_close={false}
                start_smart_log={res?.start_info?.smart_log}
                lng={lng}
                on_change_lng={(lng) => {
                    user.add_lng(lng)
                    setLng(lng)

                }}
                // session_id={res?.session?.session_id || session_id}
                // session={res?.session || {}}
                start_data={res?.start_info?.start_data || {}}
            ></VsCode>
        </div>
    </>
}

