import React, {useEffect, useState} from 'react';
import axios from "axios";

function SmartLogPreview({selected_api, session}) {

  let [res, setRes] = useState([])
  let [info, setInfo] = useState(null)
  let [loading, setLoading] = useState(false)

  let _is_finish
  let smart_log_ind = selected_api?.res?.smart_log?.ind

  useEffect(() => {
    reload()
  }, [smart_log_ind]);

  useEffect(() => {
    let interval = setInterval(() => {
        console.log("qqqqq interval", );
        !_is_finish && !loading && reload();
    }, 2000)
    return () => {
      clearInterval(interval)
    }
  })

  function reload () {
    setLoading(true)
    axios.get(session.server_http + '/logs-by-smart-log-ind', {params: {smart_log_ind}}).then((r) => {
      console.log("qqqqq rrrrr SErVEr SENDEr", r);
      setRes(r.data)
      setLoading(false)
    })
  }

  _.each(res?.arr, (item, ind) => {
    item.is_finish = item.is_finish || (item?.name == 'api_run_cmd_complete')
    _is_finish = _is_finish || item.is_finish;
  })

  console.log("qqqqq resresresres",res );

  return <div>
    <div>Code: {res?.v?.code}! {_is_finish ? "FINISH" : 'PROGRESS'}</div>
    <Button
    disabled={loading}
        color={1} size={'xs'} onClick={scb => {
      scb && scb();
      reload()
    }}>Reload</Button>
    Smart Log preview: #{smart_log_ind}
    {(res.arr || []).map((it, ind) => {
      let code = it?._data?.code;
      let is_err = it?._data?.err;
      let is_any_err = code || is_err;
      let is_finish = it?.is_finish

      let next = res?.arr?.at(ind + 1)

        return (<div key={ind} onClick={() => {setInfo(it)}} className={(is_any_err ? 'err' : '') + (is_finish ? ' finish' : '')}>
          {(is_any_err) && <>[ ERR_CODE: {code || (is_err ? '-99' : '-1')} ] </>}{it?.name || ''}
          {(!is_finish && next) && <>&nbsp;{next?.prev_delta_time || 0}s</>}
          {(is_finish) && <>&nbsp;{it?.time || 0}s</>}
          {(!is_finish && !next) && <>&nbsp;[ progress ]</>}
        </div>)
    })}


    {info && <>
      <Button onClick={(scb) => {
        setInfo(null)
        scb && scb()
      }}>Close Info</Button>
    <pre>{JSON.stringify(info, null, 4)}</pre></>}



    <hr/>
    <pre>{JSON.stringify(res, null, 4)}</pre>
    <hr/>
  </div>
}

export default SmartLogPreview
