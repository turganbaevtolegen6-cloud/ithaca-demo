import { auth, db } from './firebase-init.js';
import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
    collection, query, orderBy, limit, onSnapshot, doc, updateDoc,
    setDoc, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { MENU_REF } from './menu-store.js';

const loginBox = document.getElementById('login');
const panel = document.getElementById('panel');
const loginMsg = document.getElementById('login-msg');
const panelMsg = document.getElementById('panel-msg');
const ordersEl = document.getElementById('orders');
const emptyEl = document.getElementById('empty');
const stopEl = document.getElementById('stoplist');
const stopMsg = document.getElementById('stop-msg');

const STOP_REF = doc(db, 'settings', 'stoplist');

const STATUSES = [
    ['new', 'Новый'],
    ['cooking', 'Готовится'],
    ['ready', 'Готов'],
    ['done', 'Выдан']
];

let unsubscribe = null;
let unsubscribeStop = null;
let firstLoad = true;
let menuStructure = null;
let stopNames = [];

// ---------- Вход и выход ----------

document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    loginMsg.textContent = '';

    signInWithEmailAndPassword(
        auth,
        document.getElementById('email').value.trim(),
        document.getElementById('password').value
    ).catch(function () {
        loginMsg.textContent = 'Не удалось войти. Проверьте почту и пароль.';
    });
});

document.getElementById('logout').addEventListener('click', function () {
    signOut(auth);
});

onAuthStateChanged(auth, function (user) {
    if (user) {
        loginBox.classList.add('hidden');
        panel.classList.remove('hidden');
        document.getElementById('who').textContent = user.email;
        startListening();
        startStoplist();
    } else {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        if (unsubscribeStop) {
            unsubscribeStop();
            unsubscribeStop = null;
        }
        panel.classList.add('hidden');
        loginBox.classList.remove('hidden');
    }
});

// ---------- Вкладки «Заказы» и «Стоп-лист» ----------

document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (t) {
            t.classList.remove('active');

            const view = document.getElementById(t.dataset.view);
            if (view) view.classList.toggle('hidden', t !== tab);
        });
        tab.classList.add('active');
    });
});

// ---------- Заказы в реальном времени ----------

function startListening() {
    firstLoad = true;
    panelMsg.textContent = '';

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));

    unsubscribe = onSnapshot(q, function (snap) {
        if (!firstLoad) {
            snap.docChanges().forEach(function (change) {
                if (change.type === 'added') beep();
            });
        }
        firstLoad = false;
        render(snap.docs);
    }, function () {
        ordersEl.innerHTML = '';
        panelMsg.textContent = 'Нет доступа к заказам. Этот аккаунт должен быть указан в правилах (UID сотрудника).';
    });
}

function render(docs) {
    ordersEl.innerHTML = '';
    emptyEl.classList.toggle('hidden', docs.length > 0);

    let fresh = 0;

    docs.forEach(function (d) {
        const order = d.data();
        if (order.status === 'new') fresh++;
        ordersEl.appendChild(orderCard(d.id, order));
    });

    document.title = (fresh ? '(' + fresh + ') ' : '') + 'Кухня';
}

// ---------- Карточка заказа (текст вставляем безопасно через textContent) ----------

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function formatPrice(n) {
    return Number(n || 0).toLocaleString('ru-RU') + ' ₸';
}

function formatTime(ts) {
    if (!ts || !ts.toDate) return '';
    return ts.toDate().toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
}

