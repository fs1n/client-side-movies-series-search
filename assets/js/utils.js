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

function openEpisodeGuide(mediaId, title, activeSeason) {
    const overlay = document.getElementById('episodeGuideOverlay');
    const modal = document.getElementById('episodeGuideModal');
    const seasonNav = document.getElementById('episodeGuideSeasonNav');
    const grid = document.getElementById('episodeGrid');
    const titleEl = document.getElementById('episodeGuideTitle');
    const infoEl = document.getElementById('episodeGuideInfo');

    titleEl.textContent = title;
    grid.innerHTML = '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    const isTmdb = getCookie('currentEngine') === 'tmdb';
    const pageSize = 20;
    let seasonCount = 1;

    if (isTmdb) {
        const detailUrl = `https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/tv/${mediaId}?language=en-US`;
        fetch(detailUrl)
            .then(r => r.json())
            .then(data => {
                seasonCount = data.number_of_seasons || 1;
                buildSeasonTabs(seasonCount, activeSeason);
                return fetchSeason(mediaId, activeSeason, isTmdb);
            })
            .then(episodes => renderEpisodes(episodes, activeSeason));
    } else {
        seasonCount = 10;
        buildSeasonTabs(seasonCount, activeSeason);
        fetchSeason(mediaId, activeSeason, isTmdb).then(episodes => renderEpisodes(episodes, activeSeason));
    }

    function buildSeasonTabs(count, active) {
        seasonNav.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const btn = document.createElement('button');
            btn.className = 'seasonTab' + (i === active ? ' active' : '');
            btn.textContent = 'S' + i;
            btn.dataset.season = i;
            btn.onclick = function () {
                document.querySelectorAll('.seasonTab').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                const isCurrentTmdb = getCookie('currentEngine') === 'tmdb';
                fetchSeason(mediaId, i, isCurrentTmdb).then(eps => {
                    renderEpisodes(eps, i);
                });
            };
            seasonNav.appendChild(btn);
        }
    }

    function fetchSeason(id, season, isTVMDB) {
        if (isTVMDB) {
            const url = `https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/tv/${id}/season/${season}?language=en-US`;
            return fetch(url).then(r => r.json()).then(d => d.episodes || []);
        } else {
            return fetch(`https://api-csmss.craeckor.ch/https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(title)}.json`)
                .then(r => r.json())
                .then(data => {
                    const match = (data.d || []).find(item => item.id === id);
                    if (match && match.t === season) {
                        return fetch(`https://api-csmss.craeckor.ch/https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(title + ' season ' + season)}.json`)
                            .then(r => r.json())
                            .then(d => (d.d || []).filter(item => item.id.startsWith('tt')).map((item, idx) => ({
                                episode_number: idx + 1,
                                name: item.l || 'Episode ' + (idx + 1),
                                still_path: item.i ? item.i.imageUrl : null,
                                air_date: item.s || ''
                            })));
                    }
                    return [];
                });
        }
    }

    function renderEpisodes(episodes, season) {
        grid.innerHTML = '';
        const currentEp = getCookie(`${mediaId}_episode`) || 1;
        infoEl.textContent = `${episodes.length} episodes — Season ${season}`;

        episodes.forEach(function(ep) {
            if (ep.episode_number === undefined || ep.episode_number === null) return;
            const card = document.createElement('div');
            card.className = 'episodeCard' + (ep.episode_number == currentEp ? ' active' : '');
            card.dataset.episode = ep.episode_number;

            const imgSrc = ep.still_path
                ? 'https://image.tmdb.org/t/p/w200' + ep.still_path
                : '/assets/image/unavailed.png';
            const epTitle = ep.name || 'Episode ' + ep.episode_number;
            const epDate = ep.air_date || '';
            const epNum = 'S' + season + ' · E' + ep.episode_number;

            card.innerHTML = '<img src="' + imgSrc + '" alt="' + epTitle + '"><div class="epMeta"><p class="epNumber">' + epNum + '</p><p class="epTitle">' + epTitle + '</p><p class="epDate">' + epDate + '</p></div>';

            card.onclick = function() {
                document.querySelectorAll('.episodeCard').forEach(function(c) { c.classList.remove('active'); });
                card.classList.add('active');
                setCookie(`${mediaId}_episode`, ep.episode_number, 5);
                setCookie(`${mediaId}_season`, season, 5);

                const isT = getCookie('currentEngine') === 'tmdb';
                if (isT) {
                    if (typeof window.setTmdbSeasonEpisode === 'function') {
                        window.setTmdbSeasonEpisode(season, ep.episode_number);
                    }
                } else {
                    if (typeof window.setImdbSeasonEpisode === 'function') {
                        window.setImdbSeasonEpisode(season, ep.episode_number);
                    }
                }
                closeEpisodeGuide();
            };

            grid.appendChild(card);
        });
    }
}

function saveRecent(id, title, poster, year, type, engine) {
    var items = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');
    items = items.filter(function(i) { return i.id !== String(id); });
    items.unshift({ id: String(id), title: title, poster: poster, year: year, type: type, engine: engine });
    if (items.length > 8) items = items.slice(0, 8);
    localStorage.setItem('recentlyWatched', JSON.stringify(items));
}

function renderRecent() {
    var items = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');
    var section = document.getElementById('recentSection');
    if (!section) return;
    while (section.firstChild) section.removeChild(section.firstChild);

    var existingLabel = document.getElementById('recentLabel');
    if (existingLabel) existingLabel.remove();
    if (items.length === 0) return;

    var label = document.createElement('p');
    label.id = 'recentLabel';
    label.textContent = 'Recently watched';
    section.parentNode.insertBefore(label, section);

    items.forEach(function(item) {
        var card = document.createElement('div');
        card.className = 'preview';
        card.onclick = function() {
            var currentEng = getCookie('currentEngine') || 'imdb';
            if (item.engine !== currentEng) {
                setCookie('currentEngine', item.engine, 30);
                location.reload();
                return;
            }
            if (item.engine === 'tmdb' && window.openTmdbIframe) {
                window.openTmdbIframe(item.id, item.type === 'tv' ? 'tv' : 'movie', item.title);
            } else if (item.engine === 'imdb' && window.openImdbIframe) {
                window.openImdbIframe(item.id, item.type === 'tv' ? 'tvSeries' : 'movie', item.title);
            }
        };
        var img = document.createElement('img');
        img.src = item.poster || 'assets/image/unavailed.png';
        img.alt = item.title;
        var h3 = document.createElement('h3');
        h3.textContent = item.title;
        var descP = document.createElement('p');
        var yearP = document.createElement('p');
        yearP.textContent = item.year || '';
        var typeP = document.createElement('p');
        typeP.textContent = item.type === 'tv' ? 'TV Series' : 'Movie';
        card.appendChild(img);
        card.appendChild(h3);
        card.appendChild(descP);
        card.appendChild(yearP);
        card.appendChild(typeP);
        section.appendChild(card);
    });
}
