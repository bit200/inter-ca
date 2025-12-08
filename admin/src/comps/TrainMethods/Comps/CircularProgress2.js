import React, {useState} from 'react';
import CircularProgress from '@mui/material/CircularProgress';

export function CircularProgress2(props) {
  return (
      <div className="ProgressCircle" style={{zoom: props.zoom || 1}} title={props.title}>
        <small>{props.name}</small>
          <CircularProgress
              variant="determinate"
              thickness={10}
              value={props.value} // Set your progress value
              size={props.size || 20} // Set your circle size
              style={{ color: 'var(--c1)' }}
          />


      </div>
  );
}
export default CircularProgress2;
