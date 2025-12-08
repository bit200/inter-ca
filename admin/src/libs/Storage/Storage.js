const Storage = {
  get(key)  {
    let value = localStorage.getItem(key);
    if (value === 'undefined') {
      return ''
    }
    try {
      value = JSON.parse(value)
    } catch (e) {

    }
    return value;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

window.Storage = Storage;

export default Storage;