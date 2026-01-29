import { EmbedHost } from './types';
import { config } from './lib/config';

// Re-export constants from config for backward compatibility
export const TMDB_API_KEY = config.tmdb.apiKey;
export const TMDB_BASE_URL = config.tmdb.baseUrl;
export const IMAGE_BASE_URL = config.tmdb.imageBaseUrl;
export const BACKDROP_BASE_URL = config.tmdb.backdropBaseUrl;

export const HOSTS: EmbedHost[] = [
  {
    id: 'vidsrc-pro',
    name: 'VidSrc.pro',
    urlTemplate: (id, s, e) => s && e ? `https://vidsrc.pro/embed/tv/${id}/${s}/${e}` : `https://vidsrc.pro/embed/movie/${id}`
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc.me',
    urlTemplate: (id, s, e) => s && e ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?tmdb=${id}`
  },
  {
    id: 'vidsrc-cc',
    name: 'VidSrc.cc',
    urlTemplate: (id, s, e) => s && e ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` : `https://vidsrc.cc/v2/embed/movie/${id}`
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    urlTemplate: (id, s, e) => s && e ? `https://autoembed.cc/embed/player.php?id=${id}&s=${s}&e=${e}` : `https://autoembed.cc/embed/player.php?id=${id}`
  },
  {
    id: 'superembed',
    name: 'SuperEmbed',
    urlTemplate: (id, s, e) => s && e ? `https://superembed.stream/series.php?tmdb=${id}&s=${s}&e=${e}` : `https://superembed.stream/movie.php?tmdb=${id}`
  },
  {
    id: '2embed',
    name: '2Embed',
    urlTemplate: (id, s, e) => s && e ? `https://2embed.org/embed/series?tmdb=${id}&s=${s}&e=${e}` : `https://2embed.org/embed/movie?tmdb=${id}`
  },
  {
    id: 'smashystream',
    name: 'SmashyStream',
    urlTemplate: (id, s, e) => s && e ? `https://embed.smashystream.com/playere.php?tmdb=${id}&s=${s}&e=${e}` : `https://embed.smashystream.com/playere.php?tmdb=${id}`
  },
  {
    id: 'vidsrc-nl',
    name: 'VidSrc.nl',
    urlTemplate: (id, s, e) => s && e ? `https://vidsrc.nl/embed/tv/${id}/${s}/${e}` : `https://vidsrc.nl/embed/movie/${id}`
  }
];