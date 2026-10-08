const CART_KEY = 'ithaca_cart';
const list = document.getElementById('cart-list');
const emptyMsg = document.getElementById('cart-empty');
const totalEl = document.getElementById('total');
const checkoutBtn = document.getElementById('checkout');

let cart = loadCart();

function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {}
}

function formatPrice(n) {
    return n.toLocaleString('ru-RU') + ' ₸';
}

function itemSum(item) {
    return item.sizes[item.size].price * item.qty;
}

// ключ позиции: название + размер + сиропы
function itemKey(item) {
    return item.id + '|' + item.size + '|' + (item.syrups || []).slice().sort().join(',');
}

function updateTotal() {
    const total = cart.reduce(function (sum, item) {
        return sum + itemSum(item);
    }, 0);

    totalEl.textContent = formatPrice(total);
    emptyMsg.classList.toggle('show', cart.length === 0);
    checkoutBtn.classList.toggle('hidden', cart.length === 0);
}

function renderList() {
    list.innerHTML = '';
    cart.forEach(function (item) {
        list.appendChild(createRow(item));
    });
    updateTotal();
}

function createRow(item) {
    const li = document.createElement('li');
    li.className = 'cart-item';

    // название и выбранные параметры
    const info = document.createElement('div');
    info.className = 'ci-info';

    const name = document.createElement('span');
    name.className = 'ci-name';
    name.textContent = item.name;
    info.appendChild(name);

    if (item.syrups && item.syrups.length) {
        const syrup = document.createElement('span');
        syrup.className = 'ci-note';
        syrup.textContent = 'Сироп: ' + item.syrups.join(', ');
        info.appendChild(syrup);
    }

    if (item.sizes.length === 1 && item.sizes[0].label) {
        const sizeNote = document.createElement('span');
        sizeNote.className = 'ci-note';
        sizeNote.textContent = 'Размер: ' + item.sizes[0].label;
        info.appendChild(sizeNote);
    }

    const sumEl = document.createElement('span');
    sumEl.className = 'ci-sum';
    sumEl.textContent = formatPrice(itemSum(item));

    // выбор объёма, если их несколько
    if (item.sizes.length > 1) {
        const select = document.createElement('select');
        select.className = 'ci-size';

        item.sizes.forEach(function (s, i) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = s.label + ' · ' + formatPrice(s.price);
            if (i === item.size) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', function () {
            item.size = Number(select.value);

            // если после смены размера такой заказ уже есть, объединяем
            const key = itemKey(item);
            const twin = cart.find(function (i) {
                return i !== item && itemKey(i) === key;
            });

            if (twin) {
                twin.qty = Math.min(99, twin.qty + item.qty);
                cart = cart.filter(function (i) { return i !== item; });
                saveCart();
                renderList();
                return;
            }

            saveCart();
            sumEl.textContent = formatPrice(itemSum(item));
            updateTotal();
        });

        info.appendChild(select);
    }

    // количество: стрелки и поле для ввода
    const qty = document.createElement('div');
    qty.className = 'qty';

    const minus = document.createElement('button');
    minus.className = 'qty-btn';
    minus.textContent = '‹';
    minus.setAttribute('aria-label', 'Меньше');

    const input = document.createElement('input');
    input.className = 'qty-input';
    input.type = 'text';
    input.inputMode = 'numeric';
    input.value = item.qty;

    const plus = document.createElement('button');
    plus.className = 'qty-btn';
    plus.textContent = '›';
    plus.setAttribute('aria-label', 'Больше');

    function setQty(n) {
        item.qty = Math.min(99, Math.max(1, n));
        saveCart();
        sumEl.textContent = formatPrice(itemSum(item));
        updateTotal();
    }

    minus.addEventListener('click', function () {
        setQty(item.qty - 1);
        input.value = item.qty;
    });

    plus.addEventListener('click', function () {
        setQty(item.qty + 1);
        input.value = item.qty;
    });

    input.addEventListener('input', function () {
        input.value = input.value.replace(/\D/g, '').slice(0, 2);
        if (input.value !== '') {
            setQty(parseInt(input.value, 10));
        }
    });

    input.addEventListener('blur', function () {
        input.value = item.qty;
    });

    qty.appendChild(minus);
    qty.appendChild(input);
    qty.appendChild(plus);

    // удаление строки
    const remove = document.createElement('button');
    remove.className = 'ci-remove';
    remove.innerHTML = '&times;';
    remove.setAttribute('aria-label', 'Убрать');

    remove.addEventListener('click', function () {
        cart = cart.filter(function (i) { return i !== item; });
        saveCart();
        li.remove();
        updateTotal();
    });

    li.appendChild(info);
    li.appendChild(qty);
    li.appendChild(sumEl);
    li.appendChild(remove);

    return li;
}

