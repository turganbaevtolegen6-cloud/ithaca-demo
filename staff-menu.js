import { auth, db, priceKey } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { MENU_REF } from './menu-store.js';

const msgEl = document.getElementById('menu-msg');
const importBox = document.getElementById('menu-import');
const editorBox = document.getElementById('menu-editor');
const listEl = document.getElementById('menu-list');
const saveBtn = document.getElementById('menu-save');
const statusEl = document.getElementById('menu-status');

let menu = null;
let started = false;

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function digits(text) {
    const n = parseInt(String(text).replace(/\D/g, ''), 10);
    return isNaN(n) ? null : n;
}

// ---------- Перенос меню из menu.html в базу ----------

async function importFromHtml() {
    const response = await fetch('menu-backup.html');
    const html = await response.text();
    const page = new DOMParser().parseFromString(html, 'text/html');

    // цены, которые вы уже меняли раньше, сохраняем
    let overrides = {};
    try {
        const p = await getDoc(doc(db, 'settings', 'prices'));
        if (p.exists()) overrides = p.data().prices || {};
    } catch (e) {}

    const groups = [];

    page.querySelectorAll('.group').forEach(function (groupEl) {
        const mainTab = page.querySelector('.main-tab[data-group="' + groupEl.id + '"]');
        const group = {
            id: groupEl.id,
            title: mainTab ? mainTab.textContent.trim() : groupEl.id,
            tabs: []
        };

        groupEl.querySelectorAll('.panel').forEach(function (panelEl) {
            const subTab = page.querySelector('.sub-tab[data-target="' + panelEl.id + '"]');
            const labels = [];

            panelEl.querySelectorAll('li.head span:not(:first-child)').forEach(function (s) {
                labels.push(s.textContent.trim());
            });

            const tab = {
                id: panelEl.id,
                title: subTab ? subTab.textContent.trim() : panelEl.id,
                labels: labels,
                items: []
            };

            panelEl.querySelectorAll('li:not(.head)').forEach(function (li) {
                const nameEl = li.querySelector('.name');
                if (!nameEl) return;

                const name = nameEl.textContent.trim();
                const descEl = li.querySelector('.desc');
                const custom = overrides[priceKey(name)];
                const prices = [];

                li.querySelectorAll('.price').forEach(function (p, i) {
                    let value = digits(p.textContent);
                    if (value !== null && custom && custom[i] !== null && custom[i] !== undefined) {
                        value = custom[i];
                    }
                    prices.push(value);
                });

                tab.items.push({
                    name: name,
                    desc: descEl ? descEl.textContent.trim() : '',
                    prices: prices
                });
            });

            group.tabs.push(tab);
        });

        groups.push(group);
    });

    return { groups: groups };
}

document.getElementById('menu-import-btn').addEventListener('click', async function () {
    msgEl.textContent = 'Загружаем меню...';

    try {
        const imported = await importFromHtml();

        if (!imported.groups.length) {
            msgEl.textContent = 'В menu.html не найдено блюд. Перенос нужно делать, пока в этом файле ещё лежит старое меню.';
            return;
        }

        await setDoc(MENU_REF, { menu: imported });
        menu = imported;
        msgEl.textContent = 'Готово: меню перенесено в базу.';
        show();
    } catch (e) {
        msgEl.textContent = 'Не удалось перенести меню: ' + e.message;
    }
});

// ---------- Редактор ----------

function show() {
    importBox.classList.toggle('hidden', !!menu);
    editorBox.classList.toggle('hidden', !menu);
    if (menu) renderEditor();
}

function markDirty() {
    statusEl.classList.remove('ok');
    statusEl.textContent = 'Есть несохранённые изменения';
}

function textInput(value, placeholder, onInput) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = placeholder;
    input.addEventListener('input', function () {
        onInput(input.value);
        markDirty();
    });
    return input;
}

