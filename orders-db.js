import { db } from './firebase-init.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

// функция, которую вызывает корзина при отправке заказа
window.saveOrder = function (order) {
    return addDoc(collection(db, 'orders'), Object.assign({}, order, {
        createdAt: serverTimestamp(),
        status: 'new'
    }));
};