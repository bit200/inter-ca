import React from 'react';
import MDEditor from '@uiw/react-md-editor';

import {safeMarkdownProps} from './sanitize';


// Единая точка входа для рендера markdown: санитайзер подключён здесь,
// поэтому во всём приложении используем <SafeMarkdown/>, а не <MDEditor.Markdown/> напрямую.
export default function SafeMarkdown(props) {
  return <MDEditor.Markdown {...safeMarkdownProps} {...props}/>;
}
