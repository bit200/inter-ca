import React, {useEffect, useState} from 'react';
import axios from "axios";

function Layout2({session}) {
  let session_id = session?.session_id;
  let [res, setRes] = useState({})
  let [files, setFiles] = useState([])
  let [activeFile, setActiveFile] = useState('')
  useEffect(() => {
    if (!session_id) {
      return;
    }
    reload()
  }, [session_id]);
  function reload () {
      // global.http.get('')
    axios.get(session.server_http + '/get-session-logs', {params: {session_id}}).then(({data}) => {
      console.log("qqqqq rrrrr", data);
      let files = data.ls;
      setRes(data)
      setFiles(files)
      setActiveFile(files[0])
    })
  }


  return <div>
    Session Logs {session_id}
    <button onClick={() => {reload()}}>Reload</button>



    <div className="col-sm-8">
      ActiveFiles:{(files || []).map((it, ind) => {
      return (<div key={ind} className={'list ib ' + (it == activeFile ? 'active' : '')} onClick={() => {
        setActiveFile(it)
      }}>
        {it}
      </div>)
    })}
      <pre style={{maxHeight: '500px'}}>{(res?.files || {})[activeFile]}</pre>

    </div>
    <div className="col-sm-4">
      <pre style={{maxHeight: '500px'}}>{JSON.stringify(res, null, 4)}</pre>
    </div>
  </div>
}

export default Layout2
