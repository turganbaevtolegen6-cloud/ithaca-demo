import { db } from './firebase-init.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

let stopNames = [];

// отмечаем в меню блюда, которых нет в наличии
function applyStoplist() {
    document.querySelectorAll('.panel li:not(.head)').forEach(function (li) {
        const nameEl = li.querySelector('.name');
        if (!nameEl) return;

        const soldOut = stopNames.indexOf(nameEl.textContent.trim()) !== -1;
        li.classList.toggle('sold-out', soldOut);

        const btn = li.querySelector('.add-btn');
        if (btn) btn.disabled = soldOut;
    });
}

onSnapshot(doc(db, 'settings', 'stoplist'), function (snap) {
    stopNames = snap.exists() ? (snap.data().items || []) : [];
    applyStoplist();
}, function () {
    // если база недоступна, меню просто работает как обычно
});

// меню рисуется после загрузки из базы, поэтому отметки накладываем ещё раз
document.addEventListener('menu-rendered', applyStoplist);