renderList();

// ---------- Оформление заказа ----------

const GOOGLE_MAPS_KEY = 'ВАШ_КЛЮЧ_GOOGLE_MAPS';   // сюда вставьте ключ
const DELIVERY_PRICE = 800;
const WHATSAPP_NUMBER = '77785762514';   // номер кофейни: только цифры, с кодом страны, без + и пробелов                        // стоимость доставки, ₸
const ALMATY_CENTER = { lat: 43.238949, lng: 76.889709 };
const ALMATY_BOUNDS = { south: 43.15, west: 76.72, north: 43.42, east: 77.12 };

const modal = document.getElementById('modal');
const modalTotal = document.getElementById('modal-total');
const formMsg = document.getElementById('form-msg');
const payBtn = document.getElementById('pay-btn');

const deliveryBlock = document.getElementById('delivery-block');
const pickupBlock = document.getElementById('pickup-block');
const moreBlock = document.getElementById('more-fields');
const noticeEl = document.getElementById('delivery-notice');

const streetInput = document.getElementById('f-street');
const houseInput = document.getElementById('f-house');
const entranceInput = document.getElementById('f-entrance');
const flatInput = document.getElementById('f-flat');
const nameInput = document.getElementById('f-name');
const phoneInput = document.getElementById('f-phone');
const commentInput = document.getElementById('f-comment');
const suggestEl = document.getElementById('suggest');

const mapModal = document.getElementById('map-modal');
const mapAddressEl = document.getElementById('map-address');
const mapConfirm = document.getElementById('map-confirm');
const geoBtn = document.getElementById('geo-btn');

function orderTotal() {
    return cart.reduce(function (sum, item) {
        return sum + itemSum(item);
    }, 0);
}

function currentMode() {
    const checked = document.querySelector('input[name="mode"]:checked');
    return checked ? checked.value : null;
}

function addressReady() {
    return streetInput.value.trim() !== '' && houseInput.value.trim() !== '';
}

// пересчитывает всё окно: блоки, доставку и сумму
function refreshCheckout() {
    const mode = currentMode();

    deliveryBlock.classList.toggle('show', mode === 'delivery');
    pickupBlock.classList.toggle('show', mode === 'pickup');

    const ready = mode === 'delivery' && addressReady();
    moreBlock.classList.toggle('show', ready);

    const fee = ready ? DELIVERY_PRICE : 0;
    const total = orderTotal() + fee;

    modalTotal.textContent = formatPrice(total);

    if (ready) {
        noticeEl.innerHTML =
            'Стоимость доставки: <b>' + formatPrice(DELIVERY_PRICE) + '</b>.<br>' +
            'Сумма заказа с доставкой: <b>' + formatPrice(total) + '</b>';
    }

    formMsg.textContent = '';
}

document.querySelectorAll('input[name="mode"]').forEach(function (radio) {
    radio.addEventListener('change', refreshCheckout);
});

houseInput.addEventListener('input', refreshCheckout);

function setAddress(street, house) {
    streetInput.value = street || '';
    houseInput.value = house || '';
    refreshCheckout();
}

// ---------- Загрузка Google Maps ----------

let mapsPromise = null;

function loadGoogleMaps() {
    if (!mapsPromise) {
        mapsPromise = new Promise(function (resolve, reject) {
            if (!GOOGLE_MAPS_KEY || GOOGLE_MAPS_KEY === 'ВАШ_КЛЮЧ_GOOGLE_MAPS') {
                reject(new Error('no-key'));
                return;
            }

            window.__gmapsReady = resolve;

            const script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_MAPS_KEY +
                '&loading=async&language=ru&region=KZ&v=weekly&callback=__gmapsReady';
            script.async = true;
            script.onerror = function () { reject(new Error('load-failed')); };
            document.head.appendChild(script);
        });
    }
    return mapsPromise;
}

window.gm_authFailure = function () {
    mapAddressEl.textContent = 'Google не принял ключ. Проверьте ключ и включённые API.';
};

// разбор адреса: работает и с новым Places API, и с Geocoder
function parseComponents(components) {
    const result = { street: '', house: '', inAlmaty: false };

    components.forEach(function (c) {
        const types = c.types || [];
        const name = c.longText || c.long_name || '';

        if (types.indexOf('route') !== -1) result.street = name;
        if (types.indexOf('street_number') !== -1) result.house = name;
        if (/алмат|almaty/i.test(name)) result.inAlmaty = true;
    });

    return result;
}

