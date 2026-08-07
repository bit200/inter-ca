export const groupItems = (items, mode) => {
    const order = [];
    const map = {};

    items.forEach(item => {
        //skip exams from modules
        if(mode === 'module' && item.exam){
            return
        }

        //skip modules from exam
        if(mode === 'exam' && !item.exam){
            return
        }

        const key = mode === 'module'
            ? (item.titleInfo?.moduleInfo?.name || 'Без модуля')
            : String(item.exam ?? 'unknown');
        if (!map[key]) {
            map[key] = [];
            order.push(key);
        }
        map[key].push(item);
    });
    return order.map(key => ({ key, items: map[key] }));
}

