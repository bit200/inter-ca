import React, { useState, useEffect } from 'react';
import _ from 'underscore';


import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from '@mui/material/TextField';
import Storage from "../Storage";
import Button from "libs/Button";
import MyModal from "libs/MyModal";
import Input from "libs/Input";
import Tree from "../Tree";

let isAdmin = global.env.isAdmin;

function Layout2({ props }) {



    let categories = Storage.getCategoriesPlain();
    let categoriesObj = Storage.getCategories();
    let { localItem, onChange } = props
    let [openStatus, setOpenStatus] = useState(0)
    let [tag, setTag] = useState({ title: 'Category' })
    let [cd, setCd] = useState(0)
    let [loading, setLoading] = useState(true)


    // let v = useActionData();
    let modal;

    useEffect(() => {
        Storage.syncCategories(() => {
            setLoading(false)
        });
    }, [])
    let values = [...categories.filter(it => {
        return (localItem.hashTags || []).indexOf(it._id) > -1
    })];

    function onSave(scb) {
        Storage.addCategory(tag, (r) => {
            localItem.hashTags.push(r._id)
            modal.hide();
            onChange(localItem.hashTags, 'hashTags')

            scb && scb()
        })
    }
    if (loading) {
        return <div style={{ width: '100%' }}>
            Loading ...
        </div>
    }
    


    return <div style={{ width: '100%' }}>

        <Autocomplete
            multiple
            id="tags-outlined"
            options={categories}
            getOptionLabel={(option) => option.title || '--'}
            value={values}
            filterSelectedOptions
            onChange={(r, values) => {
                localItem.hashTags = _.map(values, it => it._id);
                onChange(localItem.hashTags, 'hashTags')
            }
            }
            renderInput={(params) => (
                <TextField
                    {...params}
                    label=""
                    placeholder={t('hashTags')}
                />
            )}
        />
        {isAdmin && <small className="pull-right pointer tags-add" onClick={() => {
            setOpenStatus(1)
            modal.show();
        }}>+ tag</small>}
        <MyModal
            size={'full'}
            ref={(el) => {
                modal = el
            }}
        >
            <h1>{t('newTagCreation')}</h1>
            <hr />
            {/* 

            <hr/> */}

            <div className="row">
                <div className="col-xs-5">
                    <Input placeholder="Имя тега" type="text" value={tag.title} onChange={(v) => {
                        tag.title = v;
                        setTag(_.extend({}, tag))
                    }
                    } />
                    <Button onClick={onSave}>{t('createTag')}</Button>



                </div>
                <div className="col-xs-7">
                    <div>{t('chooseParent')} ( <span>{t('choosenParent')}: {tag.parentId || '-'}</span>)</div>

                    <div>
                        <Tree
                            categoriesCount={{}}
                            defClassInput={"tree-wrap-input"}
                            defClass={"tree-wrap"}
                            selectedId={tag.parentId}
                            onClick={(id) => {
                                tag.parentId = id;
                                setTag(_.extend({}, tag))
                            }}></Tree>
                    </div>
                </div>
            </div>
            {/* <hr/> */}

            {/* <hr/>
            <Button onClick={onSave}>Создать тег</Button> */}

        </MyModal>

    </div>
}

// import React, { useEffect, useState } from "react";
//
//
// const filter = createFilterOptions();
//
// function MultiSelectCreatable() {
//     const [selected, setSelected] = useState([]);
//     const [options, setOptions] = useState([]);
//
//     useEffect(() => {
//         setOptions(data);
//     }, []);
//
//     return (
//         <Autocomplete
//             value={selected}
//             multiple
//             onChange={(event, newValue, reason, details) => {
//                 if (details?.option.create && reason !== "removeOption") {
//                     setSelected([...selected, {
//                         id: undefined,
//                         name: details.option.name,
//                         create: details.option.create,
//                     }]);
//                 } else {
//                     setSelected(newValue.map(value => {
//                         if (typeof value === "string") {
//                             return {
//                                 id: undefined,
//                                 name: value,
//                                 create: true,
//                             }
//                         } else {
//                             return value
//                         }
//                     }));
//                 }
//             }}
//             filterSelectedOptions
//             filterOptions={(options, params) => {
//                 const filtered = filter(options, params);
//
//                 const { inputValue } = params;
//                 // Suggest the creation of a new value
//                 const isExisting = options.some((option) => inputValue === option.name);
//                 if (inputValue !== "" && !isExisting) {
//                     filtered.push({
//                         name: inputValue,
//                         label: `Add "${inputValue}"`,
//                         create: true,
//                     });
//                 }
//
//                 return filtered;
//             }}
//             selectOnFocus
//             clearOnBlur
//             handleHomeEndKeys
//             id="tags-Create"
//             options={options}
//             getOptionLabel={(option) => {
//                 // Value selected with enter, right from the input
//                 if (typeof option === "string") {
//                     return option;
//                 }
//                 // Add "xxx" option created dynamically
//                 if (option.label) {
//                     return option.name;
//                 }
//                 // Regular option
//                 return option.name;
//             }}
//             renderOption={(props, option) => (
//                 <li {...props}>{option.create ? option.label : option.name}</li>
//             )}
//             freeSolo
//             renderInput={(params) => <TextField {...params} label="Tags" />}
//         />
//     );
// }
//
// const data = [
//     {
//         id: 1,
//         name: "Tag1",
//     },
//     {
//         id: 2,
//         name: "Tag2",
//     },
//     {
//         id: 3,
//         name: "Tag3",
//     },
//     {
//         id: 4,
//         name: "Tag4",
//     },
// ];

export default Layout2
