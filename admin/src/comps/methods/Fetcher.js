import React from 'react';

let Fetcher = {

    // loading: {},
    data: {},

    onChange(url, opts) {
        if (!opts) {
            this.data[url] = null;
            return this.get(url)
        }
    },
    
    get(url, params, opts) {
        if (!this.data[url]) {

            this.data[url] = {curLoading: true};
            return new Promise((resolve, reject) => {
                global.http.get(url, params)
                    .then(r => {
                        resolve(r)
                    })
            })
        } else {
          return new Promise((resolve, reject) => {
             function iter () {
                 if (this.data[url].curLoading) {
                     setTimeout(iter)
                 } else {
                     resolve(this.data[url])
                 }
             }

             iter();


          })
        }

    }
}



export default Fetcher

