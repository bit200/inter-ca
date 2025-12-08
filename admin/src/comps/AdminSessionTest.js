import React, { useEffect, useState } from 'react';
import {VsCodeWrapper} from "./VsCode/VsCodeWrapper";

function Layout2(props) {
  const [session_id, setSessionId] = useState('');
  const [session_token, setSessionToken] = useState('');
  const [task_group_status, set_task_group_status] = useState('')
  const [task_group, set_task_group] = useState({})
  const [details, set_details] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let session_id= params.get('session_id') || '';
    let session_token= params.get('session_token') || '';
    setSessionId(session_id);
    setSessionToken(session_token);
    global.http.get('/load-admin-session-details', {session_id, session_token}).then(r => {
        set_details(r)
    }).catch(e => {
    })
  }, []);

  return (
      <div className="card">
        <div className="card-body">
          <div>Admin Session Tests</div>
          <div>session_id: {session_id}</div>
          <div>session_token: {session_token}</div>
          <div>taskGroupStatus: {task_group_status}</div>
          {details?.err && <div>err: {details?.err}</div>}
            {details && !details?.err && <VsCodeWrapper
              on_change_task_group_status={(status) => {
                console.log("qqqqq on change task_group_status888888", status);
                set_task_group_status(status)
              }}
              task_group={details?.task_group || {}}
              selected_block={{}}
              extended_logs={true}
              type={'client'}
              existing_session_history={{
                'sess': {session_id},
                  lng: 'sess'
              }}
              on_change={({session_id, lng}) => {
                console.log("qqqqq rrrrrrrr start session complete {session_id} Changed:", session_id);
              }}
          ></VsCodeWrapper>}
        </div>
      </div>
  );
}

export default Layout2;
