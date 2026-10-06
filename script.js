let tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
    tg.expand(); // Раскрываем окно на весь экран
}

function trainPlayer() {
    let ovrElem = document.getElementById('player-ovr');
    let currentOvr = parseInt(ovrElem.innerText);
    ovrElem.innerText = currentOvr + 1;
    if (tg) tg.HapticFeedback.impactOccurred('medium'); // Легкая вибрация телефона
}

function playMatch() {
    alert("Матч начался! Победила ваша команда!");
    if (tg) tg.HapticFeedback.notificationOccurred('success');
}