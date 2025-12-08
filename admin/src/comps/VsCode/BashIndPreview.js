import React, {useEffect, useState} from 'react';
import axios from "axios";

function BashIndPreview({bash_ind, bash_name, session}) {

  let [res, setRes] = useState([])

  useEffect(() => {
    axios.get(session.server_http + '/logs-by-bash-ind', {params: {bash_ind}}).then((r) => {
      console.log("qqqqq rrrrr SErVEr SENDEr", r);
      setRes(r.data)
    })
  }, [bash_ind]);

  return <div>
    <div>Code: {res?.code}</div>
    Bash_Ind: #{bash_ind} {bash_name}
    <hr/>
    <pre>{JSON.stringify(res, null, 4)}</pre>
  </div>
}

export default BashIndPreview
