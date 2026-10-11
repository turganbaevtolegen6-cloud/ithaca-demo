import { db } from './firebase-init.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

let manualOpen = true;
let hours = { enabled: false, open: '08:00', close: '22:00' };

function toMinutes(text) {
    const parts = String(text).split(':');
    return Number(parts[0]) * 60 + Number(parts[1] || 0);
}

// текущее время в Алматы, например "14:35"
function almatyNow() {
    return new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Asia/Almaty',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).format(new Date());
}

function withinHours() {
    if (!hours.enabled) return true;

    const now = toMinutes(almatyNow());
    const start = toMinutes(hours.open);
    const end = toMinutes(hours.close);

    if (start === end) return true;

    // часы могут переходить через полночь, например с 10:00 до 02:00
    return start < end ? (now >= start && now < end) : (now >= start || now < end);
}

function update() {
    const open = manualOpen && withinHours();

    window.ordersOpen = open;
    document.body.classList.toggle('orders-closed', !open);

    document.querySelectorAll('.closed-banner').forEach(function (banner) {
        banner.textContent = manualOpen
            ? 'Сейчас мы закрыты. Заказы принимаем с ' + hours.open + ' до ' + hours.close + '.'
            : 'Сейчас заказы не принимаются. Попробуйте позже.';
    });
}

window.ordersOpen = true;

onSnapshot(doc(db, 'settings', 'orders'), function (snap) {
    manualOpen = snap.exists() ? snap.data().open !== false : true;
    update();
}, function () {});

onSnapshot(doc(db, 'settings', 'hours'), function (snap) {
    if (snap.exists()) {
        const d = snap.data();
        hours = {
            enabled: !!d.enabled,
            open: d.open || '08:00',
            close: d.close || '22:00'
        };
    }
    update();
}, function () {});

// проверяем время каждые 30 секунд, чтобы страница сама закрывалась и открывалась
setInterval(update, 30000);