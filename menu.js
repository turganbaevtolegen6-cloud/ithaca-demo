const mainTabs = document.querySelectorAll('.main-tab');
const groups = document.querySelectorAll('.group');

// главные вкладки: Напитки / Снэки / Кухня
mainTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
        mainTabs.forEach(function (t) { t.classList.remove('active'); });
        groups.forEach(function (g) { g.classList.remove('active'); });

        tab.classList.add('active');
        document.getElementById(tab.dataset.group).classList.add('active');
    });
});

// подвкладки внутри каждой группы
groups.forEach(function (group) {
    const subTabs = group.querySelectorAll('.sub-tab');
    const panels = group.querySelectorAll('.panel');

    subTabs.forEach(function (subTab) {
        subTab.addEventListener('click', function () {
            subTabs.forEach(function (s) { s.classList.remove('active'); });
            panels.forEach(function (p) { p.classList.remove('active'); });

            subTab.classList.add('active');
            document.getElementById(subTab.dataset.target).classList.add('active');
        });
    });
});
// ---------- Корзина ----------

const CART_KEY = 'ithaca_cart';
const SYRUPS = ['Ванильный', 'Карамельный', 'Ореховый', 'Кокосовый', 'Шоколадный'];

const cartButton = document.querySelector('.cart');
const cartCount = document.getElementById('cart-count');

const optModal = document.getElementById('opt-modal');
const optTitle = document.getElementById('opt-title');
const optSizeBlock = document.getElementById('opt-size-block');
const optSizes = document.getElementById('opt-sizes');
const optSyrupBlock = document.getElementById('opt-syrup-block');
const optSyrups = document.getElementById('opt-syrups');
const optConfirm = document.getElementById('opt-confirm');

let pendingItem = null;

const cartIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="9" cy="21" r="1"></circle>' +
    '<circle cx="20" cy="21" r="1"></circle>' +
    '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>' +
    '</svg>';

function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {}
}

function parsePrice(text) {
    return parseInt(text.replace(/\D/g, ''), 10);
}

// ключ позиции: название + размер + сиропы (одинаковый ключ = одинаковый заказ)
function itemKey(item) {
    return item.id + '|' + item.size + '|' + (item.syrups || []).slice().sort().join(',');
}

// собираем данные о блюде из строки меню: название, объёмы и цены
function getItemData(li) {
    const name = li.querySelector('.name').textContent.trim();
    const labels = li.parentElement.querySelectorAll('li.head span:not(:first-child)');
    const sizes = [];

    li.querySelectorAll('.price').forEach(function (p, i) {
        const value = parsePrice(p.textContent);
        if (!isNaN(value)) {
            sizes.push({
                label: labels[i] ? labels[i].textContent.trim() : '',
                price: value
            });
        }
    });

    return { id: name, name: name, sizes: sizes, size: 0, qty: 1, syrups: [] };
}

function updateCount() {
    const n = loadCart().reduce(function (sum, item) {
        return sum + (item.qty || 1);
    }, 0);

    cartCount.textContent = n;
    cartCount.classList.toggle('show', n > 0);
}

// прячем значки у блюд, которые уже в корзине, и обновляем число
function syncCart() {
    const ids = loadCart().map(function (item) { return item.id; });

    document.querySelectorAll('.add-btn').forEach(function (btn) {
        const inCart = ids.indexOf(btn.dataset.id) !== -1;
        btn.classList.toggle('added', inCart && !btn.dataset.repeat);
    });

    updateCount();
}

function addToCart(data) {
    const cart = loadCart();
    const key = itemKey(data);

    const existing = cart.find(function (item) {
        return itemKey(item) === key;
    });

    if (existing) {
        existing.qty = Math.min(99, (existing.qty || 1) + 1);
    } else {
        cart.push(data);
    }

    saveCart(cart);
    syncCart();

    cartButton.classList.remove('bump');
    void cartButton.offsetWidth;
    cartButton.classList.add('bump');
}

// ---------- Окно выбора размера и сиропа ----------

function openOptions(data, withSyrup) {
    pendingItem = JSON.parse(JSON.stringify(data));
    optTitle.textContent = data.name;

    // размеры: можно выбрать только один (radio)
    optSizes.innerHTML = '';
    data.sizes.forEach(function (s, i) {
        const label = document.createElement('label');
        label.className = 'opt';
        label.innerHTML =
            '<input type="radio" name="opt-size" value="' + i + '"' + (i === 0 ? ' checked' : '') + '>' +
            '<span>' + s.label + ' · ' + s.price.toLocaleString('ru-RU') + ' ₸</span>';
        optSizes.appendChild(label);
    });
    optSizeBlock.style.display = data.sizes.length > 1 ? '' : 'none';

    // сиропы: можно выбрать несколько (checkbox), только для кофе
    optSyrups.innerHTML = '';
    if (withSyrup) {
        SYRUPS.forEach(function (name) {
            const label = document.createElement('label');
            label.className = 'opt';
            label.innerHTML =
                '<input type="checkbox" name="opt-syrup" value="' + name + '">' +
                '<span>' + name + '</span>';
            optSyrups.appendChild(label);
        });
    }
    optSyrupBlock.style.display = withSyrup ? '' : 'none';

    optModal.classList.add('open');
}

function closeOptions() {
    optModal.classList.remove('open');
    pendingItem = null;
}

optConfirm.addEventListener('click', function () {
    if (!pendingItem) return;

    const sizeInput = optModal.querySelector('input[name="opt-size"]:checked');
    pendingItem.size = sizeInput ? Number(sizeInput.value) : 0;

    pendingItem.syrups = Array.from(
        optModal.querySelectorAll('input[name="opt-syrup"]:checked')
    ).map(function (input) {
        return input.value;
    });

    addToCart(pendingItem);
    closeOptions();
});

// закрыть без выбора: клик по тёмному фону или Esc
optModal.addEventListener('click', function (e) {
    if (e.target === optModal) closeOptions();
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeOptions();
});

// ---------- Значки корзины в позициях меню ----------

document.querySelectorAll('.panel li:not(.head)').forEach(function (li) {
    const data = getItemData(li);
    const isCoffee = li.parentElement.id === 'coffee';
    const needsOptions = data.sizes.length > 1 || isCoffee;

    const btn = document.createElement('button');
    btn.className = 'add-btn';
    btn.dataset.id = data.id;
    btn.setAttribute('aria-label', 'Добавить в корзину');
    btn.innerHTML = cartIcon;
        if (needsOptions) btn.dataset.repeat = '1';

    btn.addEventListener('click', function () {
        if (needsOptions) {
            openOptions(data, isCoffee);
        } else {
            addToCart(data);
        }
    });

    li.appendChild(btn);
});

syncCart();

// когда возвращаешься со страницы корзины, состояние обновляется
window.addEventListener('pageshow', syncCart);