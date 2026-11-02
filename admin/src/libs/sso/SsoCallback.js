import React from 'react'
import http from '../http/http';
import user from '../user/user';
import {readCallback} from './sso';

// Страница, на которую itk-sso возвращает пользователя после входа.
// При любой ошибке уходим на /login: там показывается текст ошибки и доступна форма пароля.
export const SSO_ERROR_KEY = 'sso_error';

export default class SsoCallback extends React.Component {
    componentDidMount() {
        this.finishLogin();
    }

    async finishLogin() {
        try {
            const {body, returnTo} = readCallback({search: window.location.search});
            const r = await http.post('/auth/sso/callback', body, {wo_notify: true, no_logout: true});
            user.handle_login_response(r);
            window.location.replace(returnTo);
        } catch (e) {
            const apiError = e && (e.error || e.msg);
            const message = apiError || (e && e.message) || 'Не удалось войти через ITK';
            try {
                sessionStorage.setItem(SSO_ERROR_KEY, message);
            } catch (err) {}
            window.location.replace('/login');
        }
    }

    render() {
        return <div className="tc" style={{padding: '40px'}}>Входим через ITK…</div>
    }
}
