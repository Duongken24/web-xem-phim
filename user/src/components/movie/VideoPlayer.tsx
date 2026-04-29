import React, { useEffect, useMemo, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './VideoPlayer.css';

interface VideoPlayerProps {
  url: string;
  title?: string;
  mimeType?: string | null;
  onProgress?: (progress: { played: number; playedSeconds: number }) => void;
  onEnded?: () => void;
  onPause?: (state: { played: number; playedSeconds: number; duration: number }) => void;
  onDuration?: (duration: number) => void;
  initialProgress?: number;
  autoPlay?: boolean;
}

function inferSourceType(url: string) {
  if (/\.m3u8($|\?)/i.test(url)) return 'application/x-mpegURL';
  if (/\.mpd($|\?)/i.test(url)) return 'application/dash+xml';
  if (/\.webm($|\?)/i.test(url)) return 'video/webm';
  return 'video/mp4';
}

const VjsButton = videojs.getComponent('Button');

class SeekBackward10Button extends VjsButton {
  constructor(player: ReturnType<typeof videojs>, options: Record<string, unknown> = {}) {
    super(player, options);
    (this as any).controlText('Tua lùi 10 giây');
  }

  handleClick() {
    const currentTime = this.player_.currentTime() ?? 0;
    this.player_.currentTime(Math.max(0, currentTime - 10));
    this.player_.userActive(true);
  }

  buildCSSClass() {
    return `vjs-seek-backward-10 ${super.buildCSSClass()}`;
  }

  createEl() {
    const el = super.createEl('button', {
      className: this.buildCSSClass(),
      type: 'button',
    });
    const label = document.createElement('span');
    label.className = 'vjs-seek-button-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = '-10';
    el.appendChild(label);
    return el;
  }
}

class SeekForward10Button extends VjsButton {
  constructor(player: ReturnType<typeof videojs>, options: Record<string, unknown> = {}) {
    super(player, options);
    (this as any).controlText('Tua tới 10 giây');
  }

  handleClick() {
    const currentTime = this.player_.currentTime() ?? 0;
    const duration = this.player_.duration() ?? currentTime;
    this.player_.currentTime(Math.min(duration, currentTime + 10));
    this.player_.userActive(true);
  }

  buildCSSClass() {
    return `vjs-seek-forward-10 ${super.buildCSSClass()}`;
  }

  createEl() {
    const el = super.createEl('button', {
      className: this.buildCSSClass(),
      type: 'button',
    });
    const label = document.createElement('span');
    label.className = 'vjs-seek-button-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = '+10';
    el.appendChild(label);
    return el;
  }
}

if (!videojs.getComponent('SeekBackward10Button')) {
  videojs.registerComponent('SeekBackward10Button', SeekBackward10Button);
}

if (!videojs.getComponent('SeekForward10Button')) {
  videojs.registerComponent('SeekForward10Button', SeekForward10Button);
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title,
  mimeType,
  onProgress,
  onEnded,
  onPause,
  onDuration,
  initialProgress = 0,
  autoPlay = false,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const pendingSeekRatioRef = useRef<number>(initialProgress);
  const suppressPauseRef = useRef(true);
  const autoPlayRef = useRef(autoPlay);
  const callbacksRef = useRef({ onProgress, onEnded, onPause, onDuration });
  const [playerError, setPlayerError] = useState<string | null>(null);

  const sourceType = useMemo(() => mimeType || inferSourceType(url), [mimeType, url]);

  useEffect(() => {
    pendingSeekRatioRef.current = initialProgress;
  }, [initialProgress, url]);

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    callbacksRef.current = { onProgress, onEnded, onPause, onDuration };
  }, [onProgress, onEnded, onPause, onDuration]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || playerRef.current) return;

    const videoElement = document.createElement('video-js');
    videoElement.className = 'video-js vjs-big-play-centered niephim-video-js h-full w-full';
    videoElement.setAttribute('playsinline', 'true');
    host.appendChild(videoElement);

    const player = videojs(videoElement, {
      autoplay: false,
      controls: true,
      preload: 'auto',
      responsive: true,
      fluid: true,
      playsinline: true,
      inactivityTimeout: 2000,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      controlBar: {
        volumePanel: {
          inline: false,
        },
        pictureInPictureToggle: true,
      },
      userActions: {
        hotkeys: true,
      },
      html5: {
        vhs: {
          overrideNative: true,
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      sources: [{ src: url, type: sourceType }],
    });

    const controlBar = player.getChild('controlBar');
    controlBar?.addChild('SeekBackward10Button', {}, 1);
    controlBar?.addChild('SeekForward10Button', {}, 3);

    const playToggle = controlBar?.getChild('playToggle') as any;
    playToggle?.controlText('Phát');
    (player as any).bigPlayButton?.controlText('Phát video');

    const emitProgress = () => {
      const duration = player.duration() ?? 0;
      const playedSeconds = player.currentTime() ?? 0;
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(playedSeconds)) return;

      callbacksRef.current.onProgress?.({
        played: playedSeconds / duration,
        playedSeconds,
      });
    };

    const emitDuration = () => {
      const duration = player.duration() ?? 0;
      if (Number.isFinite(duration) && duration > 0) {
        callbacksRef.current.onDuration?.(duration);
      }
    };

    const applyPendingSeek = () => {
      const duration = player.duration() ?? 0;
      const ratio = pendingSeekRatioRef.current;
      if (!Number.isFinite(duration) || duration <= 0 || ratio <= 0) return;

      const nextTime = Math.min(duration - 1, Math.max(0, duration * ratio));
      player.currentTime(nextTime);
      pendingSeekRatioRef.current = 0;
    };

    player.on('loadedmetadata', () => {
      emitDuration();
      applyPendingSeek();
      if (!autoPlayRef.current) {
        suppressPauseRef.current = false;
      }
    });
    player.on('durationchange', emitDuration);
    player.on('timeupdate', emitProgress);
    player.on('play', () => {
      suppressPauseRef.current = false;
      player.userActive(true);
      playToggle?.controlText('Tạm dừng');
    });
    player.on('pause', () => {
      if (suppressPauseRef.current) return;

      playToggle?.controlText('Phát');

      const duration = player.duration() ?? 0;
      const playedSeconds = player.currentTime() ?? 0;
      callbacksRef.current.onPause?.({
        played: Number.isFinite(duration) && duration > 0 ? playedSeconds / duration : 0,
        playedSeconds,
        duration: Number.isFinite(duration) ? duration : 0,
      });
    });
    player.on('ended', () => {
      callbacksRef.current.onEnded?.();
    });
    player.on('error', () => {
      const error = player.error();
      const message = error?.message || 'Khong the tai nguon phat video.';
      console.error('[VideoPlayer] video.js error:', error);
      setPlayerError(message);
    });

    playerRef.current = player;

    return () => {
      if (!player.isDisposed()) {
        player.dispose();
      }
      playerRef.current = null;
      if (host.contains(videoElement)) {
        host.removeChild(videoElement);
      }
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    setPlayerError(null);
    suppressPauseRef.current = true;
    pendingSeekRatioRef.current = initialProgress;
    player.autoplay(false);
    player.src({ src: url, type: sourceType });
    player.load();

    if (autoPlay) {
      const playResult = player.play();
      if (playResult && typeof playResult.catch === 'function') {
        void playResult.catch(() => {
          player.pause();
          player.userActive(true);
        });
      }
    }
  }, [autoPlay, initialProgress, sourceType, url]);

  return (
    <div className="niephim-video-shell relative h-full min-h-[320px] w-full overflow-hidden bg-black">
      {title && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 via-black/35 to-transparent px-5 py-4">
          <h2 className="line-clamp-1 text-sm font-semibold text-white md:text-base">{title}</h2>
        </div>
      )}
      <div data-vjs-player ref={hostRef} className="h-full w-full" />
      {playerError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-red-300">Khong tai duoc video</p>
            <p className="mt-2 text-xs leading-6 text-slate-300">{playerError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
