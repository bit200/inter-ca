import * as React from 'react';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Typography from '@mui/material/Typography';
import ContentCut from '@mui/icons-material/ContentCut';
import ContentCopy from '@mui/icons-material/ContentCopy';
import ContentPaste from '@mui/icons-material/ContentPaste';
import Cloud from '@mui/icons-material/Cloud';
import {Link} from "react-router-dom";


export default function IconMenu(props) {

    const open = (path) => {
        global.navigate(path)
    }

    props = props || {}

    return (
        <Paper sx={{width: 120, maxWidth: '100%'}}>
            <MenuList>
                {(global.CONFIG.menu || props.arr ||  []).map((item, ind) => {
                    return (/^hr$/gi.test(item.name) ? <Divider/> : <MenuItem key={ind} onClick={(e) => {
                            if (item.url === '/logout') {
                                global.user.logout()
                            } else {
                                open(item.url)
                            }
                        }}>
                            {item.name}
                        </MenuItem>
                    )
                })}


                {/*<MenuItem onClick={(e) => {*/}
                {/*    open('/profile')*/}
                {/*}}>*/}
                {/*    /!*<ListItemIcon>*!/*/}
                {/*    /!*  <ContentCut fontSize="small" />*!/*/}
                {/*    /!*</ListItemIcon>*!/*/}
                {/*    Profile*/}
                {/*    /!*<Typography variant="body2" color="text.secondary">*!/*/}
                {/*    /!*  ⌘X*!/*/}
                {/*    /!*</Typography>*!/*/}
                {/*</MenuItem>*/}
                {/*<MenuItem onClick={(e) => {*/}
                {/*    open('/projects')*/}
                {/*}}>*/}
                {/*    /!*<ListItemIcon>*!/*/}
                {/*    /!*  <ContentCopy fontSize="small" />*!/*/}
                {/*    /!*</ListItemIcon>*!/*/}
                {/*    <ListItemText>Projects</ListItemText>*/}
                {/*    /!*<Typography variant="body2" color="text.secondary">*!/*/}
                {/*    /!*  ⌘C*!/*/}
                {/*    /!*</Typography>*!/*/}
                {/*</MenuItem>*/}
                {/*<MenuItem onClick={(e) => {*/}
                {/*    open('/users')*/}
                {/*}}>*/}
                {/*    /!*<ListItemIcon>*!/*/}
                {/*    /!*  <ContentPaste fontSize="small" />*!/*/}
                {/*    /!*</ListItemIcon>*!/*/}
                {/*    <ListItemText>Users</ListItemText>*/}
                {/*    /!*<Typography variant="body2" color="text.secondary">*!/*/}
                {/*    /!*  ⌘V*!/*/}
                {/*    /!*</Typography>*!/*/}
                {/*</MenuItem>*/}
                {/*<Divider/>*/}
                {/*<MenuItem onClick={(e) => {*/}
                {/*    global.user.logout();*/}
                {/*}}>*/}
                {/*    /!*<ListItemIcon>*!/*/}
                {/*    /!*  <Cloud fontSize="small" />*!/*/}
                {/*    /!*</ListItemIcon>*!/*/}
                {/*    <ListItemText>Logout</ListItemText>*/}
                {/*</MenuItem>*/}
            </MenuList>
        </Paper>
    );
}
