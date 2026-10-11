import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const REF = doc(db, 'settings', 'orders');
const btn = document.getElementById('accept');

let open = true;
let unsubscribe = null;

function paint() {
    btn.textContent = open ? 'Приём заказов: включён' : 'Приём заказов: выключен';
    btn.classList.toggle('off', !open);
}

btn.addEventListener('click', function () {
    setDoc(REF, { open: !open }, { merge: true }).catch(function () {
        alert('Не удалось изменить. Проверьте правила в Firebase.');
    });
});

onAuthStateChanged(auth, function (user) {
    if (user) {
        unsubscribe = onSnapshot(REF, function (snap) {
            // если настройки ещё нет, считаем, что приём включён
            open = snap.exists() ? snap.data().open !== false : true;
            paint();
        });
    } else if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
});