function updateHostOptions() {
    let currentHost = getCookie('currentHost') || 'moviesapi';
    const hostSelect = document.getElementById('hostSelect');
    currentEngine = getCookie('currentEngine');

    // Clear existing options
    hostSelect.innerHTML = '';

    // Add common options
    const commonOptions = [
        { value: 'vidsrc-pro', text: 'VidSrc.pro' },
        { value: 'autoembed', text: 'AutoEmbed' },
        { value: 'superembed', text: 'SuperEmbed' },
        { value: '2embed', text: '2Embed' },
        { value: 'vidsrc-me', text: 'VidSrc.me' },
        { value: 'vidsrc-cc', text: 'VidSrc.cc' },
        { value: 'smashystream', text: 'SmashyStream' },
        { value: 'moviesapi', text: 'MoviesAPI' },
        { value: 'primewire', text: 'PrimeWire' },
        { value: 'filmku', text: 'FILMku' },
        { value: 'vidsrc-nl', text: 'VidSrc.nl' }
    ];

    commonOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.text;
        hostSelect.appendChild(opt);
    });

    // Add TMDB-specific options if TMDB is the current engine
    if (currentEngine === 'tmdb') {
        const tmdbOptions = [
            { value: 'vidlink', text: 'VidLink' },
            { value: 'moviee', text: 'MoviEE' }
        ];

        tmdbOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.text;
            hostSelect.appendChild(opt);
        });
    }

    // Set the current host value
    hostSelect.value = currentHost;
}

