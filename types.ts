export interface MediaItem {
  id: number;
  title: string; // Used for movies
  name?: string; // Used for TV
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  media_type: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface SearchFilters {
  genreId: string;
  year: string;
  minRating: string;
}

export interface PlayerState {
  isOpen: boolean;
  mediaId: number | null;
  mediaType: 'movie' | 'tv';
  title: string;
  season: number;
  episode: number;
  host: string;
}

export interface EmbedHost {
  id: string;
  name: string;
  urlTemplate: (id: string | number, season?: number, episode?: number) => string;
}