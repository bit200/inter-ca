import React from 'react'
import './myMonacoEditor.css'
import ReactExtender from './../ReactExtender/ReactExtender';

// let {ReactExtender} = window.my;

class MyMonacoEditor extends ReactExtender {

  constructor(props) {
    super(props);
    this.value = this.props.value;
    this.language = this.props.language;
  }

  start() {
    let {value, language} = this.props;
    if (!window.run_editor) {
      return setTimeout(() => {
        this.start()
      }, 500)
    }
    try {

      this.editor = window.run_editor(this.refs.monac, {
        value   : [value].join('\n'),
        language: language
      }, (v) => {
        this.value = v;
        this.props.onChange && this.props.onChange(v)
      })
    } catch (e) {
    }

  }

  componentWillReceiveProps(d) {
    if (this.language !== d.language) {
      this.language = d.language;
      let model = this.editor.getModel()
      window.monaco.editor.setModelLanguage(model, this.language)
    }
  }

  componentDidMount() {
    this.start()
  }

  render() {
    let {height} = this.props;
    return (<div className={'monaco-editor-un'} style={{height: +(height || 250)}} ref="monac"></div>)
  }

}

export default MyMonacoEditor
