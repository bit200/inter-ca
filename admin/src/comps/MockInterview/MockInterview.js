import React from 'react';
import {useNavigate} from 'react-router-dom';
import MockInterviewCore from './MockInterviewCore';

function getIdFromUrl() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1];
}

// Тонкая обёртка над MockInterviewCore для маршрута /mock-interviews/:id -
// вся логика брони/старта/завершения попытки теперь общая с табом
// "Мок-интервью" в CourseQuiz (см. MockInterviewCore.js), тут только привязка
// к URL: id попытки из адреса, ретейк меняет адрес (replace, без добавления
// в историю браузера).
function MockInterview() {
    const navigate = useNavigate();

    return <MockInterviewCore
        attemptId={getIdFromUrl()}
        onRetake={(newId) => navigate(`/mock-interviews/${newId}`, { replace: true })}
    />;
}

export default MockInterview;