function itemCard(tab, index) {
    const item = tab.items[index];
    const multi = tab.labels && tab.labels.length > 0;
    const count = multi ? tab.labels.length : 1;

    while (item.prices.length < count) item.prices.push(null);

    const card = el('div', 'edit-item');

    const top = el('div', 'edit-top');
    top.appendChild(textInput(item.name, 'Название блюда', function (v) { item.name = v; }));

    const del = el('button', 'edit-del', '×');
    del.title = 'Удалить блюдо';
    del.addEventListener('click', function () {
        if (confirm('Удалить «' + item.name + '»?')) {
            tab.items.splice(index, 1);
            markDirty();
            renderEditor();
        }
    });
    top.appendChild(del);
    card.appendChild(top);

    // описание есть у блюд с одной ценой (у напитков с объёмами его нет)
    if (!multi) {
        const desc = document.createElement('textarea');
        desc.rows = 2;
        desc.placeholder = 'Описание (необязательно)';
        desc.value = item.desc || '';
        desc.addEventListener('input', function () {
            item.desc = desc.value;
            markDirty();
        });
        card.appendChild(desc);
    }

    const prices = el('div', 'edit-prices');

    for (let i = 0; i < count; i++) {
        const box = el('label', 'price-box');
        if (multi) box.appendChild(el('small', '', tab.labels[i]));

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '50';
        input.inputMode = 'numeric';
        input.placeholder = multi ? '—' : 'Цена';
        input.value = item.prices[i] !== null && item.prices[i] !== undefined ? item.prices[i] : '';

        input.addEventListener('input', function () {
            const value = parseInt(input.value, 10);
            item.prices[i] = (isNaN(value) || value < 0) ? null : value;
            markDirty();
        });

        box.appendChild(input);
        prices.appendChild(box);
    }

    card.appendChild(prices);
    return card;
}

function renderEditor() {
    listEl.innerHTML = '';

    menu.groups.forEach(function (group) {
        const wrap = el('div', 'stop-section');
        wrap.appendChild(el('h2', '', group.title));

        group.tabs.forEach(function (tab) {
            const multi = tab.labels && tab.labels.length > 0;

            wrap.appendChild(el('h3', '', tab.title));

            tab.items.forEach(function (item, index) {
                wrap.appendChild(itemCard(tab, index));
            });

            const add = el('button', 'add-dish', '+ Добавить блюдо');
            add.addEventListener('click', function () {
                tab.items.push({
                    name: 'Новое блюдо',
                    desc: '',
                    prices: multi ? tab.labels.map(function () { return null; }) : [null]
                });
                markDirty();
                renderEditor();
            });
            wrap.appendChild(add);
        });

        listEl.appendChild(wrap);
    });
}

// ---------- Проверка и сохранение ----------

function validate() {
    const seen = {};

    for (const group of menu.groups) {
        for (const tab of group.tabs) {
            const multi = tab.labels && tab.labels.length > 0;

            for (const item of tab.items) {
                item.name = item.name.trim();
                item.desc = (item.desc || '').trim();

                if (!item.name) return 'У одного из блюд («' + tab.title + '») нет названия.';
                if (seen[item.name]) return 'Название «' + item.name + '» повторяется. Названия должны быть разными.';
                seen[item.name] = true;

                const filled = item.prices.filter(function (p) { return p !== null && p !== undefined; });
                if (multi && filled.length === 0) return 'Укажите хотя бы одну цену для «' + item.name + '».';
                if (!multi && filled.length === 0) return 'Укажите цену для «' + item.name + '».';
            }
        }
    }

    return '';
}

saveBtn.addEventListener('click', function () {
    const error = validate();

    if (error) {
        statusEl.classList.remove('ok');
        statusEl.textContent = error;
        return;
    }

    statusEl.classList.remove('ok');
    statusEl.textContent = 'Сохраняем...';

    setDoc(MENU_REF, { menu: menu }).then(function () {
        statusEl.classList.add('ok');
        statusEl.textContent = 'Меню сохранено. Клиенты увидят изменения при обновлении страницы.';
        renderEditor();
    }).catch(function () {
        statusEl.textContent = 'Не удалось сохранить. Проверьте правила в Firebase.';
    });
});

// ---------- Запуск после входа ----------

async function start() {
    if (started) return;
    started = true;
    msgEl.textContent = '';

    try {
        const snap = await getDoc(MENU_REF);
        menu = snap.exists() ? snap.data().menu : null;
    } catch (e) {
        msgEl.textContent = 'Нет доступа к меню. Проверьте правила в Firebase.';
        started = false;
        return;
    }

    show();
}

onAuthStateChanged(auth, function (user) {
    if (user) {
        start();
    } else {
        started = false;
        menu = null;
    }
});