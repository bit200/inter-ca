// import NProgress from 'nprogress'
import user from './../user/user';
import notify from '../Notify/Notify';


const ajax = function _ajax(method, url, params, scb, ecb) {

  const xhr = new XMLHttpRequest();
  if (method === 'GET') {
    // if (url.indexOf('?') < 0) {
    //   url += '?';
    // } else {
    //   url += '&';
    // }
    // for (const key in params) {
    //   url = `${url + key}=${params[key]}&`;
    // }
    let serialize = function(obj, prefix) {
      var str = [],
        p;
      for (p in obj) {
        if (obj.hasOwnProperty(p)) {
          var k = prefix ? prefix + "[" + p + "]" : p,
            v = obj[p];
          str.push((v !== null && typeof v === "object") ?
            serialize(v, k) :
            encodeURIComponent(k) + "=" + encodeURIComponent(v));
        }
      }
      return str.join("&");
    }

    url += '?' + serialize(params)
  }

  xhr.open(method, url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', user.get_token());

  xhr.onreadystatechange = function (oEvent) {
    if (xhr.status === 0) {
      ecb &&
      ecb(xhr.status, 'Server is not responding. Please try again later');
    }
  };

  xhr.addEventListener(
    'load',
    () => {
      if (xhr.readyState !== 4 || xhr.status !== 200) {
        try {
          var text = JSON.parse(xhr.responseText);
        } catch (e) {
          text = xhr.responseText;
        }
        ecb && ecb(text, xhr.status);
      } else {
        let text;
        try {
          text = JSON.parse(xhr.responseText);
        } catch (e) {
          text = xhr.responseText;
        }
        setTimeout(() => {

        scb && scb(text);
        }, 0)

      }
    },
    false,
  );
  //
  const str = JSON.stringify(params);
  xhr.send(str);
};


const http = {
  domain: window.env.domain,
  request: (method, url, query, params) => {
    params = params || {};
    query = query || {};
    url = url.replace(/\/\//gi, '/')
    // if (params.progress) {
    //   NProgress.set(.4);
    //   NProgress.start();
    // }

    let iter_count = 0;

    return new Promise((resolve, reject) => {
      iter()

      function iter() {
        ajax(
          method,
          `${params.domain || window.env.domain}${params.wo_prefix ? '' : '/api'}${url}`,
          query,
          res => {
            // if (params.progress) {
            //   NProgress.done();
            // }

            // res = res && res.data ? res.data : res;
            let r = res && res.data ? res.data : res;
            // r = r && !r._id && r.items ? r.items : r;
            resolve(r);
            if (params.success) {
              notify.success(params.success)
            }
          },
          (e, code) => {
            e = e || {}
           //console.log("qqqqq eeee", e, code);

            // if (params.progress) {
            //   NProgress.done();
            // }
            if (code === 401) {
              // console.log('........ ## urlrlrlrlrlrlr', url);
              return user.logout();
            } else if (code === 402 || code === 403) {
      
              console.log("qqqqq error 403", code);
              if (iter_count < 5) {

                // console.log('*........ ## truelly');
                // console.log('*........ ## truelly');
                return user.on_refresh_token(() => {
                  console.log("qqqqq user refresh token", );
                  console.log("qqqqq user refresh token", );
                  // console.log('*........ ## token getting');
                  // console.log('........ ## REFreSH TOKEN succ');
                  iter()
                }, e => {
                  // console.log('*........ ## token refreshhhhhhhhh');
                  // console.log('........ ## eeee', e);
                })
              }

            } else {
              if (!params.wo_notify) {
                notify.error(e.msg || e.error || e.message || e.errmsg || 'An Error please try again later')
              }

            }
            reject(e);

          },
        );
      }

    });
  },
  get: (url, query, params) => http.request('GET', url, query, params),
  post: (url, query, params) => http.request('POST', url, query, params),
  put: (url, query, params) => http.request('PUT', url, query, params),
  delete: (url, query, params) => http.request('DELETE', url, query, params),
};

global.http = http;
global.ajax = ajax;

export default http;
