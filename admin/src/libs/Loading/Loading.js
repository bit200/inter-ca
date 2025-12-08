import React from 'react'
import './loading.css';
import Spinner from './../Spinner/Spinner';

class Loading extends React.Component {

  render() {
    let {loading, padding = 20, value} = this.props;
    loading = loading || value;
    return (<div className={'rel ' + (loading ? "loading-wrapper" : "")}
                 style={{paddingTop: padding + 'px', paddingBottom: padding + 'px'}}>
      {loading && <div className={"loading-spinner rel"}>
        <Spinner></Spinner>
        <small>{t('loading')} ...</small>
      </div>}
      <div className={(loading ? 'opacity-loading' : '') + ' loading'}>
        {this.props.children}
      </div>
    </div>)
  }

}

export default Loading
