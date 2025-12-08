function parallelWithLimit(arr, limit) {
    return new Promise((_resolve, _reject) => {

        let length = arr.length;
        let curIndex = 0;
        let results = [];
        let resCount = 0;

        for (let i = 0; i < limit; i++) {
            runNext(arr)
        }

        function runNext() {

            let index = curIndex++
            let fn = arr[index];
            if (!fn) {
                return;
            }

            console.log("qqqqq STARTT::::::::::::", index);
            fn && fn()
                .then((res) => {
                    console.log("qqqqq FINISH", index);
                    tryRes(res, index)
                })
                .catch(e => {
                    tryRes({error: e}, index)
                });
        }

        function tryRes(r, index) {
            results[index] = r;
            if (++resCount === length) {
                console.log("qqqqq results", results);
                _resolve(results)
            }
            runNext();
        }


    })

}


function delay(ms) {
    return () => new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('Function ms ' + ms)
        }, ms)
    })
}

parallelWithLimit([
    delay(900),
    delay(1000),
    delay(800),
    delay(700),
    delay(100),
    delay(901)
], 2)
    .then(r => {
        console.log("qqqqq Done", r);
    })
