function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function saveRecent(id, title, poster, year, type, engine) {
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem('recentlyWatched') || '[]'); } catch (e) {}
    recent = recent.filter(item => item.id !== id);
    recent.unshift({ id, title, poster, year, type, engine });
    if (recent.length > 8) recent = recent.slice(0, 8);
    try { localStorage.setItem('recentlyWatched', JSON.stringify(recent)); } catch (e) {}
}

function renderRecent() {
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem('recentlyWatched') || '[]'); } catch (e) {}
    const section = document.getElementById('recentSection');
    if (!section || recent.length === 0) return;

    const label = document.createElement('p');
    label.id = 'recentLabel';
    label.textContent = 'Recently watched';

    const row = document.createElement('div');
    row.id = 'recentRow';

    recent.forEach(item => {
        const card = document.createElement('div');
        card.className = 'preview recent-card';
        card.onclick = function () {
            const searchInput = document.getElementById('searchInput');
            searchInput.value = item.title;
            searchInput.dispatchEvent(new Event('input'));
        };

        const img = document.createElement('img');
        img.src = item.poster || 'assets/image/unavailed.png';
        img.alt = item.title;

        const h3 = document.createElement('h3');
        h3.textContent = item.title;

        const meta = document.createElement('p');
        meta.textContent = [item.year, item.type === 'movie' ? 'Movie' : 'TV Series'].filter(Boolean).join(' · ');
        meta.className = 'recent-meta';

        card.appendChild(img);
        card.appendChild(h3);
        card.appendChild(meta);
        row.appendChild(card);
    });

    section.appendChild(label);
    section.appendChild(row);
}
