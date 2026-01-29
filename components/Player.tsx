
import React, { useState, useEffect, useRef } from 'react';
import { PlayerState } from '../types';
import { HOSTS } from '../constants';
import { X, Maximize, ChevronLeft, ChevronRight, MonitorPlay, Film, Tv, AlertCircle, RefreshCcw, HelpCircle, Clapperboard } from 'lucide-react';

interface PlayerProps {
  playerState: PlayerState;
  onClose: () => void;
  onUpdateState: (newState: Partial<PlayerState>) => void;
}

const Player: React.FC<PlayerProps> = ({ playerState, onClose, onUpdateState }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasTimeout, setHasTimeout] = useState(false);
  const loadTimeoutRef = useRef<number | null>(null);

  // Construct URL and handle timeout logic
  useEffect(() => {
    const host = HOSTS.find(h => h.id === playerState.host);
    if (host && playerState.mediaId) {
      setIsLoading(true);
      setHasTimeout(false);
      
      const newUrl = playerState.mediaType === 'tv'
        ? host.urlTemplate(playerState.mediaId, playerState.season, playerState.episode)
        : host.urlTemplate(playerState.mediaId);
      
      setUrl(newUrl);

      // Clear existing timeout
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);

      // Set a 15-second timeout to check if loading is stuck
      loadTimeoutRef.current = window.setTimeout(() => {
        if (isLoading) {
          setHasTimeout(true);
        }
      }, 15000);
    }

    return () => {
      if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
    };
  }, [playerState.host, playerState.mediaId, playerState.season, playerState.episode, playerState.mediaType]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasTimeout(false);
    if (loadTimeoutRef.current) window.clearTimeout(loadTimeoutRef.current);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const changeSeason = (delta: number) => {
    const newSeason = Math.max(1, playerState.season + delta);
    onUpdateState({ season: newSeason, episode: 1 });
  };

  const changeEpisode = (delta: number) => {
    const newEpisode = Math.max(1, playerState.episode + delta);
    onUpdateState({ episode: newEpisode });
  };

  const retryStream = () => {
    const currentUrl = url;
    setUrl('');
    setTimeout(() => setUrl(currentUrl), 50);
    setIsLoading(true);
    setHasTimeout(false);
  };

  if (!playerState.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div 
        ref={containerRef}
        className="relative w-full max-w-6xl bg-surface rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/10"
        style={{ height: '85vh' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-primary/10 rounded-lg">
              {playerState.mediaType === 'movie' ? <Film className="w-5 h-5 text-primary" /> : <Tv className="w-5 h-5 text-primary" />}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base md:text-lg truncate text-white leading-tight">{playerState.title}</span>
              {playerState.mediaType === 'tv' && (
                <span className="text-[10px] text-subtext uppercase tracking-widest font-bold">
                  Season {playerState.season} • Episode {playerState.episode}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-white/10 rounded-full transition-all duration-200 text-white/70 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Iframe Area */}
        <div className="flex-1 relative bg-black group/player">
          {/* Enhanced Loading & Error State Overlay */}
          {(isLoading || hasTimeout) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0f1014] p-6 text-center">
               {!hasTimeout ? (
                 <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="relative flex items-center justify-center mb-6">
                        <div className="absolute w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <Clapperboard className="w-6 h-6 text-primary/50" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Connecting to Source</h3>
                    <p className="text-sm text-subtext max-w-xs leading-relaxed">
                      Please wait while we establish a secure connection to <span className="text-primary font-mono">{HOSTS.find(h => h.id === playerState.host)?.name}</span>...
                    </p>
                    
                    {/* Source Hints */}
                    <div className="mt-8 flex gap-1 justify-center">
                       <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                       <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                       <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500 max-w-md">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                       <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Stream is taking a while...</h3>
                    <p className="text-sm text-subtext mb-8 leading-relaxed">
                      The selected source might be under heavy load or blocked. We recommend trying a different host or refreshing.
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-3">
                       <button 
                         onClick={retryStream}
                         className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-semibold transition-all border border-white/10"
                       >
                         <RefreshCcw className="w-4 h-4" />
                         Retry Current Source
                       </button>
                       <div className="w-full sm:w-auto h-px sm:h-8 bg-white/5"></div>
                       <p className="text-xs text-primary font-bold uppercase tracking-widest animate-pulse">
                         Try another source below ↓
                       </p>
                    </div>
                 </div>
               )}
            </div>
          )}
          
          <iframe 
            ref={iframeRef}
            src={url} 
            className={`w-full h-full border-0 transition-opacity duration-1000 ease-in-out ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            onLoad={handleIframeLoad}
          />
        </div>

        {/* Controls Bar */}
        <div className="bg-surface/80 backdrop-blur-md border-t border-white/5 p-4 md:p-6 flex flex-col md:flex-row gap-6 justify-between items-center">
          
          {/* Host Selector */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
              <MonitorPlay className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col flex-grow">
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-[10px] text-subtext uppercase tracking-[0.2em] font-black">Streaming Source</label>
                <div className="group relative">
                  <HelpCircle className="w-3 h-3 text-subtext/50 hover:text-primary transition-colors cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 shadow-2xl z-50">
                    Switch sources if the video doesn't play or is slow.
                  </div>
                </div>
              </div>
              <select 
                value={playerState.host}
                onChange={(e) => onUpdateState({ host: e.target.value })}
                className="bg-black/60 border border-white/10 text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all min-w-[180px] hover:bg-black/80 cursor-pointer"
              >
                {HOSTS.map(host => (
                  <option key={host.id} value={host.id}>{host.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TV Controls */}
          {playerState.mediaType === 'tv' && (
            <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5 shadow-inner">
              <div className="flex items-center gap-1 px-2">
                <button 
                  onClick={() => changeSeason(-1)} 
                  className="p-2 hover:bg-white/10 rounded-lg text-subtext hover:text-white transition-all active:scale-95 disabled:opacity-30"
                  disabled={playerState.season <= 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[9px] uppercase font-black text-subtext/60 mb-0.5">Season</span>
                  <span className="text-sm font-bold text-white tabular-nums">{playerState.season}</span>
                </div>
                <button 
                  onClick={() => changeSeason(1)} 
                  className="p-2 hover:bg-white/10 rounded-lg text-subtext hover:text-white transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="w-px h-10 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-1 px-2">
                <button 
                  onClick={() => changeEpisode(-1)} 
                  className="p-2 hover:bg-white/10 rounded-lg text-subtext hover:text-white transition-all active:scale-95 disabled:opacity-30"
                  disabled={playerState.episode <= 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-[9px] uppercase font-black text-subtext/60 mb-0.5">Episode</span>
                  <span className="text-sm font-bold text-white tabular-nums">{playerState.episode}</span>
                </div>
                <button 
                  onClick={() => changeEpisode(1)} 
                  className="p-2 hover:bg-white/10 rounded-lg text-subtext hover:text-white transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
            <button 
              onClick={toggleFullscreen}
              className="flex items-center gap-2.5 px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-full text-sm font-semibold transition-all border border-white/10 hover:border-white/20 text-white"
            >
              <Maximize className="w-4 h-4" />
              <span>Theater Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
