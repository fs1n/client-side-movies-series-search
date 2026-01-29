import React from 'react';
import { MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';
import { Play, Star, Heart } from 'lucide-react';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (item: MediaItem) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, onClick, isInWatchlist, onToggleWatchlist }) => {
  const title = item.title || item.name || 'Unknown Title';
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'NR';

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWatchlist) {
      onToggleWatchlist(item);
    }
  };

  return (
    <div 
      className="group relative flex flex-col gap-3 cursor-pointer"
      onClick={() => onClick(item)}
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface shadow-lg border border-white/5 transition-all duration-500 ease-out will-change-transform group-hover:scale-[1.04] group-hover:-translate-y-3 group-hover:shadow-2xl group-hover:shadow-primary/25 group-hover:border-primary/30">
        {item.poster_path ? (
          <img 
            src={`${IMAGE_BASE_URL}${item.poster_path}`} 
            alt={title} 
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
            decoding="async"
            width="500"
            height="750"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface text-subtext">
            No Image
          </div>
        )}
        
        {/* Play Icon Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
           <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform duration-500 ease-out shadow-xl shadow-primary/40">
             <Play className="w-6 h-6 text-white fill-white ml-1" />
           </div>
        </div>

        {/* Watchlist Button - Floating */}
        <button
          onClick={handleWatchlistClick}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-lg transition-all duration-300 z-20 border border-white/10 ${
            isInWatchlist
              ? 'bg-primary text-white opacity-100 shadow-lg shadow-primary/30'
              : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-primary hover:border-primary'
          }`}
          title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
        >
          <Heart className={`w-4 h-4 transition-transform duration-300 ${isInWatchlist ? 'fill-current scale-110' : 'group-hover/btn:scale-110'}`} />
        </button>

        {/* Rating Badge */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-yellow-400 flex items-center gap-1.5 border border-white/10 shadow-lg">
          <Star className="w-3 h-3 fill-yellow-400" />
          {rating}
        </div>
      </div>

      {/* Info section - Subtle fade/move up on hover */}
      <div className="flex flex-col gap-1 px-1 transition-transform duration-500 group-hover:translate-x-1">
        <h3 className="font-bold text-white leading-tight truncate group-hover:text-primary transition-colors text-sm md:text-base" title={title}>
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-subtext">{year}</span>
          <span className="w-1 h-1 rounded-full bg-subtext/30"></span>
          <span className="text-[10px] font-bold text-subtext uppercase tracking-tighter">{item.media_type}</span>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;