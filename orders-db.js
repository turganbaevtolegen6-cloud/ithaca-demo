import { db } from './firebase-init.js';
import {
    collection, addDoc, serverTimestamp, doc, onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

// функция, которую вызывает корзина при отправке заказа
window.saveOrder = function (order) {
    return addDoc(collection(db, 'orders'), Object.assign({}, order, {
        createdAt: serverTimestamp(),
        status: 'new'
    }));
};

// принимает ли кофейня заказы сейчас
window.ordersOpen = true;

onSnapshot(doc(db, 'settings', 'orders'), function (snap) {
    window.ordersOpen = snap.exists() ? snap.data().open !== false : true;
    document.body.classList.toggle('orders-closed', !window.ordersOpen);
}, function () {
    // если база недоступна, приём считается включённым
});