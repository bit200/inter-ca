import React from 'react'
import {withRouter, Link} from "react-router-dom";

class HeaderTabs extends React.Component {

  constructor(props) {
    super(props);

    // this.state.active_url = window.location
  }

  go_nav(value) {
    // global.nav.go(value)
    if (value === 'logout') {
      global.user.logout()
    } else {
      this.props.history.push('/admin/' + value)
    }

  }

  render() {
    // let url = global.m
    let active = global.m.get_url_sub(2);
    let tabs = this.props.tabs;
    let {Select} = global;

    function get_url (item) {
        return item.pathname || item.url;
    }

    return (
      <nav className="navbar navbar-expand-lg navbar-light bg-white ac">

        <div className="pull-left hidden-xs">
          <div className="pull-left mt-20 mr-10" onClick={() => global.user.logout()}>
            <div className="nav-link ml-10 pointer nav_link_hover">Logout</div>
          </div>

        </div>

        <div className="visible-xs">
          <div style={{padding: '10px 10px 0 10px'}}>
            <Select
              onChange={(value) => {
                this.go_nav(value)
              }}
              value={active}
              items={global._.map(tabs, v => {
                v.value = v.url;
                return v;
              }).concat({name: 'Logout', value: 'logout'})}>
            </Select>
          </div>
          {/*<select className="form-control mw-300" onChange={(value) => {*/}
          {/*  this.go_nav(value)*/}
          {/*}}>*/}
          {/*  <option value="/admin/pdf">Home</option>*/}
          {/*  <option value="/admin/users">Contact</option>*/}
          {/*</select>*/}
        </div>
        <div className="collapse navbar-collapse justify-content-center ac hidden-xs" id="navbarNav">
          <ul className="navbar-nav">
            {(tabs || []).map((item, ind) => {
              return (item.is_hidden ? <li key={ind}></li> : <li key={ind} className={`nav-item ${active === get_url(item) ? 'active' : ''}`}>
                <Link className="nav-link" to={`/admin/${get_url(item)}`.replace("//", '/')}>{item.name}</Link>
              </li>)
            })}

          </ul>

        </div>

      </nav>
    )
  }

}

global.HeaderTabs = withRouter(HeaderTabs)

export default global.HeaderTabs;
