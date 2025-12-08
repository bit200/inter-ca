import React from 'react'
import {Link, withRouter} from 'react-router-dom'
import user from './../user/user'
import AvatarPreview from './../AvatarPreview/AvatarPreview';

import './header.css'
let className = 'small-sidebar';
let $ = window.$

class Header extends React.Component {

  constructor(props) {
    super(props);
    this.env = window.env;
    this.toggle = this.toggle.bind(this);
    window.Header = this;
  }

  rerender(){
    this.setState({cd: new Date().getTime()})
    this.refs.avatar_preview.rerender()
  }

  componentDidMount() {
    document.body.classList.toggle(className, localStorage.getItem('sidebar') !== 'full');
    document.onclick = function (e) {
      e.stopPropagation();
      let container = $(".dropdown-mobile");
      let container2 = $(".sidebar-pusher");
      if (container.has(e.target).length === 0 && container2.has(e.target).length === 0) {
        $('.dropdown-mobile').removeClass('active');
        $('.dropdown__content').removeClass('open');
      }
    }
  }

  logout() {
    user.logout();
  }

  toggle() {
    let value = document.body.classList.contains(className);
    document.body.classList.toggle(className, !value);
    localStorage.setItem('sidebar', value ? 'full' : 'small')
  }

  openDrDn() {
    let hidden = $('.dropdown-mobile');
    if (hidden.hasClass('active')){
      hidden.removeClass('active');
      $('.dropdown__content').removeClass('open');
    } else {
      hidden.addClass('active');
      $('.dropdown__content').addClass('open');
    }
  }

  render() {
    return <div>
      <div className="navbar">
        <div className="navbar-inner">
          {/*<i className="fa fa-bars pull-left visible-xs"></i>*/}
          <div className="sidebar-pusher">
            <a className="waves-effect waves-button waves-classic push-sidebar" onClick={this.openDrDn.bind(this)}>
              <i className="fa fa-bars"/>
            </a>
          </div>
          <div className="logo-box">
            <Link to="/app" className="logo-text">
              <span className="full-logo-text">{this.env.title}</span>
              <span className="small-logo-text">{this.env.title[0].toUpperCase()}</span>
            </Link>
            {/*<Link to="/admin" className="logo-text">F</Link>*/}
          </div>
          <div className="dropdown dropdown-mobile">
            <div className="dropdown__content">
              <ul className="dropdown-menu dropdown-menu--header-mobile" onClick={() => {
                $('.dropdown.dropdown-mobile.active').removeClass('active')
                $('.dropdown__content').removeClass('open')
              }}>
                <li><Link to={'/app/profile'}>
                  {/*<span className={"menu-icon fa " + tab.icon}></span>*/}
                  <p>Profile</p>
                </Link></li>
                { this.props.tabs.map(function (tab, index) {
                  return                 <li key={'tab-' + index} ><Link to={'/app/' + tab.url}>
                      {/*<span className={"menu-icon fa " + tab.icon}></span>*/}
                      <p>{tab.name}</p>
                    </Link></li>
                })
                }

              </ul>
            </div>
          </div>
          <div className="topmenu-outer">
            <div className="top-menu">
              <ul className="nav navbar-nav navbar-left">
                <li>
                  <a onClick={this.toggle}
                     className="waves-effect waves-button waves-classNameic sidebar-toggle"><i
                    className="fa fa-bars"/></a>
                </li>
              </ul>
              <ul className="nav navbar-nav navbar-right">
                <li className="dropdown">
                  <a className="dropdown-toggle waves-effect waves-button waves-classNameic main-ava"
                     data-toggle="dropdown">
                    <div >
                      <div>
                        <Link to={'/app/profile'} className={"pull-left ml-10 mr-5 avatar-header-wrapper"}>
                          <AvatarPreview
                            ref={"avatar_preview"}
                            width={30}
                          />
                        </Link>
                        <span className="pull-left">
                          <Link className={"plain_link"} to={'/app/profile'}>{user.get_public_name()}</Link>
                          <i onClick={this.logout.bind(this)} className="fa ml-5 fa-sign-out"/></span>

                        <div className="clearfix"/>
                      </div>
                    </div>
                  </a>
                  {/*<ul className="dropdown-menu dropdown-list" role="menu">*/}
                    {/*<li role="presentation"><b><i className="fa fa-user"></i>Profile</b></li>*/}
                    {/*<li role="presentation"><b><i className="fa fa-sign-out m-r-xs"></i>Log out</b></li>*/}
                  {/*</ul>*/}
                </li>
                <li className="dropdown">
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  }
}


export default withRouter(Header)
