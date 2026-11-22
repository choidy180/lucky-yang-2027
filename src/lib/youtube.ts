// Loads the official YouTube IFrame Player API on demand (only after the visitor asks to listen).
// Typed for just the calls PlayerDialog uses.

export interface YTPlayer {
  playVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getPlayerState(): number;
  destroy(): void;
}

export interface YTEvent {
  target: YTPlayer;
  data: number;
}

export interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      /** omitted when attaching to an existing embed iframe (enablejsapi=1) */
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: (e: YTEvent) => void; onStateChange?: (e: YTEvent) => void; onError?: (e: YTEvent) => void };
    },
  ) => YTPlayer;
  PlayerState: { UNSTARTED: -1; ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_URL = "https://www.youtube.com/iframe_api";
const TIMEOUT_MS = 8000;
let loading: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YTNamespace>((resolve, reject) => {
    const fail = (reason: string) => {
      loading = null;
      reject(new Error(reason));
    };
    const timer = setTimeout(() => fail("YouTube API timed out"), TIMEOUT_MS);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else fail("YouTube API missing");
    };
    const script = document.createElement("script");
    script.src = API_URL;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      fail("YouTube API failed to load");
    };
    document.head.appendChild(script);
  });
  return loading;
}
