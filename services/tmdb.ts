import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { MediaItem, Genre } from '../types';

export const searchMulti = async (query: string): Promise<MediaItem[]> => {
  if (!query) return [];
  
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.results.filter((item: MediaItem) => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (error) {
    console.error("Failed to fetch search results", error);
    return [];
  }
};

export const getTrending = async (): Promise<MediaItem[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}&language=en-US`
    );
    const data = await response.json();
    return data.results.filter((item: MediaItem) => item.media_type === 'movie' || item.media_type === 'tv');
  } catch (error) {
    console.error("Failed to fetch trending", error);
    return [];
  }
};

export const getGenres = async (type: 'movie' | 'tv'): Promise<Genre[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/genre/${type}/list?api_key=${TMDB_API_KEY}&language=en-US`
    );
    const data = await response.json();
    return data.genres || [];
  } catch (error) {
    console.error(`Failed to fetch ${type} genres`, error);
    return [];
  }
};

export const discoverMedia = async (type: 'movie' | 'tv', genreId?: string, year?: string, minRating?: string): Promise<MediaItem[]> => {
  try {
    let url = `${TMDB_BASE_URL}/discover/${type}?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false`;
    
    if (genreId && genreId !== 'all') url += `&with_genres=${genreId}`;
    if (year) {
      const yearParam = type === 'movie' ? 'primary_release_year' : 'first_air_date_year';
      url += `&${yearParam}=${year}`;
    }
    if (minRating) url += `&vote_average.gte=${minRating}`;

    const response = await fetch(url);
    const data = await response.json();
    return (data.results || []).map((item: any) => ({
      ...item,
      media_type: type // Discover results don't always include media_type
    }));
  } catch (error) {
    console.error(`Failed to discover ${type}`, error);
    return [];
  }
};
