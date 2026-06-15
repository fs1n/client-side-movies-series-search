(function() {
    'use strict';

    // Explicit override from localStorage for power users.
    const override = localStorage.getItem('csmss_proxy_url');

    // When served from a real web server (not file://), assume a same-origin
    // proxy at /cors/ is available (e.g. the included docker-compose setup).
    const isHttpServed = window.location.protocol === 'http:' || window.location.protocol === 'https:';

    const defaultProxy = isHttpServed ? '/cors/' : 'https://api-csmss.craeckor.ch/';

    window.CSMSS_CONFIG = {
        PROXY_BASE: override || defaultProxy,
        TMDB_API_KEY: localStorage.getItem('csmss_tmdb_key') || '',
    };

    window.buildProxyUrl = function(target) {
        if (!target) return target;
        const base = window.CSMSS_CONFIG.PROXY_BASE;
        return base.replace(/\/$/, '') + '?target=' + encodeURIComponent(target);
    };

    window.appendTmdbApiKey = function(url) {
        if (!window.CSMSS_CONFIG.TMDB_API_KEY) return url;
        if (!url.includes('api.themoviedb.org')) return url;
        const sep = url.includes('?') ? '&' : '?';
        if (url.includes('api_key=')) return url;
        return url + sep + 'api_key=' + encodeURIComponent(window.CSMSS_CONFIG.TMDB_API_KEY);
    };
})();
