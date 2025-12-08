import React from 'react'
import {Link, withRouter} from 'react-router-dom'
import RolesWrapper from './../RolesWrapper/RolesWrapper';
import './navbar.css';

let _ = window._;
class Navbar extends React.Component {

  constructor(props) {
    super(props);
    window.Navbar = this;
  }

  rerender(){
    this.setState({cd: new Date().getTime()})
  }

  is_active(tab) {
    return this.props.location.pathname.indexOf(tab.url) > -1
  }

  render() {


    let tabs = this.props.tabs;
    // let tabs = _.filter(this.props.tabs, it =>{
    //   if (!it.roles) {
    //     return true;
    //   }
    // })


    let _this = this;
    return <div>
      <div className="page-sidebar sidebar">
        <div className="page-sidebar-inner slimscroll">

          <ul className="menu accordion-menu">
            { tabs.map(function (tab, index) {
              return <RolesWrapper key={index} roles={tab.roles}><li key={'tab-' + index} className={(_this.is_active(tab) ? 'active' : '')}>
                <Link to={'/app/' + tab.url} className="waves-effect waves-button">
                  <span className={"menu-icon fa " + tab.icon}></span>
                  <p>{tab.name}</p>

                </Link>

              </li></RolesWrapper>
            })
            }

          </ul>
        </div>
      </div>

    </div>
  }
}

export default withRouter(Navbar)
