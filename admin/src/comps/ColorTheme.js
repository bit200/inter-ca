import Storage from "./Storage";

let htmlElement = document.documentElement;
let bodyElement = document.body;
let lastTop = 'top';
let obj = {
    getTheme() {
        let theme = Storage.get('color-theme');
        return theme == 'dark' ? 'dark' : 'light'
    },
    toggleTheme() {
        obj.setTheme(obj.getTheme() === 'light' ? 'dark' : 'light')
    },
    setTheme(theme) {
        Storage.set('color-theme', theme)
        htmlElement.setAttribute('data-bs-theme', theme)
    },
    initTheme() {
        obj.setTheme(obj.getTheme())
    },


    getSize() {
        let theme = Storage.get('menu-size');
        return theme == 'collapsed' ? 'collapsed' : 'default'
    },
    toggleSize() {
        obj.setSize(obj.getSize() === 'default' ? 'collapsed' : 'default')
    },
    setSize(size) {
        Storage.set('menu-size', size)
        bodyElement.setAttribute('data-sidebar-size', size)
    },
    initSize() {
        obj.setSize(obj.getSize())
    },

    forceToggleTop(){
        lastTop = 'forceRender';
        obj.toggleTop();
    },
    toggleTop(){
        var top = (window.pageYOffset || document.scrollTop || 0) - (document.clientTop || 0);
        let _lastTop = top > 0 ? 'scroll' : 'top';
        console.log("qqqqq _lastTop", _lastTop, lastTop );
        if (lastTop != _lastTop) {
            try {

                lastTop = _lastTop;
                htmlElement.setAttribute('data-scroll', lastTop)

                if (lastTop == 'scroll') {
                    document.querySelector('.topbar-custom').classList.add('nav-sticky')
                } else {
                    document.querySelector('.topbar-custom').classList.remove('nav-sticky')
                }
            } catch (e) {
            }

        }
    },

    initScroll() {
        document.body.onscroll = (e) => {
            obj.toggleTop()
        }
        obj.toggleTop();
    }
}

obj.initTheme();
obj.initSize();
obj.initScroll();

window.ColorTheme = obj;
export default obj;