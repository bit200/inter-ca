import React, {useEffect, useRef, useState} from 'react';
import './VsCode.css'
import VsIframe from "./VsIframe";
import axios from "axios";
import RenderDebugApiLogs from "./RenderApiLogs";
import MyModal from "../../libs/MyModal";
import SessionLogs from "./SessionLogs";
import VsSessionStatus from "./VsSessionStatus";
import Select from "../../libs/Select";
import Button from "../../libs/Button";
import {sseFetch} from "../SseFetch";
import {UnitResults} from "./UnitResults";
import SolutionDetails from "./SolutionDetails";

function send_server_old_with_session(session, query, scb, opts) {
    let {close_vs_code, open_smart_logs, on_push_api_logs} = opts || {}
    query.session_id = session.session_id;
    if (query.close_vs) {
        close_vs_code()
    }
    axios.get(session.server_http + '/api/cmd_run', {params: query}).then((r) => {
        console.log("qqqqq rrrrr SErVEr SENDEr", r);
        if (query.is_lazy) {
            open_smart_logs(new Date().getTime())
        }
        reload_on_close = query.reload_on_close;
        on_push_api_logs({query, res: r.data, server_http: session.server_http})
        scb && scb(r?.data)
    }).catch(() => {
        scb && scb()
    })
}

