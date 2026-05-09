var currentEngine;

function switchEngine() {
    if (currentEngine === 'imdb') {
        currentEngine = 'tmdb';
    } else {
        currentEngine = 'imdb';
    }

    setCookie('currentEngine', currentEngine, 30);
    location.reload();
}

document.addEventListener("DOMContentLoaded", function() {
    const switchButton = document.getElementById('switchEngineButton');
    currentEngine = getCookie('currentEngine') || 'imdb';
    if (!getCookie('currentEngine')) {
        setCookie('currentEngine', 'imdb', 30);
    }
    if (currentEngine === 'imdb') {
        switchButton.textContent = 'Switch to TMDB';
    } else {
        switchButton.textContent = 'Switch to IMDB';
    }
});
