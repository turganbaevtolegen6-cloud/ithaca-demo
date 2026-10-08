const slides = document.querySelector('.slides');
const menuSection = document.getElementById('menu');
const dots = document.querySelectorAll('.dot');
const total = dots.length;
let current = 0;

function showSlide(index) {
    current = (index + total) % total;
    slides.style.transform = 'translateX(-' + (current * 100) + '%)';
    menuSection.dataset.slide = current;

    dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === current);
    });
}

document.querySelector('.arrow-left').addEventListener('click', function () {
    showSlide(current - 1);
});

document.querySelector('.arrow-right').addEventListener('click', function () {
    showSlide(current + 1);
});

dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
        showSlide(i);
    });
});

// свайп пальцем на телефоне
let startX = 0;
const windowEl = document.querySelector('.slides-window');

windowEl.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
});

windowEl.addEventListener('touchend', function (e) {
    const diff = e.changedTouches[0].clientX - startX;
    if (diff > 50) showSlide(current - 1);
    if (diff < -50) showSlide(current + 1);
});