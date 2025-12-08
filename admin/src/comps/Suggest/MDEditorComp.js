import React, { useState } from 'react';
import _ from 'underscore';
import MDEditor, { commands } from '@uiw/react-md-editor';
import './md.scss'
import "@uiw/react-markdown-preview/markdown.css";

const title3 = {
    name: 'code',
    keyCommand: 'code',
    buttonProps: { 'aria-label': 'Insert Code' },
    icon: (
        <div>Code</div>
    ),
    execute: (state, api) => {
        let modifyText = "```jsx\n" + state.selectedText + "\n```";
        if (!state.selectedText) {
            modifyText = '```jsx\n' +
                '\n```';
        }
        api.replaceSelection(modifyText);
    },
};

function MDEditorComp(props) {
    let { onChange, opts, defClass, value, rows } = props;

    rows =rows || opts.rows
    opts = opts || {}
    let { readOnly, preview } = opts || {};
    let height =(40 + rows * 20) || 500;
   //console.log("qqqqq height", height);
    return <div className={defClass || ''} data-color-mode="light">
        <MDEditor
            style={{ width: '100%' }}
            value={value}
            height={height}
            // fullscreen={true}
            onChange={(v) => {
                if (readOnly) {
                    // onChange(value)
                    global.notify.error('CANNOT EDIT::: Read Only Field')
                    return
                }

                onChange(v)
                // setValue(v);
                // onChange(v);
            }}
            preview={props.preview || preview || 'live'}
            commands={opts.commands || [
                // Custom Toolbars
                title3,
                commands.divider,
                commands.group([commands.title1, commands.title2, commands.title3, commands.title4, commands.title5, commands.title6], {
                    name: 'title',
                    groupName: 'title',
                    buttonProps: { 'aria-label': 'Insert title' }
                }),
                commands.bold,
                commands.italic,
                // commands.codeBlock,
                commands.divider,
                commands.hr,
                commands.comment,
                // commands.strikethrough,
                commands.quote,
                commands.divider,
                commands.image,
                commands.link,
                commands.divider,
                commands.checkedListCommand, commands.orderedListCommand, commands.unorderedListCommand,
                commands.divider,
                // commands.group([], subChild),
            ]}
        />
    </div>
}

export default MDEditorComp
