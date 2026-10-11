import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const REF = doc(db, 'settings', 'hours');
const enabledEl = document.getElementById('h-enabled');
const openEl = document.getElementById('h-open');
const closeEl = document.getElementById('h-close');
const msgEl = document.getElementById('h-msg');

let unsubscribe = null;

document.getElementById('h-save').addEventListener('click', function () {
    if (!openEl.value || !closeEl.value) {
        msgEl.textContent = 'Укажите время открытия и закрытия.';
        return;
    }

    setDoc(REF, {
        enabled: enabledEl.checked,
        open: openEl.value,
        close: closeEl.value
    }).then(function () {
        msgEl.textContent = 'Сохранено.';
        setTimeout(function () { msgEl.textContent = ''; }, 2000);
    }).catch(function () {
        msgEl.textContent = 'Не удалось сохранить. Проверьте правила в Firebase.';
    });
});

onAuthStateChanged(auth, function (user) {
    if (user) {
        unsubscribe = onSnapshot(REF, function (snap) {
            if (!snap.exists()) return;

            const d = snap.data();
            enabledEl.checked = !!d.enabled;
            if (d.open) openEl.value = d.open;
            if (d.close) closeEl.value = d.close;
        });
    } else if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
});