// import react, {useState, useEffect} from 'react';
// import LazyEditor from '../LazyEditor/LazyEditor';

// function EditorView({props}) {
//     let { item, resetMemo } = props;
//    //console.log('propsssssssVIEW', item, props)
//     let [selectedFileInd, setSelectedFileInd] = useState(0)
//     let [selectedSolutionFileInd, setSelectedSolutionFileInd] = useState(0)
//     let { files } = item || {};
//     files = files || [];
//     let isFiles = files && files.length > 0;
//     let selectedFileName = (files[selectedFileInd] || {}).name
//     let selectedSolutionFileName = (files[selectedSolutionFileInd] || {}).name
//     let data = {details: item}
//     data.details = data.details || {};
//     data.details.starterFiles = data.details.starterFiles || {};
//     data.details.solutionFiles = data.details.solutionFiles || {};

//     function getFileExt(name) {
//         let arr = (name || '').split('.')
//         let last = arr[arr.length - 1];
//         let ext = last === 'css' ? 'css' : last === 'html' ? 'html' : last === 'ts' ? 'typescript' : 'javascript';

//         return ext;
//     }

//     // console.log("RENDER EDITOR", data)
//     return <>
//         <div>Показ для запуска</div>
//         {isFiles && (files || []).map((it, ind) => {
//             return <div
//                 onClick={() => {
//                     setSelectedFileInd(ind)
//                 }}
//                 className={'ib filesItem ' + (ind === selectedFileInd ? 'correct' : '')}>{it.name || '-'}</div>
//         })}
//         <LazyEditor
//             height="300px"
//             defaultLanguage={getFileExt(selectedFileName)}
//             language={getFileExt(selectedFileName)}
//             value={
//                 !isFiles ? data.details.starter || '' : (data.details.starterFiles[selectedFileName] || '')
//             }
//             // value={}
//             onChange={(solution) => {
//                 // localItem.jsDetails ??= {}
//                 // props.onChange({...props.localItem, solution})
//                 if (isFiles) {
//                     data.details.starterFiles[selectedFileName] = solution;
//                 } else {
//                     data.details.starter = solution;
//                 }
//                 // resetMemo()
//                 // setData(data)
//                 // autoSave(data)
//             }}
//         />
//         <div>Правильное решение</div>
//         {isFiles && (files || []).map((it, ind) => {
//             return <div
//                 onClick={() => {
//                     setSelectedSolutionFileInd(ind)
//                 }}
//                 className={'ib filesItem ' + (ind === selectedSolutionFileInd ? 'correct' : '')}>{it.name || '-'}</div>
//         })}
//         <LazyEditor
//             height="500px"
//             defaultLanguage={getFileExt(selectedSolutionFileName)}
//             language={getFileExt(selectedSolutionFileName)}
//             value={
//                 !isFiles
//                     ? ((data.details || {}).correctSolution || '')
//                     : (data.details.solutionFiles[selectedSolutionFileName] || '')
//             }
//             // value={(data.details || {}).correctSolution || ''}
//             // value={}
//             onChange={(solution) => {
//                 if (isFiles) {
//                     data.details.solutionFiles[selectedSolutionFileName] = solution;

//                 } else {
//                     data.details.correctSolution = solution;

//                 }
//                 // resetMemo()
//                 setData(data)
//                 autoSave(data)

//             }}
//         />
//         <label>Юнит Тесты
//             <span className="ib" style={{ marginTop: '-12px', marginLeft: '10px' }}><input
//                 type={"checkbox"} checked={(data.details || {}).isUnitTests}
//                 onChange={(e) => {
//                     data.details.isUnitTests = e.target.checked;
//                     resetMemo && resetMemo();
//                     setData({ ...data })
//                     autoSave(data)

//                 }
//                 } />
//             </span>
//         </label>

//         {(data.details || {}).isUnitTests && <LazyEditor
//             height="500px"
//             defaultLanguage="javascript"
//             language="javascript"
//             value={(data.details || {}).unitTests || ''}
//             // value={}
//             onChange={(solution) => {
//                 data.details.unitTests = solution;
//                 resetMemo()
//                 setData(data)
//                 autoSave(data)
//             }}
//         />}
//     </>
// }

// export default EditorView