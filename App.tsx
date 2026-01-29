import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Clapperboard, Github, Info, Settings, Bookmark, ArrowUpDown, Filter, SlidersHorizontal, ChevronDown, X, User, LogOut } from 'lucide-react';
import { MediaItem, PlayerState, Genre, SearchFilters } from './types';
import { searchMulti, getTrending, getGenres, discoverMedia } from './services/tmdb';
import Player from './components/Player';
import MediaCard from './components/MediaCard';
import { account } from './lib/appwrite';
import { parseAppwriteError } from './lib/appwriteErrorHandler';
import AuthModal from './components/AuthModal';
import { loadUserWatchlist, migrateLocalWatchlist, addToWatchlist, removeFromWatchlist } from './lib/watchlist';

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Advanced Filters State with localStorage persistence
  const [showFilters, setShowFilters] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  
  const [filters, setFilters] = useState<SearchFilters>(() => {
    try {
      const saved = localStorage.getItem('csmss-filters');
      return saved ? JSON.parse(saved) : { genreId: 'all', year: '', minRating: '' };
    } catch (e) {
      return { genreId: 'all', year: '', minRating: '' };
    }
  });

  const [filterType, setFilterType] = useState<'movie' | 'tv'>(() => {
    return (localStorage.getItem('csmss-filter-type') as 'movie' | 'tv') || 'movie';
  });

  // Watchlist State
  const [watchlist, setWatchlist] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('csmss-watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse watchlist", e);
      return [];
    }
  });
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [sortOption, setSortOption] = useState('date_desc');
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);
  
  // Debounce search
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [playerState, setPlayerState] = useState<PlayerState>({
    isOpen: false,
    mediaId: null,
    mediaType: 'movie',
    title: '',
    season: 1,
    episode: 1,
    host: 'vidsrc-pro'
  });

  // Check Auth Session & Load Watchlist
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await account.get();
        setUser(session);
        console.log("Appwrite: Connected as " + session.email);
        
        // Load watchlist from Appwrite for authenticated user
        setIsLoadingWatchlist(true);
        try {
          const appwriteWatchlist = await loadUserWatchlist(session.$id);
          setWatchlist(appwriteWatchlist);
          
          // Perform migration if needed
          const localWatchlist = (() => {
            try {
              const saved = localStorage.getItem('csmss-watchlist');
              return saved ? JSON.parse(saved) : [];
            } catch {
              return [];
            }
          })();
          
          if (localWatchlist.length > 0) {
            try {
              await migrateLocalWatchlist(session.$id, localWatchlist);
              // Reload watchlist after migration
              const updatedWatchlist = await loadUserWatchlist(session.$id);
              setWatchlist(updatedWatchlist);
              // Clear local storage after successful migration
              localStorage.removeItem('csmss-watchlist');
              console.log('Watchlist migrated to Appwrite');
            } catch (migrationError) {
              console.warn('Migration failed, keeping local watchlist:', migrationError);
            }
          }
        } catch (watchlistError) {
          console.warn('Failed to load Appwrite watchlist, falling back to local:', watchlistError);
          // Fall back to local storage if Appwrite fails
        } finally {
          setIsLoadingWatchlist(false);
        }
      } catch (e: any) {
        const error = parseAppwriteError(e);
        // Handle guest user or network errors
        if (error.code === 401) {
            console.log("Appwrite: Guest Session");
            setIsLoadingWatchlist(false);
        } else {
            console.warn(`Appwrite session check failed: ${error.message}`, error.code);
            setIsLoadingWatchlist(false);
        }
      }
    };
    checkSession();
  }, []);

  // Persist Watchlist to localStorage only for guests
  useEffect(() => {
    if (!user) {
      localStorage.setItem('csmss-watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist, user]);

  // Persist Filters
  useEffect(() => {
    localStorage.setItem('csmss-filters', JSON.stringify(filters));
  }, [filters]);

  // Persist Filter Type
  useEffect(() => {
    localStorage.setItem('csmss-filter-type', filterType);
  }, [filterType]);

  // Initial Load (Trending and Genres)
  useEffect(() => {
    const init = async () => {
      const trendingItems = await getTrending();
      setTrending(trendingItems);
      
      const movieGenres = await getGenres('movie');
      setGenres(movieGenres);
    };
    init();
  }, []);

  // Fetch genres when type changes
  useEffect(() => {
    const fetchNewGenres = async () => {
      const newGenres = await getGenres(filterType);
      setGenres(newGenres);
    };
    fetchNewGenres();
  }, [filterType]);

  // Search/Discover Effect
  useEffect(() => {
    const performSearch = async () => {
      // If we are in watchlist mode, don't perform API searches
      if (showWatchlist) return;

      const hasFilters = filters.genreId !== 'all' || filters.year || filters.minRating;

      if (!debouncedQuery.trim() && !hasFilters) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      
      if (hasFilters && !debouncedQuery.trim()) {
        // Use Discovery if filters are set but no text query
        const items = await discoverMedia(filterType, filters.genreId, filters.year, filters.minRating);
        setResults(items);
      } else {
        // Use standard search for text queries
        // Note: TMDB Search Multi doesn't support easy filtering in one call like Discover
        // So we filter the results client-side if filters are active with a search query
        let items = await searchMulti(debouncedQuery);
        
        if (hasFilters) {
          items = items.filter(item => {
            const matchesType = (filterType === 'movie' && item.media_type === 'movie') || (filterType === 'tv' && item.media_type === 'tv');
            if (!matchesType) return false;

            if (filters.genreId !== 'all' && !item.genre_ids?.includes(Number(filters.genreId))) return false;
            
            if (filters.year) {
              const itemYear = (item.release_date || item.first_air_date || '').split('-')[0];
              if (itemYear !== filters.year) return false;
            }

            if (filters.minRating) {
              if ((item.vote_average || 0) < Number(filters.minRating)) return false;
            }

            return true;
          });
        }
        setResults(items);
      }
      
      setIsSearching(false);
    };

    performSearch();
  }, [debouncedQuery, filters, filterType, showWatchlist]);

  const handleMediaClick = useCallback((item: MediaItem) => {
    setPlayerState({
      isOpen: true,
      mediaId: item.id,
      mediaType: item.media_type,
      title: item.title || item.name || '',
      season: 1,
      episode: 1,
      host: 'vidsrc-pro'
    });
  }, []);

  const closePlayer = () => {
    setPlayerState(prev => ({ ...prev, isOpen: false }));
  };

  const updatePlayerState = (newState: Partial<PlayerState>) => {
    setPlayerState(prev => ({ ...prev, ...newState }));
  };

  const toggleWatchlist = useCallback((item: MediaItem) => {
    const isInWatchlist = watchlist.some(w => w.id === item.id);
    
    if (user) {
      // Authenticated: sync with Appwrite
      if (isInWatchlist) {
        removeFromWatchlist(user.$id, item.id).then((success) => {
          if (success) {
            setWatchlist(prev => prev.filter(w => w.id !== item.id));
          }
        });
      } else {
        addToWatchlist(user.$id, item).then((result) => {
          if (result) {
            setWatchlist(prev => [...prev, item]);
          }
        });
      }
    } else {
      // Guest: use localStorage
      setWatchlist(prev => {
        const exists = prev.find(i => i.id === item.id);
        if (exists) {
          return prev.filter(i => i.id !== item.id);
        }
        return [...prev, item];
      });
    }
  }, [user, watchlist]);

  const handleWatchlistToggle = () => {
    if (!showWatchlist) {
      setSearchQuery(''); 
      setFilters({ genreId: 'all', year: '', minRating: '' });
    }
    setShowWatchlist(!showWatchlist);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({ genreId: 'all', year: '', minRating: '' });
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      setShowUserMenu(false);
      // Reset watchlist to local storage on logout
      setWatchlist([]);
      localStorage.setItem('csmss-watchlist', JSON.stringify([]));
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  // Determine display list
  const activeResults = useMemo(() => {
    let list: MediaItem[] = [];
    if (showWatchlist) {
      list = [...watchlist];
      switch (sortOption) {
        case 'date_desc': list.reverse(); break;
        case 'title_asc': 
          list.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || '')); 
          break;
        case 'rating_desc': 
          list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)); 
          break;
      }
    } else if (searchQuery || filters.genreId !== 'all' || filters.year || filters.minRating) {
      list = results;
    } else {
      list = trending;
    }
    return list;
  }, [showWatchlist, watchlist, sortOption, results, trending, searchQuery, filters]);

  const pageTitle = useMemo(() => {
    if (showWatchlist) return 'My Watchlist';
    if (searchQuery) return `Results for "${searchQuery}"`;
    const hasFilters = filters.genreId !== 'all' || filters.year || filters.minRating;
    if (hasFilters) return `Exploring ${filterType === 'movie' ? 'Movies' : 'TV Series'}`;
    return 'Trending Now';
  }, [showWatchlist, searchQuery, filters, filterType]);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/80 border-b border-white/5">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center gap-4 justify-between">
          
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
            setSearchQuery('');
            setShowWatchlist(false);
            resetFilters();
          }}>
            <div className="bg-primary/20 p-2 rounded-lg group-hover:bg-primary/30 transition-colors">
              <Clapperboard className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">CSMSS <span className="text-primary">Beta</span></h1>
          </div>

          <div className="relative w-full max-w-xl flex items-center gap-2">
            {!showWatchlist ? (
              <div className="relative flex-grow animate-in fade-in duration-300">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-subtext" />
                </div>
                <input
                  type="text"
                  className={`block w-full pl-10 ${searchQuery ? 'pr-20' : 'pr-12'} py-2 bg-surface border border-white/10 rounded-full leading-5 placeholder-subtext focus:outline-none focus:bg-black focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-sm transition-all shadow-inner`}
                  placeholder="Search movies or series..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                
                {/* Clear Search Button */}
                {searchQuery && (
                   <button
                     onClick={() => setSearchQuery('')}
                     className="absolute inset-y-0 right-10 flex items-center pr-2 text-subtext hover:text-white transition-colors"
                     title="Clear search"
                   >
                     <X className="w-4 h-4" />
                   </button>
                )}

                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center hover:text-primary transition-colors ${showFilters ? 'text-primary' : 'text-subtext'}`}
                  title="Toggle filters"
                >
                  <Filter className="w-4 h-4" />
                </button>

                {isSearching && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1">
                     <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                     <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                     <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex-grow animate-in fade-in duration-300">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ArrowUpDown className="h-4 w-4 text-subtext" />
                </div>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="block w-full pl-10 pr-8 py-2 bg-surface border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                >
                  <option value="date_desc">Recently Added</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="rating_desc">Highest Rated</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={handleWatchlistToggle}
               className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                 showWatchlist 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-surface border-white/10 hover:bg-white/5 text-subtext hover:text-white'
               }`}
             >
               <Bookmark className={`w-3 h-3 ${showWatchlist ? 'fill-white' : ''}`} />
               <span>Watchlist {watchlist.length > 0 && `(${watchlist.length})`}</span>
             </button>

             {/* Auth Button */}
             <div className="relative">
               <button
                 onClick={() => user ? setShowUserMenu(!showUserMenu) : setIsAuthModalOpen(true)}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    user 
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                      : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                 }`}
               >
                 <User className="w-3 h-3" />
                 <span className="max-w-[100px] truncate">{user ? (user.name || user.email.split('@')[0]) : 'Sign In'}</span>
               </button>

               {/* User Dropdown */}
               {showUserMenu && user && (
                 <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
                   <div className="p-3 border-b border-white/5">
                     <p className="text-xs text-subtext font-medium">Signed in as</p>
                     <p className="text-xs font-bold text-white truncate">{user.email}</p>
                   </div>
                   <button 
                     onClick={handleLogout}
                     className="w-full flex items-center gap-2 px-4 py-3 text-xs text-red-400 hover:bg-white/5 transition-colors text-left"
                   >
                     <LogOut className="w-3 h-3" />
                     Sign Out
                   </button>
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {!showWatchlist && showFilters && (
          <div className="container mx-auto px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="relative p-4 bg-surface/50 border border-white/5 rounded-2xl flex flex-wrap gap-4 items-end">
              
              {/* Close Filters Button */}
              <button 
                onClick={() => setShowFilters(false)}
                className="absolute top-2 right-2 p-1 text-subtext hover:text-white transition-colors hover:bg-white/5 rounded-full"
                title="Close filters"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-subtext px-1">Type</label>
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
                  <button 
                    onClick={() => setFilterType('movie')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${filterType === 'movie' ? 'bg-primary text-white' : 'text-subtext hover:text-white'}`}
                  >
                    Movies
                  </button>
                  <button 
                    onClick={() => setFilterType('tv')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${filterType === 'tv' ? 'bg-primary text-white' : 'text-subtext hover:text-white'}`}
                  >
                    Series
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-subtext px-1">Genre</label>
                <select 
                  value={filters.genreId}
                  onChange={(e) => setFilters(f => ({ ...f, genreId: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary/50"
                >
                  <option value="all">All Genres</option>
                  {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[100px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-subtext px-1">Year</label>
                <input 
                  type="number"
                  placeholder="e.g. 2024"
                  value={filters.year}
                  onChange={(e) => setFilters(f => ({ ...f, year: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary/50 w-24"
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-[120px]">
                <label className="text-[10px] uppercase tracking-widest font-bold text-subtext px-1">Min Rating</label>
                <select 
                  value={filters.minRating}
                  onChange={(e) => setFilters(f => ({ ...f, minRating: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary/50"
                >
                  <option value="">Any</option>
                  <option value="8">8+ ⭐ Highly Rated</option>
                  <option value="7">7+ ⭐ Good</option>
                  <option value="6">6+ ⭐ Decent</option>
                  <option value="5">5+ ⭐ Average</option>
                </select>
              </div>

              <button 
                onClick={resetFilters}
                className="ml-auto text-xs text-subtext hover:text-primary underline px-2 py-1.5"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {pageTitle}
              {activeResults.length > 0 && !showWatchlist && pageTitle !== 'Trending Now' && (
                <span className="text-sm font-normal text-subtext bg-white/5 px-2 py-0.5 rounded">
                  {activeResults.length} items
                </span>
              )}
            </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {activeResults.map((item) => (
            <MediaCard 
              key={`${item.media_type}-${item.id}`} 
              item={item} 
              onClick={handleMediaClick} 
              isInWatchlist={watchlist.some(w => w.id === item.id)}
              onToggleWatchlist={toggleWatchlist}
            />
          ))}
          
          {activeResults.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-subtext animate-in fade-in duration-500">
               <Info className="w-12 h-12 mb-4 opacity-50" />
               <p className="text-lg">
                 {showWatchlist 
                   ? "Your watchlist is empty." 
                   : (isSearching ? "Finding the best matches..." : "No matches found for your criteria.")
                 }
               </p>
               {(showWatchlist || results.length > 0 || filters.genreId !== 'all') && (
                 <button 
                   onClick={() => {
                     setShowWatchlist(false);
                     setSearchQuery('');
                     resetFilters();
                   }} 
                   className="mt-4 text-primary hover:underline font-medium"
                 >
                   Back to Trending
                 </button>
               )}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-white/5 bg-surface py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-subtext">
            <p>&copy; {new Date().getFullYear()} Client-Side-Movie-Series-Search</p>
            <p className="text-xs mt-1 opacity-70">We don't host any Content, all content is provided by non-affiliated third parties.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="https://github.com/craeckor/client-side-movies-series-search/tree/beta" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-subtext hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>

      <Player 
        playerState={playerState} 
        onClose={closePlayer} 
        onUpdateState={updatePlayerState}
      />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={(u) => setUser(u)} 
      />
    </div>
  );
};

export default App;