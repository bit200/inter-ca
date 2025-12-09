import React, {useEffect, useState} from 'react';
import _ from 'underscore';

import {
    Link, Outlet
} from "react-router-dom";


function DynamicStyle(props) {
   //console.log('*........ ## ROOT RENDER', props);

    let arr = global.m.from_to(0, 24);
    let DELAY = 30;

    let styleText = `
    
    .afade, .animMdChild > .wmde-markdown > *, .animChild > * {
      opacity: 0;
      animation: fadeInTT .4s ease forwards;
      animation-delay: ${arr.length * DELAY / 1000}s;
    }
    .afade {
      animation-delay: 0s
    }
    
  ${arr.map((it, ind) => {
        return `
.animMdChild > .wmde-markdown > *:nth-child(${ind + 1}), .animChild > *:nth-child(${ind + 1}) {
  animation-delay: ${(ind) * DELAY}ms;
}`
    }).join('\n')}
    
    
   @keyframes fadeInTT {
      from {
        opacity: 0;
        transform: translateY(-2px);
      }
      to {
        opacity: 1;
      }
    }
    `

  useEffect(() => {
    // Create a new style element
    const styleElement = document.createElement('style');
    styleElement.type = 'text/css';

    // Append the style text to the style element
    if ('textContent' in styleElement) {
      styleElement.textContent = styleText;
    } else {
      styleElement.styleSheet.cssText = styleText;
    }

    // Insert the style element into the head of the document
    document.head.appendChild(styleElement);

    // Cleanup function to remove the style element when the component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [styleText]);

  return null;
}

export default DynamicStyle
