// "카카오톡으로 보내기": Kakao JavaScript SDK share, loaded only when the visitor taps the button.
// It opens KakaoTalk's own friend/chat picker, also inside KakaoTalk's in-app browser where the
// system share sheet (navigator.share) is not available.
//
// Uses the JavaScript key of the Kakao Developers app "올해 첫 곡은 뭐양" (ID 1661348). A JavaScript
// key is public by design (it ships in every page) and only works on the site domains registered
// for it in the app, so it lives here. NEXT_PUBLIC_KAKAO_JS_KEY overrides it; an empty value hides
// the button.

const DEFAULT_KAKAO_JS_KEY = "f90564b686d25f2911dd28dace8223aa";
export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? DEFAULT_KAKAO_JS_KEY;
const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.6/kakao.min.js";
const TIMEOUT_MS = 8000;

interface KakaoLink {
  mobileWebUrl: string;
  webUrl: string;
}

export interface KakaoFeed {
  objectType: "feed";
  content: { title: string; description: string; imageUrl: string; imageWidth?: number; imageHeight?: number; link: KakaoLink };
  buttons?: { title: string; link: KakaoLink }[];
}

interface KakaoSdk {
  init(key: string): void;
  isInitialized(): boolean;
  /** Only present after init() (SDK 2.x adds its modules on init). */
  Share?: { sendDefault(feed: KakaoFeed): void };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export const kakaoShareAvailable = () => KAKAO_JS_KEY.length > 0;

let loading: Promise<KakaoSdk> | null = null;

function loadSdk(): Promise<KakaoSdk> {
  if (window.Kakao?.init) return Promise.resolve(window.Kakao);
  if (loading) return loading;
  loading = new Promise<KakaoSdk>((resolve, reject) => {
    const fail = (reason: string) => {
      loading = null;
      reject(new Error(reason));
    };
    const timer = setTimeout(() => fail("Kakao SDK timed out"), TIMEOUT_MS);
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      clearTimeout(timer);
      if (window.Kakao?.init) resolve(window.Kakao);
      else fail("Kakao SDK missing");
    };
    script.onerror = () => {
      clearTimeout(timer);
      fail("Kakao SDK failed to load");
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Builds the KakaoTalk card: sender + song as the title, the message as the description. */
export function kakaoFeed(opts: { url: string; imageUrl: string; songTitle: string; from: string; message: string }): KakaoFeed {
  const link = { mobileWebUrl: opts.url, webUrl: opts.url };
  return {
    objectType: "feed",
    content: {
      title: `${opts.from ? `${opts.from}님` : "친구"}의 2027 새해 첫 곡은 「${opts.songTitle}」`,
      description: opts.message || "너도 복주머니를 열어 올해 첫 곡을 받아 봐!",
      imageUrl: opts.imageUrl,
      imageWidth: 1200,
      imageHeight: 630,
      link,
    },
    buttons: [{ title: "첫 곡 확인하기", link }],
  };
}

/** Loads and initialises the SDK ahead of the tap (call when the share dialog opens). */
export async function prepareKakao(): Promise<void> {
  if (!KAKAO_JS_KEY) throw new Error("Kakao key missing");
  const Kakao = await loadSdk();
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);
  if (!Kakao.Share) throw new Error("Kakao share unavailable");
}

/**
 * Opens KakaoTalk's share picker. When the SDK is already prepared this runs synchronously inside
 * the tap, so browsers that only allow pop-ups straight from a click (Safari) still open it.
 */
export function sendKakaoShare(feed: KakaoFeed): Promise<void> {
  const ready = window.Kakao?.isInitialized() ? window.Kakao.Share : undefined;
  if (ready) {
    try {
      ready.sendDefault(feed);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return prepareKakao().then(() => window.Kakao!.Share!.sendDefault(feed));
}
