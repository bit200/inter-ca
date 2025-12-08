import React, {lazy, Suspense, useEffect, useState} from 'react';
import {Editor, loader} from "@monaco-editor/react";
import * as monaco from 'monaco-editor';

loader.config({monaco});

function EditDirect(props) {
    console.log("qqqqq monaco editor porps", props);
    const [theme, setTheme] = useState('vs-light'); // Default theme

    useEffect(() => {
        const updateTheme = () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            setTheme(currentTheme === 'dark' ? 'vs-dark' : 'vs-light');
        };

        updateTheme(); // Update theme on component mount

        // Optional: Recheck theme whenever the body's data-theme attribute changes
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
            attributes: true, // Watch for attribute changes
            attributeFilter: ['data-bs-theme'] // Only watch the 'data-theme' attribute
        });

        // Cleanup observer on component unmount
        return () => observer.disconnect();
    }, []);

    return <div className={'myEditorWrap'} style={{height: props.height || 'auto'}}>
        <Editor {...props} height={'100%'} width={'100%'} theme={theme} ></Editor>
    </div>
}

export default EditDirect
