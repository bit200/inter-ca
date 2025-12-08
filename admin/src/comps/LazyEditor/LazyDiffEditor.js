import React, {lazy, Suspense, useState} from 'react';
const LazyDiffEditorDirect = lazy(() => import('./LazyDiffEditorDirect'));

function LazyEditor(props) {

    return <Suspense fallback={<div style={{padding: '30px'}}>Loading...</div>}>
        <LazyDiffEditorDirect {...props}></LazyDiffEditorDirect>
    </Suspense>
}

export default LazyEditor