let timer = null;
let active_ind = 0;
let is_started = false;
let reload_on_close = false
let buttons_fn = ({
                      on_tests,
                      session,
                      on_change_history_arr,
                      open_smart_logs,
                      start_data,
                      close_vs_code,
                      open_type, show_logs_modal, on_push_api_logs, set_open_type
                  }) => {
    console.log("qqqqq start_data", start_data, session);


    function send_server_old(query, scb) {
        send_server_old_with_session(session, query, scb, {close_vs_code, open_smart_logs, on_push_api_logs})
    }

    let send_server = send_server2;

    function send_server2(query, scb) {
        query.session_id = session.session_id;
        if (query.close_vs) {
            close_vs_code()
            scb && scb();
        }
        axios.get(session.server_http + '/create_cmd_for_session', {params: query}).then((r) => {
            console.log("qqqqq rrrrr SErVEr SENDEr", r);
            scb && scb();
        }).catch(() => {
            scb && scb()
        })
    }


    return {
        def: [
            {
                name: '+ Фулл тесты',
                action: (scb) => {
                    on_tests && on_tests(scb);
                    // send_server(
                    //     {
                    //         type: 'full_test_new'
                    //     }, scb)
                }
            },
            {
                name: '+Старт авто',
                action: (scb) => {
                    send_server2({
                        type: 'terminal',
                        cmd: 'start_auto',
                        name: 'itk terminal'
                    }, scb)
                }
            }, {
                name: '+Мануал',
                action: (scb) => {
                    send_server2({
                        type: 'terminal',
                        cmd: 'kill',
                        name: 'itk terminal'
                    }, scb)
                }
            },
            {
                name: '+Логи',
                action: (scb) => {
                    send_server2({
                        type: 'terminal',
                        cmd: 'logs',
                        name: 'itk terminal'
                    }, scb)
                }
            },
            {
                name: '+Открыть решение',
                action: (scb) => {
                    set_open_type('solution')
                    send_server_old({
                        type: 'session_toggle_source',
                        sub_folder_from: 'solution-itk-livecoding'
                    }, scb)
                }
            },
            {
                name: '+ Стоп юзер сессия(ФуллТест)',
                action: (scb) => {
                    send_server(
                        {
                            close_vs: true,
                            type: 'stop_user_session'
                        }, scb)
                }
            },
            {
                name: '+Открыть превью',
                action: (scb) => {
                    send_server({
                        type: 'terminal',
                        cmd: 'kill',
                        name: 'itk terminal'
                    }, scb)
                }
            }, {
                name: '+ UP hist arr',
                action: (scb) => {
                    send_server(
                        {
                            type: 'upload_hist_folder'
                        }, scb)
                }
            }, {
                name: '+ Сохранить влкадки',
                action: (scb) => {
                    send_server(
                        {
                            type: 'save_open_tabs'
                        }, scb)
                }
            }, {
                name: '+Локал тесты',
                action: (scb) => {
                    send_server({
                        type: 'terminal',
                        cmd: 'test',
                        name: 'itk test'
                    }, scb)
                }
            }, {
                name: '+ Стоп юзер сессия(Квик)',
                action: (scb) => {
                    send_server(
                        {
                            close_vs: true,
                            type: 'purge_session'
                        }, scb)
                }
            }, {
                name: 'Завершить сессию (Клиент)',
                action: (scb) => {
                    send_server({type: 'admin_session_to_source'}, scb)
                }
            },
            {
                name: '+Синк Фром',
                action: (scb) => {
                    send_server({
                        type: 'terminal',
                        cmd: 'sync_from',
                        name: 'itk terminal'
                    }, scb)
                }
            },
            {
                name: '+То прод (Сорс)',
                action: (scb) => {
                    send_server({
                        type: 'session_source_to_prod',
                        open_type: open_type,
                        is_lazy: true,
                        reload_on_close: true
                    }, scb)
                }
            }, {
                name: '+То прод (А)',
                action: (scb) => {
                    send_server({
                        type: 'session_all_to_prod',
                        is_lazy: true,
                        reload_on_close: true
                    }, scb)
                }
            },
            {
                name: 'Сохранить активные вкладки',
                action: (scb) => {
                    send_server({type: 'admin_session_to_source'}, scb)
                }
            }, {
                name: '+Создать патч',
                action: (scb) => {
                    send_server({
                        type: 'create_patch'
                    }, scb)
                }
            }, {
                name: '+Аплоад патч',
                action: (scb) => {
                    send_server({
                        is_lazy: true,
                        type: 'upload_patch_s3'
                    }, scb)
                }
            }, {
                name: '+Apply патч',
                action: (scb) => {
                    send_server({type: 'apply_patch'}, scb)
                }
            }, {
                name: '+Dwn патч',
                action: (scb) => {
                    send_server({
                        type: 'download_patch'
                    }, scb)
                }
            }, {
                name: '+Резет сорс в дефолт',
                action: (scb) => {
                    send_server({type: 'reset_session_to_default'}, scb)
                }
            }, {
                name: '+Открыть сорс',
                action: (scb) => {
                    set_open_type('client')
                    send_server({
                        type: 'session_toggle_source',
                        sub_folder_from: 'itk-livecoding'
                    }, scb)
                }
            }, {
                name: '+Открыть прев сорс',
                action: (scb) => {
                    set_open_type('prev_source')
                    send_server({
                        type: 'session_toggle_source',
                        sub_folder_from: 'prev-itk-livecoding'
                    }, scb)
                }
            },
            {
                name: '+Открыть Фулл (а-сорс)',
                action: (scb) => {
                    set_open_type('admin')
                    scb && scb()
                    // send_server({
                    //     type: 'admin_session_to_source'
                    // })
                }
            }, {
                name: '+Открыть Фулл (компил)',
                action: (scb) => {
                    set_open_type('compiled-admin')
                    scb && scb()
                    // send_server({
                    //     type: 'admin_session_to_source'
                    // })
                }
            }, {
                name: '+Открыть Терминал',
                action: (scb) => {

                    send_server({
                        type: 'terminal',
                        cmd: 'clear',
                        name: 'itk terminal'
                    }, scb)
                }
            }, {
                name: '+Закрыть терминал',
                action: (scb) => {
                    send_server({
                        type: 'terminal',
                        cmd: 'close_all_terminals',
                        name: 'itk terminal - close'
                    }, scb)
                }
            }, {
                name: '+Пулл с сорса',
                action: (scb) => {

                    send_server({
                        type: 'session_toggle_source',
                        sub_folder_from: 'itk-livecoding'
                    }, scb)
                }
            }, {
                name: '+Пулл с прева',
                action: (scb) => {
                    send_server({
                        type: 'session_toggle_source',
                        sub_folder_from: 'prev-itk-livecoding'
                    }, scb)
                }
            }, {
                name: '+Пулл с солюшина',
                action: (scb) => {
                    send_server({
                        type: 'session_toggle_source',
                        sub_folder_from: 'solution-itk-livecoding'
                    }, scb)
                }
            }, {
                name: '+Релоад vs_code',
                action: (scb) => {

                    let _open_type = open_type;
                    set_open_type('stop')
                    setTimeout(() => {
                        set_open_type(_open_type)
                        scb && scb()
                    }, 500)

                }
            }, {
                name: '+ Show logs',
                action: (scb) => {
                    scb && scb()
                    show_logs_modal()
                }
            }, {
                name: '+ SEss_config',
                action: (scb) => {
                    send_server({
                        is_lazy: true,
                        type: 'get_or_load_session_config',
                    }, scb)
                }
            }, {
                name: '+Export logs s3',
                action: (scb) => {
                    send_server({
                        type: 'upload_session_logs_to_s3',

                    }, scb)

                }
            }, {
                name: '??Экспорт для локал дебага',
                action: (scb) => {
                    send_server({type: 'admin_session_to_source'}, scb)
                }
            }, {
                name: '+ История юзер сессия',
                action: (scb) => {
                    send_server({type: 'get_patch_hist_list'}, (r) => {
                        scb && scb()

                        let obj = r?.v?.obj || {};
                        let keys = _.sortBy(Object.keys(obj))
                        let diff_keys = keys.filter(it => obj[it]?.diff)
                        let smart_keys = [];
                        let diff = 0;
                        let tabs = 0;

                        _.each(keys, (item, ind) => {
                            tabs = obj[item].tabs ? item : tabs;
                            diff = obj[item].diff ? item : diff;
                            smart_keys.push({
                                tabs, diff,
                                key: item
                            })
                        })

                        on_change_history_arr && on_change_history_arr({
                            obj, keys,
                            smart_diff_keys: smart_keys.filter(it => it.key == it.diff),
                            smart_keys, diff_keys
                        })
                    })
                }
            },]
    }
}

