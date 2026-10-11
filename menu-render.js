import { loadMenu } from './menu-store.js';

const root = document.getElementById('menu-root');

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function formatPrice(n) {
    return Number(n).toLocaleString('ru-RU') + ' ₸';
}

function renderMenu(menu) {
    root.innerHTML = '';

    // главные вкладки
    const mainTabs = el('nav', 'main-tabs');
    menu.groups.forEach(function (g, gi) {
        const btn = el('button', 'main-tab' + (gi === 0 ? ' active' : ''), g.title);
        btn.dataset.group = g.id;
        mainTabs.appendChild(btn);
    });
    root.appendChild(mainTabs);

    // группы с подвкладками и списками блюд
    menu.groups.forEach(function (g, gi) {
        const group = el('div', 'group' + (gi === 0 ? ' active' : ''));
        group.id = g.id;

        const subTabs = el('div', 'sub-tabs');
        g.tabs.forEach(function (t, ti) {
            const btn = el('button', 'sub-tab' + (ti === 0 ? ' active' : ''), t.title);
            btn.dataset.target = t.id;
            subTabs.appendChild(btn);
        });
        group.appendChild(subTabs);

        g.tabs.forEach(function (t, ti) {
            const multi = t.labels && t.labels.length > 0;
            const ul = el('ul', 'panel' + (multi ? ' multi' : '') + (ti === 0 ? ' active' : ''));
            ul.id = t.id;

            if (multi) {
                const head = el('li', 'head');
                head.appendChild(el('span'));
                t.labels.forEach(function (label) {
                    head.appendChild(el('span', '', label));
                });
                ul.appendChild(head);
            }

            t.items.forEach(function (item) {
                const li = el('li');

                if (multi) {
                    li.appendChild(el('span', 'name', item.name));
                    t.labels.forEach(function (label, i) {
                        const p = item.prices[i];
                        li.appendChild(el('span', 'price', (p === null || p === undefined) ? '-' : formatPrice(p)));
                    });
                } else {
                    const box = el('div', 'item');
                    box.appendChild(el('span', 'name', item.name));
                    if (item.desc) box.appendChild(el('p', 'desc', item.desc));
                    li.appendChild(box);
                    li.appendChild(el('span', 'price', formatPrice(item.prices[0])));
                }

                ul.appendChild(li);
            });

            group.appendChild(ul);
        });

        root.appendChild(group);
    });
}

loadMenu().then(function (menu) {
    if (!menu || !menu.groups || menu.groups.length === 0) {
        root.innerHTML = '';
        root.appendChild(el('p', 'menu-loading', 'Меню скоро появится.'));
        return;
    }

    renderMenu(menu);
    window.initMenu();
    document.dispatchEvent(new Event('menu-rendered'));
}).catch(function () {
    root.innerHTML = '';
    root.appendChild(el('p', 'menu-loading', 'Не удалось загрузить меню. Проверьте интернет и обновите страницу.'));
});