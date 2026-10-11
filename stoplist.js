import { db } from './firebase-init.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

// отмечаем в меню блюда, которых нет в наличии
function applyStoplist(names) {
    document.querySelectorAll('.panel li:not(.head)').forEach(function (li) {
        const nameEl = li.querySelector('.name');
        if (!nameEl) return;

        const soldOut = names.indexOf(nameEl.textContent.trim()) !== -1;
        li.classList.toggle('sold-out', soldOut);

        const btn = li.querySelector('.add-btn');
        if (btn) btn.disabled = soldOut;
    });
}

onSnapshot(doc(db, 'settings', 'stoplist'), function (snap) {
    applyStoplist(snap.exists() ? (snap.data().items || []) : []);
}, function () {
    // если база недоступна, меню просто работает как обычно
});