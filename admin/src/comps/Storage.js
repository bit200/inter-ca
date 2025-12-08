import _ from 'underscore';

let timer;
let isImported;
let api_domain = `http://212.8.247.141222222:6057`;

let categoriesObj = {};
let categoriesArr = [];
let users = [];
let users_obj = {};
const Storage = {

    getId(v) {
        let arr = window.location.href.split('/');
        return arr[arr.length - 1]
    },
    setImport(v) {
        // users = v.users;
        categoriesObj = v.categoriesObj;
        skills = v.skills;
        // users_obj = Storage.objectifyUsers()

        Storage.set('categoriesObj', categoriesObj);
        Storage.set('skills', skills);
        Storage.set('users', users);


    },
    get(key) {
        let value = localStorage.getItem(key);
        try {
            value = JSON.parse(value)
        } catch (e) {

        }
        return value;
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        if (/skills|users|categoriesObj/gi.test(key) && isImported) {

            clearTimeout(timer);
            timer = setTimeout(() => {
                Storage.exportObj(this.exportAnimation)
            }, 700)
        }

    },

    exportAnimation() {
        let el = window.$('#export');
        el.removeClass('active');
        setTimeout(() => {
            el.addClass('active')
        }, 10)
    },

    timeId(delta = 0) {
        let cd = new Date().getTime();
        return cd + delta;
    },
    addCategory(obj, cb) {
        let parentId = obj.parentId;

        global.http.post('/hash-tag', obj)
            .then(r => {
                let _category = {_id: r._id, title: r.title, parentId};
                Storage.setCategory(_category._id, _category);
                cb && cb(_category)
            })
    },
    getUserId() {
        return 1000;
    },

    getCategoryId() {
        let userId = this.getUserId() || 1000;
        return `cat_${userId}_${this.timeId()}`
    },

    getSkillId() {
        let userId = this.getUserId() || 1000;
        return `skill_${userId}_${this.timeId()}`
    },
    loadQuestions(hashTags, cb) {
        if (!hashTags || hashTags == -1) {
            return cb && cb([])
        }
        let filter = {hashTags};

        global.http.get('/theme-question', {filter, per_page: 100000}).then(r => {
            cb && cb(r.items)
        })
    },

    getCountsByTags(selectedTags, historyObj, questions) {
        let DEFAULT_STATUS = 'bad';
        let counts = {good: 0, bad: 0, norm: 0, very_good: 0, total: 0, percAbs: 0, totalRepeat: 0};
        let timers = {good: 2, bad: 0, norm: 1, very_good: 3};
        let byTags = {};

        function getDelta (status, isLast) {
            return timers[status] * (isLast ? .7 : 1)
        }

        function setTag (tag, status, isLast) {
            byTags[tag] = byTags[tag] || {};
            byTags[tag][status] = (byTags[tag][status] || 0) + 1
            byTags[tag].total = (byTags[tag].total || 0) + 1
            byTags[tag].totalRepeat = (byTags[tag].totalRepeat || 0) + (isLast ? 1 : 0)
            byTags[tag].percAbs = (byTags[tag].percAbs || 0) + getDelta(status, isLast);
        }


        let cd = new Date().getTime();

        _.each(questions, (item, ind) => {
            let status = (historyObj[item._id] || {}).status || DEFAULT_STATUS;
            let nextCd = (historyObj[item._id] || {}).nextCd || 0;
            let isLast = cd > nextCd


            counts[status]++;
            counts.total++;
            counts.totalRepeat += (isLast ? 1 : 0);
            counts.percAbs += getDelta(status, isLast);

            if ((item.hashTags || []).length) {
                _.each(item.hashTags, (tag, ind) => {
                    setTag(tag, status, isLast)
                })
            } else {
                setTag('empty', status, isLast)
            }
        })

        function setPerc (item) {
            item.perc = Math.round(100 * (item.percAbs || 0) / ((item.total * timers.very_good) || 1))
        }

        let countsWithTags = {};



        _.each(byTags, (item, tagId) => {
            setPerc(item)
            if (!selectedTags || selectedTags[tagId]) {
                // console.log("qqqqq tagId", tagId, selectedTags[tagId]);

                ['good', 'norm', 'bad', 'total', 'very_good', 'percAbs'].forEach(key => {
                    countsWithTags[key] = (countsWithTags[key] || 0) + ((byTags[tagId] || {})[key] || 0)
                })
            }
        })

        setPerc(counts)
        setPerc(countsWithTags)


        return {counts, countsWithTags, byTags};
    },
    // loadQuestionsByTag(tag, questions) {
    //     return questions.filter(it => {
    //         return it.hashTags.indexOf(tag) > -1;
    //     })
    // },
    // getCountsByTag(tag, historyObj, questions) {
    //     let v = {
    //         good: 0,
    //         bad: 0,
    //         norm: 0,
    //         very_good: 0,
    //         total: 0
    //     }
    //     _.each(Storage.loadQuestionsByTag(tag, questions), (item, ind) => {
    //         let status = (historyObj[item._id] || {}).status || 'bad'
    //         v[status]++;
    //     })
    //
    //     return v
    // },

    getDBUsers(cb) {
        return new Promise((resolve, reject) => {
            global.http.get('/all-users', {})
                .then(items => {
                    let _items =items.map(it => {
                        return {_id: it._id, label: `${it.username} #${it._id}`}
                    })
                    cb && cb(_items)
                    resolve && resolve(_items)
                })
        })

    },
    sortQuestions(questions, historyObj) {
        return _.sortBy(questions, it => {
            let hist =((historyObj || {})[it._id] || {});
            return (hist.isFavorite ? -100000000000000 : 0) + +(hist.nextCd || 0) - (it.interviewsCount || 0)
        })
    },

    changeStatus(question) {
        global.http.get('/set-quiz-history', {question: question._id, status: question.status})
            .then(r => {
                delete r.history;
                global.setHistoryObj({...global.historyObj, [r.question]: r});
            })
    },
    calcHashTags(questions, historyObj) {
        let questionsObj = {};
        _.each(questions, (item, ind) => {
            _.each(item.hashTags, (it, ind) => {
                questionsObj[it] = questionsObj[it] || [];
                questionsObj[it].push(item._id)
            })

        })

        let counts = {
            bad: 0,
            norm: 1,
            good: 2,
            very_good: 3,
        }
        let progressObj = {};

       //console.log("qqqqq questionsObj", questionsObj, progressObj);
        _.each(Storage.getCategoriesPlain(), category => {
            let _id = category._id;
            let arr = questionsObj[_id] || [];
            let count = 0;
            let total = arr.legnth;
            _.each(arr, (questionId, ind) => {
                count += counts[historyObj[questionId]] || 0
            })

            progressObj[_id] = {total, perc: count / ((total * 4) || 1), count}

        })
        return {questionsObj, progressObj};

    },
    changeFavorite(question, isFavorite) {
        global.http.get('/set-is-favorite', {question: question._id, isFavorite})
            .then(r => {
               //console.log("qqqqq status are saved", r);
                delete r.history;
                global.setHistoryObj({...global.historyObj, [r.question]: r});
            })
    },
    loadMyQuestions(hashTags, cb) {

        // global.http.get('/my-questions', {hashTags}).then(r => {
        //     cb && cb(r)
        // })
    },
    loadMySprints(cb) {
        global.http.get('/my-sprints?cd=' + new Date().getTime(), {}).then(r => {
            cb && cb(r)
        })
    },
    loadInterviewQuestions(hashTags, cb) {
        if (!hashTags || hashTags == -1) {
            return cb && cb([])
        }
        let filter = {hashTags};

        global.http.get('/interview-question', {filter, per_page: 100000}).then(r => {
            cb && cb(r.items)
        })
    },
    loadInterviewQuestionsByTheme(themeId, cb) {

        let filter = {
            themeQuestionId: themeId
        }
        global.http.get('/interview-question', {filter, per_page: 99999}).then(r => {
            cb && cb(r.items)
        })
    },
    getCategoriesPlain() {
        return Object.keys(categoriesObj).map(it => {
            return categoriesObj[it]
        })
    },
    getCategories() {
        return categoriesObj;
    },

    syncCategories(cb) {
        global.http.get('/hash-tag', {per_page: 10000}).then((r) => {
            categoriesObj = {};
            _.each(r.items, it => {
                it.parentId = it.parentId || -1;
                categoriesObj[it._id] = it;
            })
            Storage.calcCategoriesChilds();
            cb && cb();
        })
    },
    calcCategoriesChilds() {
        _.each(categoriesObj, (it, key) => {
            it.childs = [];
        });

        _.each(categoriesObj, (it, _id) => {
            let parent = categoriesObj[it.parentId];
            if (parent && parent.childs) {
                parent.childs.push(_id)
            }
        })
    },

    setCategories(v) {
        categoriesObj = v || categoriesObj;
        Storage.calcCategoriesChilds();

        Storage.set('categoriesObj', categoriesObj)
    },

    deleteCategory(id) {
        let ids = Storage.getAllChildIds(id);

        _.each(ids, (_id, ind) => {
            delete categoriesObj[_id]
        })

        Storage.set('categoriesObj', categoriesObj);
        skills = _.filter(skills, it => {
            return ids.indexOf(it.category) < 0
        });

        Storage.set('skills', skills);
    },
    getObj() {
        let obj = {
            users: (Storage.getUsers() || {}).users,
            categoriesObj: Storage.getCategories(),
            skills: Storage.getAllSkills()
        };
        return obj;
    },
    exportObj(cb) {
        let obj = Storage.getObj();

        global.http.post('/save_skills', obj, {domain: api_domain})
            .then(r => {
               //console.log('*........ ## rrrr', r);
                cb && cb();

            })
            .catch(e => {
                alert(JSON.stringify(e));
            })
    },

    importObj(cb) {

        global.http.get('/get_skills', {}, {domain: api_domain})
            .then(r => {
               //console.log('*........ ## rrrr', r);
                // window.notify.success('Imported ')

                Storage.setImport(r);
                cb && cb(r);
                isImported = true;
            })
    },
    setCategory(id, obj) {
        categoriesObj[id] = obj;
        Storage.calcCategoriesChilds();

        Storage.set('categoriesObj', categoriesObj)
        global.http.put('/hash-tag', obj);
    },
    getUsers() {
        return {users, users_obj}
    },

    getSkills(categoryId, filter, onlyThatCategory) {
       //console.log('*........ ## categoryId', categoryId);
        filter = filter || {};
        let searchReg = filter.search ? new RegExp(filter.search, 'gi') : null;


        if (filter.skill_id) {
            return _.sortBy(_.filter(skills, it => {
                return it._id == filter.skill_id
            }), it => {
                return it.isPin2 ? 3 : (it.isPin ? 2 : 1)
            })
        }

        let _ids = onlyThatCategory ? [categoryId] : this.getAllChildIds(categoryId);

        return _.sortBy(
            _.filter(skills,
                skill => {
                    if (searchReg && !searchReg.test(skill.title)) {
                        return false;
                    }
                    return (categoryId == -1) || (_ids.indexOf(skill.category) > -1)// == categoryId;
                })
            , it => {
                return (it.isPin2 ? 1 : (it.isPin ? 2 : 3)) //* (((categoryId === -1) || (it.category === categoryId)) ? 1 : -1)
            })
    },
    getAllSkills() {
        return skills;
    },

    getAllChildIds(categoryId) {
        let arr = [categoryId];

        _.each((categoriesObj[categoryId] || {}).childs, (childId, ind) => {
            arr = arr.concat(this.getAllChildIds(childId))
        });

        return _.uniq(arr);
    },

    getHash(key, defValue) {

        let arr = (window.location.hash || '').replace('#', '').split('&');
        _.each(arr, (it, ind) => {
            let _arr = it.split("=")
            if (_arr[0] == key) {
                defValue = _arr[1]
            }
        })
        return defValue;

    },

    getAuthorsId() {
        let userId = this.getUserId() || 1000;
        return `user_${userId}_${this.timeId()}`
    },
    objectifyUsers() {
        let obj = {};
        _.each(users, (it, ind) => {
            if (!it._id) {
                it._id = this.getAuthorsId();
            }
            obj[it._id] = it;
        })
        return obj;
    },
    filterSkills() {
        _.each(skills, (skill, ind) => {
            this.skillCalcUpdate(skill);
            _.each(skill, (it, key) => {
                if (/[а-я]/gi.test(key)) {
                    // console.log('*........ ## key', key);
                    delete skill[key];
                }
            })
            // console.log('*........ ## skill ', skill);
        });
        Storage.set('skills', skills)

    },
    updateThemeQuestion(question, cb) {
        global.http.put('/theme-question', question).then(r => {
            cb && cb()
        })
    },
    tryRemoveQuestion(question, cb) {
        global.http.get('/try-remove-question', {_id: question._id}).then(r => {
            cb && cb()
        })
    },
    createThemeQuestion(query, cb) {
        global.http.post('/theme-question', query).then(r => {
            cb && cb(r)
        })
    },
    skillCalcUpdate(skill) {

        let delta_counts = {
            '-1': -2,
            0: 1,
            1: 3
        };
        let delta_counts0 = {
            '-1': -6,
            0: 1,
            1: 3
        };
        let MAX_LENG = 10;
        let scores = [1, 2, 4, 7, 14, 21, 30, 45, 60, 90, 90];
        skill.history = (skill.history || []).slice(0, MAX_LENG);
        let {history = []} = skill;
        let score10 = 0;
        let score3 = 0;

        let is_ok = null;
        _.each(history, (it, ind) => {
            let value = it.value;
            is_ok = is_ok || (value > -1);
            let score_v = (is_ok ? delta_counts : delta_counts0)[value];
            score10 += score_v;
            if (ind < 3) {
                score3 += score_v;
            }
           //console.log('*........ ## score_v', {is_ok, score_v, value, score10, score3});

        });

        skill.score10 = score10;
        skill.score3 = score3;
        let vv = history.length;
        if (score3 < 0) {
            vv = Math.max(Math.round(vv * 4 / 7), 0);
        }
        // else if (score3 > 0) {
        //   vv = Math.min(MAX_LENG, vv + 1)
        // }

        skill.scoreInd = vv;
        skill.nextCd = new Date().getTime() + (scores[vv] || 360) * 24 * 3600 * 1000;
    },
    // deleteSkill(skill) {
    //   skills = _.filter(skills, it => {
    //     return it._id != skill._id
    //   })
    //   Storage.set('skills', skills)
    // },
    // skillUpdate(skill) {
    //   let _id = skill._id;
    //   let _skill = _.filter(skills, it => {
    //     return it._id == _id
    //   })
    //   _skill.cd = _skill.cd || new Date().getTime();
    //   _skill = _.extend(_skill, skill);
    //   Storage.set('skills', skills);
    // },
    // updateUsers(_users) {
    //   users = _users;
    //   users_obj = Storage.objectifyUsers();
    //   Storage.set('users', users)
    // }

};

let skills = Storage.get('skills') || [];

window.Storage = Storage;

export default Storage;