// ---------- Подсказки адреса под полем ----------

let suggestTimer = null;
let sessionToken = null;

function hideSuggestions() {
    suggestEl.innerHTML = '';
    suggestEl.classList.remove('show');
}

function showSuggestHint(text) {
    suggestEl.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'hint';
    li.textContent = text;
    suggestEl.appendChild(li);
    suggestEl.classList.add('show');
}

streetInput.addEventListener('input', function () {
    refreshCheckout();
    clearTimeout(suggestTimer);

    const text = streetInput.value.trim();

    if (text.length < 2) {
        hideSuggestions();
        return;
    }

    suggestTimer = setTimeout(function () {
        fetchSuggestions(text);
    }, 300);
});

async function fetchSuggestions(text) {
    try {
        await loadGoogleMaps();

        const places = await google.maps.importLibrary('places');
        if (!sessionToken) sessionToken = new places.AutocompleteSessionToken();

        const response = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: text,
            sessionToken: sessionToken,
            locationRestriction: ALMATY_BOUNDS,
            language: 'ru',
            region: 'kz'
        });

        // пока ждали ответ, текст мог измениться
        if (streetInput.value.trim() !== text) return;

        renderSuggestions(response.suggestions || []);
    } catch (e) {
        showSuggestHint('Подсказки недоступны (нужен ключ Google Maps). Адрес можно ввести вручную.');
    }
}

function renderSuggestions(list) {
    suggestEl.innerHTML = '';

    list.forEach(function (s) {
        const prediction = s.placePrediction;
        if (!prediction) return;

        const li = document.createElement('li');
        li.textContent = 'г. Алматы, ' + prediction.mainText.text;
        li.addEventListener('click', function () {
            pickSuggestion(prediction);
        });
        suggestEl.appendChild(li);
    });

    suggestEl.classList.toggle('show', suggestEl.children.length > 0);
}

async function pickSuggestion(prediction) {
    hideSuggestions();

    try {
        const place = prediction.toPlace();
        await place.fetchFields({ fields: ['addressComponents'] });

        const parts = parseComponents(place.addressComponents || []);
        setAddress(parts.street || prediction.mainText.text, parts.house);
    } catch (e) {
        setAddress(prediction.mainText.text, '');
    }

    sessionToken = null;
}

// ---------- Карта: выбор здания ----------

let map = null;
let geocoder = null;
let marker = null;
let MarkerClass = null;
let picked = null;

function openMap() {
    mapModal.classList.add('open');
    mapConfirm.disabled = true;
    picked = null;
    mapAddressEl.textContent = 'Загрузка карты...';

    initMap();
}

async function initMap() {
    try {
        await loadGoogleMaps();

        const mapsLib = await google.maps.importLibrary('maps');
        const markerLib = await google.maps.importLibrary('marker');
        const geoLib = await google.maps.importLibrary('geocoding');

        MarkerClass = markerLib.AdvancedMarkerElement;

        if (!map) {
            map = new mapsLib.Map(document.getElementById('map'), {
                center: ALMATY_CENTER,
                zoom: 13,
                mapId: 'DEMO_MAP_ID',
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false
            });

            geocoder = new geoLib.Geocoder();

            // клик по карте или по значку здания
            map.addListener('click', function (e) {
                if (e.placeId) e.stop();
                pickOnMap(e.placeId ? { placeId: e.placeId } : { location: e.latLng });
            });
        }

        mapAddressEl.textContent = 'Нажмите на здание на карте';
    } catch (e) {
        mapAddressEl.textContent = e.message === 'no-key'
            ? 'Чтобы работала карта, вставьте ключ Google Maps в cart.js (GOOGLE_MAPS_KEY).'
            : 'Не удалось загрузить карту. Проверьте интернет и ключ.';
    }
}

function showMarker(position) {
    if (!marker) {
        marker = new MarkerClass({ map: map, position: position });
    } else {
        marker.position = position;
        marker.map = map;
    }
}