function orderCard(id, o) {
    const card = el('div', 'order st-' + o.status);

    const top = el('div', 'order-top');
    top.appendChild(el('span', '', formatTime(o.createdAt)));
    top.appendChild(el('span', 'badge', o.mode === 'delivery' ? 'Доставка' : 'Самовывоз'));
    card.appendChild(top);

    const client = el('p', 'order-client');
    client.appendChild(document.createTextNode((o.name || '') + ' · '));
    const phone = el('a', '', o.phone || '');
    phone.href = 'tel:' + String(o.phone || '').replace(/[^\d+]/g, '');
    client.appendChild(phone);
    card.appendChild(client);

    if (o.address) card.appendChild(el('p', 'order-address', o.address));
    if (o.comment) card.appendChild(el('p', 'order-comment', 'Комментарий: ' + o.comment));

    const list = el('ul', 'order-items');
    (o.items || []).forEach(function (item) {
        let title = item.name;
        if (item.size) title += ', ' + item.size;
        if (item.syrups && item.syrups.length) title += ', сироп: ' + item.syrups.join(', ');
        title += ' × ' + item.qty;

        const li = el('li');
        li.appendChild(el('span', '', title));
        li.appendChild(el('span', '', formatPrice(item.sum)));
        list.appendChild(li);
    });
    card.appendChild(list);

    let totalText = 'Итого: ' + formatPrice(o.total);
    if (o.deliveryFee) totalText += ' (с доставкой ' + formatPrice(o.deliveryFee) + ')';
    card.appendChild(el('p', 'order-total', totalText));

    const statuses = el('div', 'statuses');
    STATUSES.forEach(function (s) {
        const btn = el('button', 'status-btn' + (o.status === s[0] ? ' active' : ''), s[1]);
        btn.addEventListener('click', function () {
            updateDoc(doc(db, 'orders', id), { status: s[0] });
        });
        statuses.appendChild(btn);
    });
    card.appendChild(statuses);

    return card;
}

// короткий сигнал при новом заказе
function beep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.frequency.value = 880;
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(function () {
            osc.stop();
            ctx.close();
        }, 300);
    } catch (e) {}
}

// ---------- Стоп-лист ----------

// ---------- Стоп-лист ----------

function menuToStructure(menu) {
    return menu.groups.map(function (group) {
        return {
            title: group.title,
            blocks: group.tabs.map(function (tab) {
                return {
                    title: tab.title,
                    names: tab.items.map(function (item) { return item.name; })
                };
            })
        };
    });
}

function startStoplist() {
    stopMsg.textContent = '';

    const offMenu = onSnapshot(MENU_REF, function (snap) {
        const menu = snap.exists() ? snap.data().menu : null;
        menuStructure = menu ? menuToStructure(menu) : [];
        renderStoplist();
    }, function () {
        stopMsg.textContent = 'Нет доступа к меню. Проверьте правила в Firebase.';
    });

    const offStop = onSnapshot(STOP_REF, function (snap) {
        stopNames = snap.exists() ? (snap.data().items || []) : [];
        renderStoplist();
    }, function () {
        stopMsg.textContent = 'Нет доступа к стоп-листу. Проверьте правила в Firebase.';
    });

    unsubscribeStop = function () {
        offMenu();
        offStop();
    };
}

function renderStoplist() {
    stopEl.innerHTML = '';

    if (!menuStructure || menuStructure.length === 0) {
        stopEl.appendChild(el('p', 'hint', 'Меню пока не загружено. Перенесите его на вкладке «Меню».'));
        return;
    }

    menuStructure.forEach(function (section) {
        const wrap = el('div', 'stop-section');
        wrap.appendChild(el('h2', '', section.title));

        section.blocks.forEach(function (block) {
            wrap.appendChild(el('h3', '', block.title));

            const items = el('div', 'stop-items');

            block.names.forEach(function (name) {
                const off = stopNames.indexOf(name) !== -1;

                const btn = el('button', 'stop-item' + (off ? ' off' : ''));
                btn.appendChild(el('span', 'name', name));
                btn.appendChild(el('span', 'state', off ? 'Закончилось' : 'В наличии'));

                btn.addEventListener('click', function () {
                    setDoc(STOP_REF, {
                        items: off ? arrayRemove(name) : arrayUnion(name)
                    }, { merge: true });
                });

                items.appendChild(btn);
            });

            wrap.appendChild(items);
        });

        stopEl.appendChild(wrap);
    });
}