import React, {memo, useState} from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Storage from './CustomStorage';


const arePropsEqual = (prevProps, nextProps) => {
   //console.log("qqqqq render react memo!! props compare",prevProps, nextProps );

    if (prevProps.userId !== nextProps.userId) {
        // UserId has changed, component should re-render
        return false;
    }

    if ((prevProps.users || []).length !== (nextProps.users || []).length) {
        // Length of users array has changed, component should re-render
        return false;
    }

    // No relevant changes, component does not need to re-render
    return true;
};
function UserFilterSelector (props) {
    let [users, setUsers] = useState(Storage.getCachedUsers());
    let [alreadyLoading, setAlreadyLoading] = useState(false);
    let {userId, active_filter, onChangeFilter, onChange} = props;
    let filter_key = 'user';
    if (!alreadyLoading) {
        setAlreadyLoading(true)
        Storage.getDBUsers().then(users => {
            setUsers(users)
        });
    }
    userId = userId || (active_filter ? active_filter[filter_key] : null)
    let value = (users || []).filter(it => it._id == userId)[0];
    // console.log("qqqqq userId",{userId, value} );
    return <div className={"ib"} style={{maxWidth: '100%'}}>
        {!!users && !!users.length && <Autocomplete
            disablePortal
            id="combo-box-demo"
            options={users || []}
            value={value}
            sx={{width: 300}}
            renderInput={(params) => <TextField {...params} label=" "/>}
            onChange={(v1, v) => {
                let _id = v ? v._id : null;
                onChangeFilter && onChangeFilter(_id, filter_key)
                onChange && onChange(v, _id)
            }
            }
        />}
    </div>

}

export default UserFilterSelector;