async function pickOnMap(request) {
    mapConfirm.disabled = true;
    picked = null;
    mapAddressEl.textContent = 'Определяем адрес...';

    try {
        const response = await geocoder.geocode(request);
        const results = response.results || [];

        if (!results.length) {
            mapAddressEl.textContent = 'Адрес не найден. Попробуйте другое место.';
            return;
        }

        const result = results.find(function (r) {
            return r.types.indexOf('street_address') !== -1 || r.types.indexOf('premise') !== -1;
        }) || results[0];

        showMarker(result.geometry.location);

        const parts = parseComponents(result.address_components);

        if (!parts.inAlmaty) {
            mapAddressEl.textContent = 'Доставка только по г. Алматы. Выберите здание в городе.';
            return;
        }

        if (!parts.street || !parts.house) {
            mapAddressEl.textContent = 'Не удалось определить номер дома. Нажмите прямо на здание.';
            return;
        }

        picked = parts;
        mapAddressEl.textContent = 'г. Алматы, ' + parts.street + ', ' + parts.house;
        mapConfirm.disabled = false;
    } catch (e) {
        mapAddressEl.textContent = 'Не удалось определить адрес. Попробуйте ещё раз.';
    }
}

// «поделиться геоданными»
geoBtn.addEventListener('click', function () {
    if (!map) return;

    if (!navigator.geolocation) {
        mapAddressEl.textContent = 'Браузер не поддерживает определение местоположения.';
        return;
    }

    mapAddressEl.textContent = 'Определяем ваше местоположение...';

    navigator.geolocation.getCurrentPosition(function (pos) {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.setCenter(point);
        map.setZoom(18);
        pickOnMap({ location: point });
    }, function () {
        mapAddressEl.textContent = 'Нет доступа к местоположению. Разрешите его в браузере или выберите здание вручную.';
    }, { enableHighAccuracy: true, timeout: 10000 });
});

function closeMap() {
    mapModal.classList.remove('open');
}

mapConfirm.addEventListener('click', function () {
    if (!picked) return;

    setAddress(picked.street, picked.house);
    closeMap();
    entranceInput.focus();
});

document.getElementById('map-open').addEventListener('click', openMap);
document.getElementById('map-close').addEventListener('click', closeMap);

mapModal.addEventListener('click', function (e) {
    if (e.target === mapModal) closeMap();
});

// ---------- Открытие, закрытие и оплата ----------

function closeModal() {
    modal.classList.remove('open');
}

checkoutBtn.addEventListener('click', function () {
    refreshCheckout();
    modal.classList.add('open');
});

document.getElementById('modal-x').addEventListener('click', closeModal);

modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    if (mapModal.classList.contains('open')) {
        closeMap();
    } else {
        closeModal();
    }
});

// собираем текст сообщения для WhatsApp
function buildOrderText(mode) {
    const lines = ['Новый заказ Ithaca', ''];

    cart.forEach(function (item, i) {
        const size = item.sizes[item.size];
        let line = (i + 1) + '. ' + item.name;

        if (size && size.label) line += ', ' + size.label;
        if (item.syrups && item.syrups.length) line += ', сироп: ' + item.syrups.join(', ');

        line += ' × ' + item.qty + ' = ' + formatPrice(itemSum(item));
        lines.push(line);
    });

    lines.push('');

    let fee = 0;

    if (mode === 'delivery') {
        fee = DELIVERY_PRICE;

        let address = 'г. Алматы, ' + streetInput.value.trim() + ', дом ' + houseInput.value.trim();
        if (entranceInput.value.trim()) address += ', подъезд ' + entranceInput.value.trim();
        if (flatInput.value.trim()) address += ', кв. ' + flatInput.value.trim();

        lines.push('Получение: доставка');
        lines.push('Адрес: ' + address);
        lines.push('Доставка: ' + formatPrice(fee));
    } else {
        lines.push('Получение: самовывоз');
    }

    lines.push('Итого: ' + formatPrice(orderTotal() + fee));
    lines.push('');
    lines.push('Имя: ' + nameInput.value.trim());
    lines.push('Телефон: ' + phoneInput.value.trim());

    if (commentInput.value.trim()) {
        lines.push('Комментарий: ' + commentInput.value.trim());
    }

    return lines.join('\n');
}

payBtn.addEventListener('click', function () {
    const mode = currentMode();

    if (!mode) {
        formMsg.textContent = 'Выберите способ получения: доставка или самовывоз.';
        return;
    }

    if (mode === 'delivery' && !addressReady()) {
        formMsg.textContent = 'Укажите улицу и дом для доставки.';
        return;
    }

    if (nameInput.value.trim() === '') {
        formMsg.textContent = 'Укажите ваше имя.';
        nameInput.focus();
        return;
    }

    if (phoneInput.value.replace(/\D/g, '').length < 10) {
        formMsg.textContent = 'Укажите телефон, чтобы мы могли связаться.';
        phoneInput.focus();
        return;
    }

    const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildOrderText(mode));
    window.open(url, '_blank');

    // очищаем корзину и показываем экран «Почти готово»
    cart = [];
    saveCart();
    renderList();
    modal.querySelector('.modal-box').classList.add('sent');
});