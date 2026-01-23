declare module 'react-player' {
  import { Component } from 'react';

  interface ReactPlayerProps {
    url?: string | string[] | MediaStream;
    playing?: boolean;
    loop?: boolean;
    controls?: boolean;
    volume?: number;
    muted?: boolean;
    playbackRate?: number;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    progressInterval?: number;
    playsinline?: boolean;
    pip?: boolean;
    stopOnUnmount?: boolean;
    light?: boolean | string;
    fallback?: React.ReactNode;
    wrapper?: React.ComponentType<{ children: React.ReactNode }>;
    playIcon?: React.ReactNode;
    previewTabIndex?: number;
    config?: {
      youtube?: object;
      facebook?: object;
      soundcloud?: object;
      vimeo?: object;
      file?: {
        attributes?: object;
        forceVideo?: boolean;
        forceAudio?: boolean;
        forceHLS?: boolean;
        forceDASH?: boolean;
        hlsOptions?: object;
        hlsVersion?: string;
        dashVersion?: string;
      };
    };
    onReady?: (player: ReactPlayer) => void;
    onStart?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    onBuffer?: () => void;
    onBufferEnd?: () => void;
    onEnded?: () => void;
    onError?: (error: Error) => void;
    onDuration?: (duration: number) => void;
    onSeek?: (seconds: number) => void;
    onProgress?: (state: {
      played: number;
      playedSeconds: number;
      loaded: number;
      loadedSeconds: number;
    }) => void;
    onClickPreview?: (event: React.MouseEvent) => void;
    onEnablePIP?: () => void;
    onDisablePIP?: () => void;
    ref?: React.Ref<ReactPlayer>;
  }

  export default class ReactPlayer extends Component<ReactPlayerProps> {
    static canPlay(url: string): boolean;
    static canEnablePIP(url: string): boolean;
    static addCustomPlayer(player: object): void;
    static removeCustomPlayers(): void;
    seekTo(amount: number, type?: 'seconds' | 'fraction'): void;
    getCurrentTime(): number;
    getSecondsLoaded(): number;
    getDuration(): number;
    getInternalPlayer(key?: string): object;
    showPreview(): void;
  }
}
