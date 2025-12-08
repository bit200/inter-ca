import React from 'react'
import ReactExtender from './../ReactExtender/ReactExtender';
import Checkboxes from './../Checkboxes/Checkboxes';
import user from './../user/user';
import http from './../http/http';
import m from './../m/m';
//let {ReactExtender} = window.my;
let _ = window._;

class TokenRoles extends ReactExtender {


  constructor(props) {
    super(props);
    this.state = {selected_roles: (this.props.item || {}).roles};
  }

  render() {
    let {item = {}} = this.props;
    let {selected_roles} = this.state;
    let roles = user.get_my_full_roles();
    selected_roles = selected_roles || item.roles;

    return (<div>
      <Checkboxes
        items={roles}
        selected_items={selected_roles}
        onChange={(arr, key, value) => {
          selected_roles = selected_roles || [];
          if (value) {
            selected_roles.push(key)
          } else {
            selected_roles = _.filter(selected_roles, it => it != key)
          }
          selected_roles = _.uniq(selected_roles)
          this.setState({selected_roles})
          this.props.onChange && this.props.onChange(selected_roles, 'roles')
          http.post('/auth/update_role', {role: key, value, _id: item._id || m.get_id()}, {success: 'Role is updated', wo_notify: true})
            .then(r => {
             // console.log'........ ## rrrr', r);
            })
            .catch(e => {
             // console.log'........ ## eeee', e);
            })
        }}
      >

      </Checkboxes>
    </div>)
  }

}

export default TokenRoles
