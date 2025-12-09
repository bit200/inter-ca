import React from 'react'
import {withRouter, BrowserRouter} from 'react-router-dom'
import Button from '../Button/Button';
import http from './../http/http';
import user from './../user/user';
import websocket from './../websocket/websocket';
import styles from './login.css';
import {LogoImgRuEn} from "../../comps/Header/Header1";

class Login extends React.Component {

  constructor(props) {
    super(props);
    this.env = window.env;
    this.state = {username: '', password: '', checked: true};
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    let obj = {};
    obj[event.target.getAttribute('id')] = event.target.value;
    this.setState(obj);
  }

  handleSubmit(event) {
    this.setState({error: null, loading: true});
    http.post('/auth/login', {username: this.state.username, password: this.state.password}, {wo_notify: true})
        .then(r => {
          user.handle_login_response(r);

          window.location.href = '/'
        })
        .catch(e => {
          this.setState({loading: false, error: t('loginErr') || `Server didn't respond correctly`})
        });
    event.preventDefault();
  }

  render() {
    let Error = this.state.error ? (<div className="err userErr afade">
      {this.state.error}
    </div>) : null;
    let {opts} = this.props;
    return <>
      <div className="main-body login-body">
        <div className="login-container">
          <div className="card">
            <div className="card-body">
              <form className="login-form" onSubmit={this.handleSubmit}>
                <h1 className={'w100 tc'} style={{float: 'right'}}>
                  <LogoImgRuEn></LogoImgRuEn>
                </h1>
                <div className="auth-block afade-slow ">

                  {/*<h1 className="text-center w100">*/}
                  {/*  /!*{global?.env?.logoImg?.login || this.env.login_title || '-'}*!/*/}
                  {/*</h1>*/}
                  <div className="mt20">
                    <div className="form-group"><label className="c2 r pr5">{t('login')}</label>
                      <div className="c10 l"><input className="form-control w100"
                                                    value={this.state.username}
                                                    id="username"
                                                    onChange={this.handleChange}
                                                    type="text" placeholder={t('login')}/>
                      </div>
                    </div>
                    <div className="form-group"><label className="c2 r pr5">{t('password')}</label>
                      <div className="c10 l"><input type="password"
                                                    id="password"
                                                    value={this.state.password}
                                                    onChange={this.handleChange}
                                                    className="form-control w100"
                                                    placeholder={t('password')}/>
                      </div>
                    </div>
                    <div className="form-group mt10">
                      <div className="c10">

                      </div>
                      <div className="c2 tr" style={{marginTop: '15px'}}>
                        <div className="w100" style={{minHeight: '19px'}}>
                          <Button type="submit"
                                  icon={'iconoir-double-check'}
                              // className="pull-right"
                                  disabled={!this.state.checked || this.state.loading}>

                            {t('loginBtn')}</Button>
                        </div>
                      </div>
                      <div className="c12 tc">
                        {Error}
                      </div>
                      <div className="c12 tc" style={{fontSize: '14px', marginTop: '0px'}}>
                        <hr/>
                        <div className="ib">
                          <input type="checkbox" className="checkbox" checked={this.state.checked} id="checkboxPrivate"
                                 onChange={(v) => {
                                   console.log("qqqqq on changeeeeeeeeeeeeeeeeeeeeeeeeee", v);
                                   this.setState({checked: !this.state.checked})
                                 }}/>
                        </div>
                        {t('loginAgree')} {lng === 'ru' && <a href="https://itk.academy/files/personal.pdf"
                                                             target="_blank"><u>{t('policy')}</u></a>}
                      </div>

                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
          {/*<div className="card" style={{maxWidth: '300px', margin: '0 auto', marginTop: '10px'}}>*/}
          {/*  <div className="card-body">*/}
          {/*    asdf*/}
          {/*  </div>*/}
          {/*</div>*/}
          {/*<div className="page-container afade">*/}
          {/*  <div className="page-content2 cardIt">*/}
          {/*    <div className="content-wrapper">*/}

          {/*    </div>*/}
          {/*  </div>*/}
          {/*</div>*/}
        </div>
      </div>
    </>
  }
}

export default Login
