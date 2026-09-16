import React from 'react';

// Ячейка «Название» в таблице /mock-interviews. Попытки, созданные до того, как
// запуск стал передавать name (персональные, из курса, из экзамена), хранятся
// без названия - вместо пустой строки показываем общее.
function MockInterviewName({ item }) {
    return <span>{item?.name || 'Мок-интервью'}</span>;
}

export default MockInterviewName;