function _send_server(session, query, scb) {
    query.session_id = session.session_id;
    axios.get(session.server_http + '/api/cmd_run', {params: query})
        .then((r) => {
            scb && scb(r?.data)
        })
}

function VsCode({
                    task_group,
                    on_change,
                    on_change_task_group_status,
                    lng,
                    on_change_lng,
                    selected_block,
                    is_fast_frame_open,
                    with_play_stop,
                    is_orig,
                    start_smart_log,
                    open, setOpen, buttons_key, color = 1,
                    session,
                    session_id,
                    start_data, size = 'sm'
                }) {

    start_data ??= {}
    let [task_group_status, set_task_group_status] = useState('')
    let [open_ind, set_open_ind] = useState(0)
    let [open_solution, set_open_solution] = useState(false)
    let [open_unit, set_open_unit] = useState(false)
    let [unit_messages, set_unit_messages] = useState([])
    let [unit_response, set_unit_response] = useState(null)
    let [active_hist, set_active_hist] = useState(0)
    let [hist_obj, set_hist_obj] = useState({})
    let [is_vs_logs, set_is_vs_logs] = useState(false)
    let [api_logs, set_api_logs] = useState([])
    let [open_type, set_open_type] = useState(session?.sub_type || session?.type)

    let onTestFn = useRef(null);
    onTestFn.current = onTests

    function onTests(scb) {
        console.log("qqqqq msgggg on testss!!!!", session);
        scb && scb()
        set_open_unit(true)
        set_unit_response(null)
        set_unit_messages([{name: 'Save session'}])


        fetch(`${session?.server_http}/create_upload_session_patch?session_id=${session?.session_id}`).then(async r => {
            let body = await r.json();
            set_unit_messages([{name: 'Start testing'}])
            console.log("qqqqq r1111111111 {create_upadload_session_patch}", body);
            sseFetch({
                url: session?.server_http + '/full_test_new_sse',
                query: {session_id: session?.session_id},
                on_msg: (msg) => {
                    console.log("qqqqq msgggg", msg);
                    set_unit_messages([msg])
                },
                on_response: (data) => {
                    set_unit_response(data)
                    console.log("qqqqq msgggg on Response", data);
                }
            })
        })

    }


    let buttons_obj = buttons_fn({
        on_tests: onTestFn.current,
        set_open_type, open_type, start_data, session,
        close_vs_code: () => {
            setOpen(false)
        },
        open_smart_logs: () => {
            set_open_ind(new Date().getTime())
        },
        show_logs_modal: () => {
            set_is_vs_logs(true)
        },
        on_change_history_arr: (r) => {
            set_hist_obj(r)
        },
        on_push_api_logs: (info) => {
            set_api_logs([
                {data: info?.res?.data, ...info, fake_id: new Date().getTime() + '_' + Math.random().toFixed(10)},
                ...api_logs].filter((it, ind) => ind < 10))
        }
    })

    function isLng(text) {
        // let lngs = ['js', 'ts', 'ruby', 'python']
        return lngs.indexOf(text) > -1
    }


    useEffect(() => {
        let obj = {
            'Закрыть редактор': () => {
                setOpen(false)
            },
            'Подсказка / решение': () => {
                set_open_solution(true)
            },
            'Завершить задачу': () => {
                onTestFn.current && onTestFn.current()
            }
        }
        const handleMessage = (event) => {
            let {data} = event || {}
            let {type, elementText} = data || {};
            console.log("qqqqq type", type, elementText, lngs);
            if (type == 'treeitemClick') {
                if (isLng(elementText)) {
                    on_change_lng(elementText)
                } else {
                    let fn = obj[elementText];
                    fn && fn();
                    console.log("qqqqq vvv!!!", fn, type, elementText);
                }

            }
        };

        // Add event listener
        window.addEventListener('message', handleMessage);

        // Cleanup function - removes the event listener when component unmounts
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [])

    useEffect(() => {
        document.body.setAttribute('open-vs', open ? 1 : 0)
    }, [open])

    useEffect(() => {
        if (session?.session_id) {
            global.http.get('/get-task-group-status', {session_id: session?.session_id}).then(r => {
                set_task_group_status(r.status)
                on_change_task_group_status && on_change_task_group_status(r.status)
            })
            set_open_type(session?.sub_type || session?.type)
        }
    }, [session?.session_id]);
    useEffect(() => {

        return () => {
            on_stop()
        }
    }, [])


    let buttons = buttons_obj[buttons_key] || buttons_obj['def']
    let orig_str = is_orig ? '&orig=1' : ''
    let url = open_type == 'stop' ? '' : start_data.vscode_base_link + `?tkn=${session.token}${session.token}&folder=${get_folder()}${orig_str}`

    function get_folder() {
        return open_type == 'admin' ? '/.itk-source' : open_type == 'compiled-admin' ? '/.itk' : '/home/itk/itk-livecoding'
    }

    console.log("qqqqq open Type!! start_smart_log", {
        hist_obj,
        open_type,
        start_data,
        folder: get_folder(),
        session,
        start_smart_log
    });

    function on_stop() {
        is_started = false
        clearInterval(timer)
    }

    function on_start() {
        is_started = true

        active_ind = active_ind || 0;
        go(true)
        timer = setInterval(() => go(), 1000)

        function go(is_force) {
            console.log("qqqqq goggggg");
            let it = (hist_obj?.smart_diff_keys || {})[active_ind] || null
            if (!it) {
                if (is_force) {
                    active_ind = 0;
                    go()
                } else {
                    on_stop()
                }
            } else {
                on_select_active_ind(it)
            }
            active_ind++;

        }


        // if (it?.key) {
        //
        // }

    }


    function on_select_active_ind(it) {
        if (!it) {
            return;
        }
        console.log("qqqqq click element",);
        set_active_hist(it)
        _send_server(session, {
            type: 'activate_patch_history',
            patch_id: it?.diff,
            tabs_id: it?.tabs
        }, (r) => {
            console.log("qqqqq session activeate", it, r);
        })
    }


    let anim = open ? ' animChild' : ''

    function get_host(_url) {

        try {

            const url = new URL(_url);
            // const host = url.host; // "www.example.com"
            // const hostname = url.hostname;
            return url.hostname
        } catch (e) {
            return ''
        }
    }


    function getSesssionProxyUrl() {
        let is_local = /0\.0\./gi.test(session?.server_http);
        let domain = is_local ? 'http://0.0.0.0:1034' : `https://cdn1034.itk.academy`
        console.log("qqqqq {local", {is_local, domain});

        return `${domain}/itk.html?folder=/home/itk/itk-livecoding&host=${get_host(session?.server_http)}&session_id=${session?.session_id}&file=${session?.info?.start_file || ''}`
    }

    let proxyUrl = getSesssionProxyUrl()

    let lngs = task_group?.info_arr?.filter(it => it.status != 'unactive').map(it => {
        return it.lng
    }) || []
    console.log("qqqqq props4444422222222", session, session_id);
    if (!session?.session_id) {
        return <>Session loading ...</>
    }
    return <div vs-preview-open={open ? 1 : 0} className={'ib'} data-session-id={session?.session_id}>

        <MyModal
            colorMode={'dark'}
            isOpen={open_solution}
            onClose={set_open_solution}
        >
            <SolutionDetails
                selected_block={selected_block}
                open_correct_code={(scb) => {
                    set_open_type('solution')
                    send_server_old_with_session(session, {
                        type: 'session_toggle_source',
                        sub_folder_from: 'solution-itk-livecoding'
                    }, () => {
                        setTimeout(() => {
                            scb && scb();
                            set_open_solution(false)
                            let iframe = document.querySelector(`[data-frame-session-id="${session?.session_id}"]`)
                            const message = {
                                type: 'openExplorerMenu',
                            };
                            iframe.contentWindow.postMessage(message, '*');
                        }, 1000)

                    })
                }}

            ></SolutionDetails>
        </MyModal>

        <MyModal
            colorMode={'dark'}
            isOpen={open_unit}
            onClose={set_open_unit}
        >
            <h4>Unit tests</h4>
            <hr/>
            {(unit_messages || []).map((it, ind) => {
                return (<div key={ind}>
                    {it.name}
                </div>)
            })}
            <hr/>
            <UnitResults details={unit_response}
                        on_continue_course={() => {
                            setOpen(false);
                            set_open_unit(false)
                            on_change_task_group_status('ok')
                        }}
                         on_skip={(scb) => {
                             on_change_task_group_status && on_change_task_group_status('skip')
                             setOpen(false);
                             set_open_unit(false)

                             global.http.get('/skip-session', {session_id: session?.session_id}).then(r => {
                                 // setForceStatus('skip')
                                 scb && scb();
                             })
                         }}
                         on_close={() => set_open_unit(false)}></UnitResults>

        </MyModal>
        <div onClick={() => {
            axios.get(session?.server_http + '/update_session_status', {
                params: {
                    session_id: session?.session_id,
                    status: 'open_modal'
                }
            }).then((r) => {
                console.log("qqqqq rrrrr SErVEr SENDEr", r);
            })
            setOpen(true)
        }}>
            {task_group_status === 'ok' && <div>
                Вы уже успешно решили эту задачу. <a className={'link'}>Решать снова</a>
            </div>}
            {task_group_status !== 'ok' && <Button
                size={'sm'}
                onClick={(scb) => {
                    scb && scb();
                    console.log("qqqqq ",);
                }}>
                <i className="iconoir-codepen"></i>
                {t('runTaskInEditor')}
            </Button>}
            {/*TG_STATUS: {task_group_status}*/}
            {/*VsCode <a href={url}>{url}</a>*/}
            {/*<div>*/}
            {/*    Session_id: {session_id || '-'}*/}
            {/*</div>*/}
            {/*<div>*/}
            {/*    PROXY_URL: <a href={proxyUrl}>{proxyUrl}</a>*/}
            {/*</div>*/}
        </div>

        <div
            className={'custom-full-modal mycode hideLinks ' + (open ? 'open open-els' : 'custom-hidden') + anim}
        >
            <div className={"code-menu " + anim}>

                <div className="ib">
                    <Select
                        className={'form-control-sm'}
                        value={lng} items={lngs} onChange={(v) => {
                        on_change_lng(v)
                    }}></Select>
                </div>
                <Button
                    color={color}
                    size={size}
                    onClick={(scb) => {
                        setOpen(false);
                        scb && scb()
                        if (reload_on_close) {
                            window.location.reload()
                        }
                    }}>
                    Свернуть</Button>

                <Button
                    color={color}
                    size={size}
                    onClick={(scb) => {
                        console.log("qqqqq sessions", session_id);
                        scb && scb();
                        window.open(
                            document.querySelector(`[data-session-id="${session?.session_id}"] iframe`).getAttribute('src'), '_blank')
                    }}>
                    Линк</Button>
                <RenderDebugApiLogs
                    // start_smart_log={}
                    reload_on_close={reload_on_close}
                    open_ind={open_ind}
                    api_logs={[...api_logs || [], {res: {smart_log: start_smart_log || {}}}]}
                    session={session}></RenderDebugApiLogs>
                <MyModal
                    size={'full'}
                    isOpen={is_vs_logs}
                    onClose={() => {
                        set_is_vs_logs(null)
                    }}
                >
                    <SessionLogs session={session}></SessionLogs>
                </MyModal>

                {(buttons || []).map((it, ind) => {
                    return (<div key={ind} className={'ib'}>
                        <Button
                            size={size}
                            color={color}
                            onClick={(scb) => {
                                console.log("qqqqq ittttttttttt", it);
                                it.action(scb);

                            }}>
                            {it.name}
                        </Button>
                    </div>)
                })}
                {/*<VsSessionStatus session={session}></VsSessionStatus>*/}
            </div>
            <div className={'imgdot-wrap'}>
                {with_play_stop && <><Button size={'xs'} onClick={(scb) => {
                    scb && scb()
                    on_start();
                }}>Play</Button>
                    <Button size={'xs'} onClick={(scb) => {
                        scb && scb()
                        on_stop();
                    }}>Stop</Button>
                    {(hist_obj?.smart_diff_keys || []).map((it, ind) => {
                        return (<div key={ind}
                                     title={it?.key?.toString()}
                                     className={'ib imgdot ' + (active_hist?.key == it?.key ? 'active' : '')}
                                     onClick={() => {
                                         active_ind = ind;
                                         on_select_active_ind(it)
                                     }}
                        >

                        </div>)
                    })}
                </>}
            </div>

            {/*<div style={{marginTop: '-17.5px'}}>*/}
            {/*    /!*<small>*!/*/}
            {/*    /!*    {open_type}*!/*/}
            {/*    /!*</small>*!/*/}
            {/*    <small>{session?.session_id}</small>*/}
            {/*    /!*<small><a href={url} target={'_blank'}>{url}</a></small>*!/*/}
            {/*</div>*/}
            <div className={'btn-vs-close'} onClick={() => {
                setOpen(false);
            }}>                🗙
            </div>
            {(is_fast_frame_open || open) && <VsIframe
                session={session}
                url={proxyUrl}></VsIframe>}
        </div>
    </div>
}

export default VsCode