if (getCookie('currentEngine') === 'tmdb') {
    let debounceTimeout;
    let currentTmdbId = '';
    let currentSeason = 1;
    let currentEpisode = 1;
    let isSeries = false;
    let currentTitle = '';
    let currentHost = getCookie('currentHost') || 'moviesapi';

    let maxSeasons = null;
    let maxEpisodes = null;

    let searchResults = [];
    let currentPage = 1;
    let isLoadingMore = false;
    let hasMorePages = true;
    let activeQuery = '';

    if (!getCookie('currentHost')) {
        setCookie('currentHost', 'moviesapi', 5); // Set the cookie to 'moviesapi' if it doesn't exist
    }

    document.getElementById('hostSelect').value = currentHost;

    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        currentPage = 1;
        searchResults = [];
        debounceTimeout = setTimeout(() => fetchData(1), 1500);
    });
    
    // Call updateHostOptions on page load
    updateHostOptions();

    async function fetchData(page) {
        const input = document.getElementById('searchInput').value;
        if (input.trim() === '') {
            if (page > 1) return;
            loadTrending();
            return;
        }
        activeQuery = input.trim();
        page = page || 1;
        const movieUrl = `https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/search/movie?query=${input}&include_adult=true&language=en-US&page=${page}`;
        const tvUrl = `https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/search/tv?query=${input}&include_adult=true&language=en-US&page=${page}`;

        try {
            const [movieResponse, tvResponse] = await Promise.all([fetch(movieUrl), fetch(tvUrl)]);
            if (!movieResponse.ok || !tvResponse.ok) {
                throw new Error('Network response was not ok');
            }
            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();

            const combined = [...movieData.results, ...tvData.results];
            combined.forEach(item => item.media_type = item.name ? 'tv' : 'movie');
            combined.sort((a, b) => b.popularity - a.popularity);

            if (page === 1) {
                searchResults = combined;
            } else {
                searchResults = searchResults.concat(combined);
            }
            currentPage = page;
            hasMorePages = movieData.total_pages > page || tvData.total_pages > page;

            displayResults(searchResults, page > 1);
        } catch (error) {
            const output = document.getElementById('output');
            output.textContent = '';
            const err = document.createElement('p');
            err.className = 'empty-state';
            err.textContent = 'Something went wrong. Try again.';
            output.appendChild(err);
        }
    }

    function displayResults(results, append) {
        const output = document.getElementById('output');
        if (!append) output.innerHTML = '';

        document.getElementById('loadMoreBtn')?.remove();

        results.forEach(item => {
            if (append && document.querySelector('.preview[data-id="' + item.id + '"]')) return;

            const preview = document.createElement('div');
            preview.className = 'preview';
            preview.dataset.id = item.id;
            preview.onclick = () => {
                const p = item.poster_path ? 'https://image.tmdb.org/t/p/w200' + item.poster_path : 'assets/image/unavailed.png';
                const y = (item.release_date || item.first_air_date || '').split('-')[0];
                const t = item.media_type === 'tv' ? 'tv' : 'movie';
                saveRecent(item.id, item.title || item.name, p, y, t, 'tmdb');
                openIframe(item.id, item.media_type, item.title || item.name);
            };

            let overview = item.overview || 'No description available';
            const words = overview.split(' ');
            if (words.length > 15) {
                overview = words.slice(0, 15).join(' ') + '...';
            }

            const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0];

            preview.innerHTML = `
                <img src="${item.poster_path ? 'https://image.tmdb.org/t/p/w200' + item.poster_path : 'assets/image/unavailed.png'}" alt="${item.title || item.name}">
                <h3>${item.title || item.name}</h3>
                <p>${overview}</p>
                <p>${releaseYear}</p>
                <p>${item.media_type === 'movie' ? 'Movie' : 'TV Series'}</p>
            `;
            output.appendChild(preview);
        });

        if (!append) {
            if (output.children.length === 0) {
                const msg = document.createElement('p');
                msg.className = 'empty-state';
                msg.textContent = 'No results found.';
                output.appendChild(msg);
            } else if (hasMorePages) {
                const btn = document.createElement('button');
                btn.id = 'loadMoreBtn';
                btn.textContent = 'Load More';
                btn.onclick = loadMore;
                output.parentNode.insertBefore(btn, output.nextSibling);
            }
        }

        if (append && hasMorePages) {
            const btn = document.createElement('button');
            btn.id = 'loadMoreBtn';
            btn.textContent = 'Load More';
            btn.onclick = loadMore;
            output.parentNode.insertBefore(btn, output.nextSibling);
        }
    }

    function loadMore() {
        if (!activeQuery) return;
        if (isLoadingMore || !hasMorePages) return;
        isLoadingMore = true;
        fetchData(currentPage + 1).then(() => {
            isLoadingMore = false;
        });
    }

    function updateStepControls() {
        const sv = document.getElementById('seasonValue');
        const ev = document.getElementById('episodeValue');
        if (sv) sv.value = currentSeason;
        if (ev) ev.value = currentEpisode;
    }

    function openIframe(tmdbId, mediaType, title) {
        const activeImg = document.querySelector('.preview.active img');
        const activeYear = document.querySelector('.preview.active p:nth-of-type(2)');
        const poster = activeImg ? activeImg.src : 'assets/image/unavailed.png';
        const year = activeYear ? activeYear.textContent : '';
        currentTmdbId = tmdbId;
        isSeries = mediaType === 'tv';
        currentSeason = parseInt(getCookie(`${currentTmdbId}_season`), 10) || 1;
        currentEpisode = parseInt(getCookie(`${currentTmdbId}_episode`), 10) || 1;
        currentTitle = title;
        maxSeasons = null;
        maxEpisodes = null;
        if (isSeries) {
            fetch(`https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/tv/${currentTmdbId}?language=en-US`)
                .then(r => r.json())
                .then(d => { maxSeasons = d.number_of_seasons || null; })
                .catch(() => {});
            fetch(`https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/tv/${currentTmdbId}/season/${currentSeason}?language=en-US`)
                .then(r => r.json())
                .then(d => { maxEpisodes = (d.episodes && d.episodes.length) || null; })
                .catch(() => {});
        }
        document.getElementById('iframeContainer').style.display = 'block';
        updateIframe();
    }

    async function updateIframe() {
        const movieIframe = document.getElementById('movieIframe');
        const infoText = document.getElementById('infoText');
        let src = '';
        if (isSeries) {
            if (currentHost === 'vidsrc-pro') {
                src = `https://vidsrc.pro/embed/tv/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
            } else if (currentHost === 'autoembed') {
                src = `https://player.autoembed.cc/embed/tv/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
            } else if (currentHost === 'superembed') {
                const vipCheckUrl = `https://cors.craeckor.ch/https://multiembed.mov/directstream.php?video_id=${currentTmdbId}&s=${currentSeason}&e=${currentEpisode}&check=1`;
                const vipAvailable = await checkVipAvailability(vipCheckUrl);
                if (vipAvailable) {
                    src = `https://multiembed.mov/directstream.php?video_id=${currentTmdbId}&s=${currentSeason}&e=${currentEpisode}`;
                } else {
                    src = `https://multiembed.mov/?video_id=${currentTmdbId}&s=${currentSeason}&e=${currentEpisode}`;
                }
            } else if (currentHost === '2embed') {
                src = `https://www.2embed.cc/embedtv/${currentTmdbId}&s=${currentSeason}&e=${currentEpisode}`;
            } else if (currentHost === 'vidsrc-me') {
                src = `https://vidsrc.xyz/embed/tv?tmdb=${currentTmdbId}&season=${currentSeason}&episode=${currentEpisode}`;
            } else if (currentHost === 'vidsrc-cc') {
                src = `https://vidsrc.cc/v2/embed/tv/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
            } else if (currentHost === 'smashystream') {
                src = `https://player.smashy.stream/tv/${currentTmdbId}?s=${currentSeason}&e=${currentEpisode}`;
            } else if (currentHost === 'moviesapi') {
                src = `https://moviesapi.club/tv/${currentTmdbId}-${currentSeason}-${currentEpisode}`;
            } else if (currentHost === 'primewire') {
                src = `https://www.primewire.tf/embed/tv?tmdb=${currentTmdbId}&season=${currentSeason}&episode=${currentEpisode}`;
            } else if (currentHost === 'filmku') {
                src = `https://filmku.stream/embed/series?tmdb=${currentTmdbId}&sea=${currentSeason}&epi=${currentEpisode}`;
            } else if (currentHost === 'vidsrc-nl') { 
                src = `https://player.vidsrc.nl/embed/tv/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
            } else if (currentHost === 'vidlink') {
                src = `https://vidlink.pro/tv/${currentTmdbId}/${currentSeason}/${currentEpisode}`;
            } else if (currentHost === 'moviee') {
                src = `https://moviee.tv/embed/tv/${currentTmdbId}?season=${currentSeason}&episode=${currentEpisode}`;
            }
            infoText.textContent = `${currentTitle} - Season ${currentSeason}, Episode ${currentEpisode}`;
            document.getElementById('seasonControl').style.display = 'flex';
            document.getElementById('episodeControl').style.display = 'flex';
            updateStepControls();
        } else {
            if (currentHost === 'vidsrc-pro') {
                src = `https://vidsrc.pro/embed/movie/${currentTmdbId}`;
            } else if (currentHost === 'autoembed') {
                src = `https://player.autoembed.cc/embed/movie/${currentTmdbId}`;
            } else if (currentHost === 'superembed') {
                const vipCheckUrl = `https://cors.craeckor.ch/https://multiembed.mov/directstream.php?video_id=${currentTmdbId}&check=1`;
                const vipAvailable = await checkVipAvailability(vipCheckUrl);
                if (vipAvailable) {
                    src = `https://multiembed.mov/directstream.php?video_id=${currentTmdbId}`;
                } else {
                    src = `https://multiembed.mov/?video_id=${currentTmdbId}`;
                }
            } else if (currentHost === '2embed') {
                src = `https://www.2embed.cc/embed/${currentTmdbId}`;
            } else if (currentHost === 'vidsrc-me') {
                src = `https://vidsrc.xyz/embed/movie?tmdb=${currentTmdbId}`;
            } else if (currentHost === 'vidsrc-cc') {
                src = `https://vidsrc.cc/v2/embed/movie/${currentTmdbId}`;
            } else if (currentHost === 'smashystream') {
                src = `https://player.smashy.stream/movie/${currentTmdbId}`;
            } else if (currentHost === 'moviesapi') {
                src = `https://moviesapi.club/movie/${currentTmdbId}`;
            } else if (currentHost === 'primewire') {
                src = `https://www.primewire.tf/embed/movie?tmdb=${currentTmdbId}`;
            } else if (currentHost === 'filmku') {
                src = `https://filmku.stream/embed/movie?tmdb=${currentTmdbId}`;
            } else if (currentHost === 'vidsrc-nl') {
                src = `https://player.vidsrc.nl/embed/movie/${currentTmdbId}`;
            } else if (currentHost === 'vidlink') {
                src = `https://vidlink.pro/movie/${currentTmdbId}`;
            } else if (currentHost === 'moviee') {
                src = `https://moviee.tv/embed/movie/${currentTmdbId}`;
            }
            infoText.textContent = currentTitle;
            document.getElementById('seasonControl').style.display = 'none';
            document.getElementById('episodeControl').style.display = 'none';
        }
        movieIframe.src = src;
    }

    async function checkVipAvailability(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            return text.trim() === '1';
        } catch (error) {
            console.error('Error checking VIP availability:', error);
            return false;
        }
    }

    function closeIframe() {
        const iframeContainer = document.getElementById('iframeContainer');
        const movieIframe = document.getElementById('movieIframe');
        movieIframe.src = '';
        iframeContainer.style.display = 'none';
    }

    function toggleFullscreen() {
        const movieIframe = document.getElementById('movieIframe');
        if (movieIframe.requestFullscreen) {
            movieIframe.requestFullscreen();
        } else if (movieIframe.mozRequestFullScreen) { // Firefox
            movieIframe.mozRequestFullScreen();
        } else if (movieIframe.webkitRequestFullscreen) { // Chrome, Safari and Opera
            movieIframe.webkitRequestFullscreen();
        } else if (movieIframe.msRequestFullscreen) { // IE/Edge
            movieIframe.msRequestFullscreen();
        }
    }

    function changeSeason(change) {
        let next = Math.max(1, parseInt(currentSeason, 10) + change);
        if (maxSeasons !== null) next = Math.min(next, maxSeasons);
        currentSeason = next;
        currentEpisode = 1;
        maxEpisodes = null;
        fetch(`https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/tv/${currentTmdbId}/season/${currentSeason}?language=en-US`)
            .then(r => r.json())
            .then(d => { maxEpisodes = (d.episodes && d.episodes.length) || null; })
            .catch(() => {});
        setCookie(`${currentTmdbId}_season`, currentSeason, 5);
        setCookie(`${currentTmdbId}_episode`, currentEpisode, 5);
        updateStepControls();
        updateIframe();
    }

    function changeEpisode(change) {
        let next = Math.max(1, parseInt(currentEpisode, 10) + change);
        if (maxEpisodes !== null) next = Math.min(next, maxEpisodes);
        currentEpisode = next;
        setCookie(`${currentTmdbId}_episode`, currentEpisode, 5);
        updateStepControls();
        updateIframe();
    }

    function changeHost() {
        currentHost = document.getElementById('hostSelect').value;
        setCookie('currentHost', currentHost, 5);
        updateIframe();
    }

    async function loadTrending() {
        const url = 'https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/trending/all/week?language=en-US';
        try {
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            data.results.forEach(item => {
                if (!item.media_type) item.media_type = item.title ? 'movie' : 'tv';
            });
            searchResults = data.results;
            currentPage = 1;
            hasMorePages = false;
            activeQuery = '';
            displayResults(data.results);
        } catch (e) { /* silent fail */ }
    }

    window.setTmdbSeasonEpisode = function(season, episode) {
        currentSeason = parseInt(season, 10) || 1;
        currentEpisode = parseInt(episode, 10) || 1;
        setCookie(`${currentTmdbId}_season`, currentSeason, 5);
        setCookie(`${currentTmdbId}_episode`, currentEpisode, 5);
        updateStepControls();
        updateIframe();
    };

    window.setSeasonDirect = function(val) {
        let s = Math.max(1, val);
        if (maxSeasons !== null) s = Math.min(s, maxSeasons);
        currentSeason = s;
        currentEpisode = 1;
        maxEpisodes = null;
        fetch(`https://api-csmss.craeckor.ch/https://api.themoviedb.org/3/tv/${currentTmdbId}/season/${currentSeason}?language=en-US`)
            .then(r => r.json())
            .then(d => { maxEpisodes = (d.episodes && d.episodes.length) || null; })
            .catch(() => {});
        setCookie(`${currentTmdbId}_season`, currentSeason, 5);
        setCookie(`${currentTmdbId}_episode`, currentEpisode, 5);
        updateStepControls();
        updateIframe();
    };

    window.setEpisodeDirect = function(val) {
        let e = Math.max(1, val);
        if (maxEpisodes !== null) e = Math.min(e, maxEpisodes);
        currentEpisode = e;
        setCookie(`${currentTmdbId}_episode`, currentEpisode, 5);
        updateStepControls();
        updateIframe();
    };

    window.getTmdbSeriesState = function() {
        return { isSeries, currentTmdbId, currentTitle, currentSeason, currentEpisode };
    };

    window.loadMoreResults = loadMore;
    window.openTmdbIframe = openIframe;

    window.hasActiveSearch = function() { return !!activeQuery; };

    loadTrending();
}