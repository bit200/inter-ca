import http from './../http/http'
import notify from '../Notify/Notify';
import websocket from './../websocket/websocket';

let refresh_cbs = [];

let _ = window._;
let pageOpenTime = new Date().getTime();
const user = {
    token: null,
    public_routes: ['/login', '/register', '/forgot-password'],
    get_lngs: () => {
        return user?.get_info()?.lngs || []
    },
    add_lng: (lng) => {
      let lngs = user.get_lngs();
      lngs.unshift(lng);

      let uniq_lngs = _.uniq(lngs);
        console.log("qqqqq on change lng", {lngs, lng, uniq_lngs});

      user.set_info_http({lngs: uniq_lngs})
    },
    get_info: () => {
        const info = localStorage.getItem('user');
        try {
            return JSON.parse(info);
        } catch (e) {
            return {};
        }
    },
    set_info_http: (_info) => {
        let info = localStorage.getItem('user');
        let item = {...info || {}, ..._info || {}}

        user.set_info(item)
        global.http.put('/profile/my', {item}).then(r => {
            console.log("qqqqq rrrrrr", r);
        })
    },
    get_id: () => {
        return (user.get_info() || {})._id
    },
    handle_login_response(r) {
        user.set_token(r.token, r.refresh_token);
        user.set_info(r.user);
        // websocket.reconnect()
    },
    get_refresh_token() {
        return localStorage.getItem('refresh_token');
    },
    on_refresh_token(scb, ecb) {
        // console.log('*........ ## window.env.wo_token', window.env.wo_token);
        if (window.env.wo_token) return;
        refresh_cbs.push({scb, ecb})
        if (!this.get_refresh_token()) {
            user.logout()
            return;
        }
        console.log("qqqqq is_refresh_process", user.is_refresh_process);
        if (user.is_refresh_process) {
            return;
        }
        user.is_refresh_process = true;

        http.get('/auth/on_refresh_token/' + this.get_refresh_token())
            .then(r => {
                user.handle_login_response(r)
                user.is_refresh_process = false;
                _.each(refresh_cbs, it => {
                    it.scb && it.scb(r)
                });
                refresh_cbs = []
            })
            .catch(e => {
                user.is_refresh_process = false;
                _.each(refresh_cbs, it => {
                    it.ecb && it.ecb(e)
                });
                refresh_cbs = []
            })
    },
    password_update(pass_item, scb, ecb) {
        if (pass_item.new_password !== pass_item.new_password2) {
            ecb && ecb()
            return notify.error('Passwords not equal')
        }
        http.post('/users/password_update', {item: pass_item}, {success: 'Password is updated'})
            .then(r => {
                scb && scb()
            })
            .catch(ecb)
    },
    on_update(item, scb, ecb) {
        http.put('/profile/my', {item})
            .then(r => {
                user.set_info(r);
                scb && scb(r)
            })
            .catch(e => {
                // console.log('........ ## eeeeee', e);
                ecb && ecb(e)
            })
    },
    get_position() {
        return t('developer')
    },
    get_public_name() {
        let info = user.get_info() || {};
        return _.filter([info.first_name, info.last_name], it => it).join(' ')//id === 1 ? 'Moderator 2' : 'Super Admin2'
    },
    get_my_roles() {
        return (this.get_info() || {}).roles || []
    },
    get_my_full_roles() {
        let my_roles = this.get_my_roles();
        let {roles} = window.ms;
        let _roles = []

        let is_started;
        _.each(roles, (it, ind) => {
            if (my_roles.indexOf(it) > -1) {
                is_started = true;
            }
            if (is_started) {
                _roles.push(it)
            }
        })

        return _roles;
        // return
    },
    is_role: (role, my_roles) => {
        my_roles = my_roles || user.get_my_roles();
        let is_role;
        if (global.Array.isArray(role)) {
            let res;
            _.each(role, (it, ind) => {
                res = res || user.is_role(it, my_roles)
            })
            return res;
        } else {
            let _role = role.toLowerCase();
            _.each(my_roles, (my_role, ind) => {
                let _my_role = my_role.toLowerCase()
                if (_my_role === _role || _my_role === 'super_admin') {
                    is_role = true;
                }
            });
            return is_role;
        }

    },
    is_roles: (roles) => {
        let my_roles = user.get_my_roles();
        let is_role = false;
        _.each(roles, role => {
            let is_us = user.is_role(role, my_roles);
            is_role = is_role || is_us;
        });
        return !roles || !roles.length || is_role;
    },
    is_position: (role) => {
        return user.get_my_roles().indexOf(role) > -1;
    },
    set_info: info => {
        localStorage.setItem('user', JSON.stringify(info));
    },
    is_logged_in: () => {
        if (!user.get_token()) {
            global.hist.push('/login')
        }
    },
    get_token: () => {
        user.token = user.token || localStorage.getItem('token');
        return user.token
    },
    set_token: (token, refresh_token) => {
        user.token = token;
        user.refresh_token = refresh_token;
        localStorage.setItem('token', token);
        localStorage.setItem('refresh_token', refresh_token);
    },
    logout: () => {
        if (new Date().getTime() - pageOpenTime < 2000) {
            return redirectLogin()
        }
        window?.onConfirm && window?.onConfirm({
            yes: t('yesLogout'),
            name: t('areYouSureLogout')
        }, () => {

            let token = user.get_token();
            if (token) {
                // http.post('/sign_out');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                user.token = null;
                user.refresh_token = null;
            }
            return redirectLogin()

        })

        function redirectLogin() {
            if (user.public_routes.indexOf(window.location.pathname) < 0) {
                try {
                    global.navigate('/login')
                } catch (e) {
                    window.location.href = '/login'
                }

                // window.location.href = '/login'
            }
        }


    },
};

setTimeout(() => {
    user.on_refresh_token((s) => {
        window.AdminNavbar && window.AdminNavbar.rerender && window.AdminNavbar.rerender()
    }, (e) => {
        // console.log('........ ## eeee', e);
    })
})

global.user = user;

export default user;
