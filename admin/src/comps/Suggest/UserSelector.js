import React from 'react';
import _ from 'underscore';
import ReactPaginate from 'react-paginate';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import PopupState, {bindTrigger, bindPopover} from 'material-ui-popup-state';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Storage from './../Storage';

function get_name(option) {
  return `[${option.short}] ${option.name || '-'}`
}


let users_obj = {}, users = [];

class UserSel extends React.Component {
  componentDidMount() {
    setTimeout(() => {
      this.inputRef.focus();
    }, 100)
  }

  render() {
    let {users_obj, users} = Storage.getUsers();


    return <Autocomplete
      id="country-select-demo"
      openOnFocus={true}
      sx={{width: 200}}
      options={users || []}
      autoHighlight
      // onInputChange={(...args) => {
      //  //console.log('*........ ## vvv on chagne2', args);
      // }}
      onChange={(...args) => {
        let value = args[1];
        this.props.onChange(value._id);
        // console.log('*........ ## vvv on chagne3', value);
      }}
      getOptionLabel={(option) => {
        return get_name(option);
      }}
      renderOption={(props, option) => {
        return <Box component="li" sx={{'& > img': {mr: 2, flexShrink: 0}}} {...props}>
          <img
            loading="lazy"
            width="20"
            src={global.env.domain + option.main_img}
            alt=""
            style={{borderRadius: '50%'}}
          />
          <span>{get_name(option)}</span>
        </Box>
      }}
      renderInput={(params) => {
        return <TextField
          {...params}
          // label="Choose a country"
          inputRef={input => {
            this.inputRef = input;
          }}
          inputProps={{
            ...params.inputProps,
            autoComplete: 'new-password', // disable autocomplete and autofill
          }}
        />
      }}
    />
  }
}

class UserPopup extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let users = this.props.users;

    return <PopupState variant="popover" popupId="demo-popup-popover">
      {(popupState) => (
        <div className={'ib user-popup'}>
                <span variant="contained" {...bindTrigger(popupState)}>
                  {this.props.children}
                </span>
          <Popover
            {...bindPopover(popupState)}
            anchorOrigin={{
              vertical  : 'bottom',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical  : 'top',
              horizontal: 'center',
            }}
          >

            <UserSel onChange={(v) => {
              popupState.close();
             //console.log('*........ ## vvvvvvvvv', v);
              this.props.onChange && this.props.onChange(v)
              // console.log('*........ ## USER SEL', v, {bindTrigger, popupState});
              // bindTrigger(true)
            }}></UserSel>
          </Popover>
        </div>
      )}
    </PopupState>
  }
};

export default class UserSelector extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  onChange(items) {
    // this.setState({items})
    this.props.onChange && this.props.onChange(items)
  }

  render() {
    let {users} = this.state;
    let {value = [], max = 99, onChange} = this.props;
    let items = value;
    let {users_obj} = Storage.getUsers();

    return <div className={''}>
      {(items || []).map((item, ind) => {
        users_obj = users_obj || {}
        item = users_obj[(item || {})._id || item] || {}
        // console.log('*........ ## item111', item, users_obj);
        // console.log('*........ ## user SElector', value, item, users_obj);

        function get_first_letter(v) {

          v = v || '';
          return ((v[0] || '') + (v[1] || '')) || 'AA'
        }

        function get_short(item) {
          return item.short || get_first_letter(item.name)
        }

        return (
          <UserPopup users={users}
                     onChange={(v) => {
                      //console.log('*........ ## on chang444444444', v, items);
                       items[ind] = v;
                       this.onChange(items);
                     }}>
            <div className={'rel'} onClick={(e) => {
              items = _.filter(items, (it, ind2) => {
                return ind2 != ind;
              });
              this.onChange(items);

              e.preventDefault();
              e.stopPropagation();
              return true;
            }}>
              <i className="fa fa-close abs-close"></i>
            </div>
            <div className="tag">
              {item.main_img && <img src={global.env.domain + item.main_img} alt="" className={'task-user'}/>}
              {!item.main_img && <div className={'task-user'}>{get_short(item)}</div>}
            </div>
          </UserPopup>
        )
      })}
      {items.length < max && <span>
        <UserPopup users={users} onChange={(v) => {
          items.push(v);
          this.onChange(items);
          // console.log('*........ ## items344444', items);
        }}>
             <button className={'btn btn-xs btn-default'}>+</button>
          </UserPopup>
      </span>}

    </div>


  }
}

//
// const countries = [
//   {
//     code: 'AD', label: 'Тимур', phone: '376',
//     src : `/profile.png`
//   },
//   {
//     code : 'AE',
//     label: 'Игорь',
//     phone: '971',
//     src  : `https://flagcdn.com/w20/ae.png`
//   },
//   {
//     code: 'AF', label: 'Дарья', phone: '93',
//     src : `https://flagcdn.com/w20/af.png`
//   },
//   {
//     code : 'AG',
//     label: 'Диана ashdfahsdfh',
//     phone: '1-268',
//     src  : `https://flagcdn.com/w20/ag.png`
//   }
// ];

// export default UserSelector;
