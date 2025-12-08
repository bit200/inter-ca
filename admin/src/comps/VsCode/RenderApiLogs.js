import React, {useEffect, useState} from 'react';
import MyModal from "../../libs/MyModal";
import BashIndPreview from "./BashIndPreview";
import SmartLogPreview from "./SmartLogPreview";

function RenderDebugApiLogs({api_logs, reload_on_close, start_smart_log, open_ind, session}) {
    let [is_open_api_logs, set_is_open_api_logs] = useState(false)
    let [selected_api, set_selected_api] = useState(null)
    let [bash_ind, set_bash_ind] = useState(null)
    let [bash_name, set_bash_name] = useState('')
    let [log_info, set_log_info] = useState(null)

    useEffect(() => {
        set_selected_api(api_logs[0])
        set_log_info(null)
        reload()
    }, [is_open_api_logs])
    useEffect(() => {
        open_ind && set_is_open_api_logs(true)
    }, [open_ind])

    function reload () {

    }



    return <>
        <Button color={1}
                size={'sm'}
                onClick={(scb) => {
            console.log("qqqqq clickc me",);
            set_is_open_api_logs(true)
            scb && scb()
        }}>
            Length*: {api_logs?.length} {is_open_api_logs ? 'YES' : 'NO'}
        </Button>
        <MyModal size={'full'}
                 isOpen={is_open_api_logs}
                 onClose={() => {
                     set_is_open_api_logs(false)
                     if (reload_on_close) {
                         window?.location?.reload();
                     }
                 }}
        >
            <div className="row">
                <div className="col-sm-12">
                    **RenderDebugApiLogs** {reload_on_close ? 'Reload': 'Normal'}
                    {reload_on_close}
                </div>
                <div className="col-sm-3">
                    {(api_logs || []).map((it, ind) => {
                        let {query} = it || {}
                        query ??= {}
                        let arr = it?.res?.smart_log?.arr;
                        let {build_obj = {}} = it?.data || {}
                        let size = _.size(arr)
                        console.log("qqqqq set_bash_ind", build_obj, it?.data, {ind});
                        return (<div key={ind}
                                     className={`${it.fake_id == selected_api?.fake_id ? 'active' : ''}`}
                                     onClick={() => {
                                         set_selected_api(it)
                                     }}>
                            #{ind} {query.type} {query.cmd} {query.name || ''}
                            {!!size && <div className="build_arr">
                                {/*{(Object.keys(build_obj) || []).map((name, ind) => {*/}
                                {/*    let it = build_obj[name]*/}
                                {/*    return (<div key={ind} className={'ib'} onClick={() => {*/}
                                {/*        set_bash_ind(it.bash_ind)*/}
                                {/*        set_bash_name(name)*/}
                                {/*    }}>*/}
                                {/*        #{name}-${it.bash_ind}*/}
                                {/*    </div>)*/}
                                {/*})} */}

                                {/*{(arr || []).map((it, ind) => {*/}
                                {/*    return (<div key={ind} className={'ib'} onClick={() => {*/}
                                {/*        set_log_info(it)*/}
                                {/*    }}>*/}
                                {/*        {it?.name}*/}
                                {/*    </div>)*/}
                                {/*})}*/}


                            </div>}
                        </div>)
                    })}
                </div>
                <div className="col-sm-9">
                    {/*{!!log_info && <><Button onClick={(scb) => {*/}
                    {/*    set_log_info(false)*/}
                    {/*    scb && scb()*/}
                    {/*}}>Close Bash ind</Button>*/}
                    {/*    /!*{bash_ind}*!/*/}
                    {/*    <pre>{JSON.stringify(log_info, null, 4)}</pre>*/}
                    {/*</>}*/}
                    {/*<hr/>*/}
                    <SmartLogPreview selected_api={selected_api} session={session}></SmartLogPreview>

                    {/*<pre>{JSON.stringify(selected_api, null, 4)}</pre>*/}
                </div>
            </div>


        </MyModal>
    </>
}

export default RenderDebugApiLogs
