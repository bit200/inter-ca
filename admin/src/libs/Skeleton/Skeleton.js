import React from 'react'
// import './skeleton.css'
import Skeleton from '@mui/material/Skeleton';

class Skeleton2 extends React.Component {


  render() {

    let {width = '100%', abs, height = '10', key, title, label} = this.props;
    height = height + 'px';
    
    let count = Math.max(this.props.count || 3)
    console.log("qqqqq this props333333333", this.props);

    label = this.props.woLabel ? '' : (label ? t(label) : (t('loading') + ' ...'))
    return <div style={{width}} title={key || title} className={'skeleton-wrap ' + (abs ? 'absSkeleton' : '')}>
      {!abs && !!label && <h6 className={'tc'}>{label}</h6>}
      {/*<div className="skeleton" style={{height}}>*/}
      {/*</div>*/}
      {/*<div className="skeleton skeleton-second" style={{height}}>*/}
      {/*</div>*/}
      {/*<div className="skeleton skeleton-third" style={{height}}>*/}
      {/*</div>*/}
      {(m.from_to(1, count) || []).map((it, ind) => {
        let delay = 1000 +  it * 100 * 3;
        let delay2 = it * 100;
          return (<div key={ind} >
            <Skeleton
                sx={{ animationDelay: `${delay2}ms` }}
            />
            <Skeleton animation="wave"  style={{width: '100%'}}
                      sx={{ animationDelay: `${delay2}ms`}}
            />
          </div>)
      })}

      <Skeleton animation={false} />


    </div>
  }

}

// global.Table = Table;

export default Skeleton2
