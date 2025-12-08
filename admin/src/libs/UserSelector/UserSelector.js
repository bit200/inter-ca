import React, {useState, useEffect} from "react";
import Storage from "../../comps/Storage";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

function getDBUsers(cb) {
    return new Promise((resolve, reject) => {
        global.http.get('/all-users', {})
            .then(items => {
                let _items =items.map(it => {
                    return {_id: it._id, label: `${it.username} #${it._id}`}
                })
                cb && cb(_items)
                resolve && resolve(_items)
            })
    })
}

function UserSelector (props) {
    let [users, setUsers] = useState([]);
    let [alreadyLoading, setAlreadyLoading] = useState(false);
    let {onChange} = props;
    if (!alreadyLoading) {
        setAlreadyLoading(true)
        getDBUsers().then(users => {
            setUsers(users)
        });
    }

    useEffect(() => {

    }, [props.user])

    return <>
        {!!users && !!users.length && <Autocomplete
            disablePortal
            id="combo-box-demo"
            options={users || []}
            value={( users || []).filter(it => props.user == it._id)[0]}
            sx={{ width: 300 }}
            renderInput={(params) => <TextField {...params} label=" " />}
            onChange={(v1, v) => {
                let _id = v ? v._id : null;
                // onChangeFilter(_id, filter_key)
                onChange && onChange(_id, v)
            }
            }
        />}
    </>

}


export default UserSelector