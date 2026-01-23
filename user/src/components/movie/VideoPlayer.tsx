import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactPlayer from 'react-player';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  title?: string;
  onProgress?: (progress: { played: number; playedSeconds: number }) => void;
  onEnded?: () => void;
  initialProgress?: number;
}

interface ProgressState {
  played: number;
  playedSeconds: number;
  loaded: number;
  loadedSeconds: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title,
  onProgress,
  onEnded,
  initialProgress = 0,
}) => {
  const playerRef = useRef<ReactPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [seeking, setSeeking] = useState(false);

  const qualityOptions = ['Auto', '1080p', '720p', '480p', '360p'];
  const [selectedQuality, setSelectedQuality] = useState('Auto');

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    if (initialProgress > 0 && playerRef.current) {
      playerRef.current.seekTo(initialProgress);
    }
  }, [initialProgress]);

  const handleSkipBackward = useCallback(() => {
    if (duration > 0) {
      const newTime = Math.max(0, played - 10 / duration);
      playerRef.current?.seekTo(newTime);
      setPlayed(newTime);
    }
  }, [played, duration]);

  const handleSkipForward = useCallback(() => {
    if (duration > 0) {
      const newTime = Math.min(1, played + 10 / duration);
      playerRef.current?.seekTo(newTime);
      setPlayed(newTime);
    }
  }, [played, duration]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          setPlaying((prev) => !prev);
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSkipBackward();
          break;
        case 'arrowright':
          e.preventDefault();
          handleSkipForward();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.1));
          setMuted(false);
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.1));
          break;
        case 'm':
          e.preventDefault();
          setMuted((prev) => !prev);
          break;
        case 'f':
          e.preventDefault();
          handleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkipBackward, handleSkipForward, handleFullscreen]);

  const handleProgress = (state: ProgressState) => {
    if (!seeking) {
      setPlayed(state.played);
      onProgress?.({ played: state.played, playedSeconds: state.playedSeconds });
    }
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    const target = e.target as HTMLInputElement;
    playerRef.current?.seekTo(parseFloat(target.value));
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full h-full min-h-[300px] group"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        playing={playing}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        onProgress={handleProgress}
        onDuration={setDuration}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      />

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <button
            onClick={() => setPlaying(true)}
            className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition"
          >
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </button>
        </div>
      )}

      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent">
          <h2 className="text-white text-lg font-semibold">{title}</h2>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={0.999999}
            step="any"
            value={played}
            onMouseDown={handleSeekMouseDown}
            onChange={handleSeekChange}
            onMouseUp={handleSeekMouseUp}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600"
            style={{
              background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${
                played * 100
              }%, #4b5563 ${played * 100}%, #4b5563 100%)`,
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setPlaying(!playing)}
              className="text-white hover:text-red-500 transition"
            >
              {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            <button
              onClick={handleSkipBackward}
              className="text-white hover:text-red-500 transition"
              title="Lùi 10 giây (←)"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={handleSkipForward}
              className="text-white hover:text-red-500 transition"
              title="Tua 10 giây (→)"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 group/volume">
              <button
                onClick={() => setMuted(!muted)}
                className="text-white hover:text-red-500 transition"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setMuted(false);
                }}
                className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>

            <div className="text-white text-sm">
              {formatTime(played * duration)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:text-red-500 transition"
              >
                <Settings className="w-5 h-5" />
              </button>

              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-lg p-4 w-48">
                  <div className="mb-4">
                    <div className="text-white text-sm font-semibold mb-2">Tốc độ</div>
                    <div className="flex flex-wrap gap-2">
                      {speedOptions.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            setPlaybackRate(speed);
                            setShowSettings(false);
                          }}
                          className={`px-2 py-1 rounded text-sm ${
                            playbackRate === speed
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-white text-sm font-semibold mb-2">Chất lượng</div>
                    <div className="space-y-1">
                      {qualityOptions.map((quality) => (
                        <button
                          key={quality}
                          onClick={() => {
                            setSelectedQuality(quality);
                            setShowSettings(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-sm ${
                            selectedQuality === quality
                              ? 'bg-red-600 text-white'
                              : 'text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleFullscreen}
              className="text-white hover:text-red-500 transition"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
