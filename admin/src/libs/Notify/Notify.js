import './notify.css'

const notify = {
  info: (message) => {
    notify.show(message, 'info')
  },
  danger: (message) => {
    notify.show(message, 'error')
  },
  error: (message) => {
    notify.show(message, 'error')
  },
  success: (message) => {
    notify.show(message, 'success')
  },
  warning: (message) => {
    notify.show(message, 'warning')
  },
  show: (message, type) => {
    global.vNotify.options = {
      fadeInDuration: 100,
      fadeOutDuration: 100,
      fadeInterval: 50,
      visibleDuration: 2000,
      postHoverVisibleDuration: 500,
      sticky: false,
      showClose: true
    };
    try {
      global.vNotify[type]({text: message, title: ''});
    } catch (e) {
      // console.log("qqqqq eeeee", message, type, global.vNotify, e);
    }
    // window.$.notify({
    //   message
    // },{
    //   type,
    // });
  }
};

global.notify = notify;
export default notify;
