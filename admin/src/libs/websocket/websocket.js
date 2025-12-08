import user from './../user/user';
import m from './../m/m';
import notify from '../Notify/Notify'

let socket;
let connected;

function init() {
  // return console.log('........ ## WEBSoCKET DISABLED FOR NOW');
  if (socket && socket.close) {
    socket.onclose = null
    socket && socket.close && socket.close();
  }
  // socket = new WebSocket('ws://127.0.0.1:8085/ws/' + user.get_token())
  // socket = new WebSocket('wss://floos.me/ws/' + user.get_token());

  socket.onopen = () => {
    connected = true
  };

  socket.onmessage = (d) => {
    let token =  localStorage.getItem('token');
    if(!token){
      return;
    }
    let data = d.data;

    try {
      data = JSON.parse(data);
      let type = data.type;
      if (type === 'loan') {
        let loan = data.data;
        let it = [loan];
        m.call_listener('loanRealtime', it);
        m.getCur() && m.getCur().loanChanged && m.getCur().loanChanged(it);
        // m.getLoansTable() && m.getLoansTable().loanChanged && m.getLoansTable().loanChanged(it);
      } else if (type === 'notification') {

      } else if (type === 'point') {
        let point = data.data;
        m.call_listener('pointRealtime', point);
        m.getLoansTable() && m.getLoansTable().pointChanged && m.getLoansTable().pointChanged(point);
      } else if (type === 'userRequest') {
        let name = `New Edit Request!<br/>From: ${data.userName}<br/>ID: ${data.userId}<br/><a style="color: black; font-weight: bold" href="${'/admin/app/customers/'+ data.userId}">Click here to open</a>`;
        notify.info(name);
      }
    } catch (e) {
      data = {}
    }
  };

  socket.onclose = (d) => {
   // console.log'........ ## on close connection');
    setTimeout(init, 1000)
  }

}

// init()

let Websocket = {
  reconnect() {
    init()
  },
  emit(data) {
    if (connected) {
     // console.log'........ ## emit here wsfile');
      socket.send("It worked!")
    }
  }
}


export default Websocket
