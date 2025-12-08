import React, {lazy, Suspense, useState} from 'react';
const LazyEditorDirect = lazy(() => import('./LazyEditorDirect'));

function LazyEditor(props) {
    return  <Suspense fallback={<div style={{padding: '30px'}}>Loading...</div>}>
        <LazyEditorDirect {...props} />
    </Suspense>
}

export default LazyEditor
