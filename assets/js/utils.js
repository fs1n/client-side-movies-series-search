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
    const seasonOverviewEl = document.getElementById('episodeGuideSeasonOverview');
    const grid = document.getElementById('episodeGrid');
    const titleEl = document.getElementById('episodeGuideTitle');
    const infoEl = document.getElementById('episodeGuideInfo');

    titleEl.textContent = title;
    grid.innerHTML = '';
    seasonOverviewEl.textContent = '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    const isTmdb = getCookie('currentEngine') === 'tmdb';
    let seasonsMeta = [];
    let currentSeason = activeSeason || 1;

    function showLoading() {
        grid.innerHTML = '';
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'Loading episodes...';
        grid.appendChild(empty);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const opts = { month: 'short', day: 'numeric', year: 'numeric' };
        return d.toLocaleDateString('en-US', opts);
    }

    function setSeasonOverview(seasonNum) {
        const meta = seasonsMeta[seasonNum - 1];
        seasonOverviewEl.textContent = meta && meta.overview ? meta.overview : '';
    }

    if (isTmdb) {
        const detailUrl = `https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/tv/${mediaId}?language=en-US`;
        fetch(detailUrl)
            .then(r => r.json())
            .then(data => {
                seasonsMeta = data.seasons || [];
                buildSeasonTabs(seasonsMeta.length, currentSeason);
                setSeasonOverview(currentSeason);
                showLoading();
                return fetchSeason(mediaId, currentSeason, true);
            })
            .then(episodes => {
                renderEpisodes(episodes, currentSeason, true);
            });
    } else {
        seasonsMeta = Array.from({ length: 10 }, (_, i) => ({ air_date: null, overview: '' }));
        buildSeasonTabs(10, currentSeason);
        showLoading();
        fetchSeason(mediaId, currentSeason, false).then(episodes => {
            renderEpisodes(episodes, currentSeason, false);
        });
    }

    function buildSeasonTabs(count, active) {
        seasonNav.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const btn = document.createElement('button');
            const meta = seasonsMeta[i - 1];
            let label = 'S' + i;
            if (meta && meta.air_date) {
                const year = new Date(meta.air_date).getFullYear();
                label += ' · ' + year;
            }
            btn.className = 'seasonTab' + (i === active ? ' active' : '');
            btn.textContent = label;
            btn.dataset.season = i;
            btn.onclick = function() {
                document.querySelectorAll('.seasonTab').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                currentSeason = i;
                setSeasonOverview(i);
                showLoading();
                const isCurrentTmdb = getCookie('currentEngine') === 'tmdb';
                fetchSeason(mediaId, i, isCurrentTmdb).then(eps => {
                    renderEpisodes(eps, i, isCurrentTmdb);
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

    function renderEpisodes(episodes, season, isTVMDB) {
        grid.innerHTML = '';
        const currentEp = getCookie(`${mediaId}_episode`) || 1;
        infoEl.textContent = `${episodes.length} episodes — Season ${season}`;

        episodes.forEach(function(ep) {
            if (ep.episode_number === undefined || ep.episode_number === null) return;

            const card = document.createElement('div');
            card.className = 'episodeCard' + (ep.episode_number == currentEp && season == currentSeason ? ' active' : '');
            card.dataset.episode = ep.episode_number;

            const img = document.createElement('img');
            img.className = 'epThumb';
            img.src = ep.still_path
                ? 'https://image.tmdb.org/t/p/w300' + ep.still_path
                : 'assets/image/unavailed.png';
            img.alt = ep.name || 'Episode';

            const body = document.createElement('div');
            body.className = 'epBody';

            const topRow = document.createElement('div');
            topRow.className = 'epTopRow';

            const epNum = document.createElement('span');
            epNum.className = 'epNumber';
            epNum.textContent = 'S' + season + ' · E' + ep.episode_number;

            const epTitle = document.createElement('span');
            epTitle.className = 'epTitle';
            epTitle.textContent = ep.name || 'Episode ' + ep.episode_number;

            topRow.appendChild(epNum);
            topRow.appendChild(epTitle);

            if (isTVMDB && ep.vote_average > 0) {
                const rating = document.createElement('span');
                rating.className = 'epRating';
                rating.textContent = '★ ' + ep.vote_average.toFixed(1);
                topRow.appendChild(rating);
            }

            body.appendChild(topRow);

            if (ep.air_date || (isTVMDB && ep.runtime)) {
                const subRow = document.createElement('div');
                subRow.className = 'epSubRow';

                if (ep.air_date) {
                    const date = document.createElement('span');
                    date.className = 'epDate';
                    date.textContent = formatDate(ep.air_date);
                    subRow.appendChild(date);
                }

                if (isTVMDB && ep.runtime) {
                    const runtime = document.createElement('span');
                    runtime.className = 'epRuntime';
                    runtime.textContent = '· ' + ep.runtime + ' min';
                    subRow.appendChild(runtime);
                }

                body.appendChild(subRow);
            }

            if (isTVMDB && ep.overview) {
                const desc = document.createElement('p');
                desc.className = 'epDesc';
                desc.textContent = ep.overview;
                body.appendChild(desc);
            }

            card.appendChild(img);
            card.appendChild(body);

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

        setTimeout(function() {
            const activeCard = document.querySelector('.episodeCard.active');
            if (activeCard) {
                activeCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }, 50);
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
