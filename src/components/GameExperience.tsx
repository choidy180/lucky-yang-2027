"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import styled, { css } from "styled-components";
import { GameEngine } from "@/game/engine";
import { playBlip, playDing, playOpen, unlockAudio } from "@/game/sfx";
import { findHope, type HopeKey } from "@/data/hopes";
import { prefersReducedMotion, wait } from "@/lib/motion";
import { readLastDraw, rememberDraw, validateDraw } from "@/lib/storage";
import { saveTicket } from "@/lib/ticket";
import { NAME_MAX_LENGTH, normalizeName, type EventState, type Song, type StoredDraw, type Ticket } from "@/lib/types";
import { DESKTOP, MOBILE, colors } from "@/styles/global";
import DialogBox, { Dock, SpeechBubble } from "./DialogBox";
import HopePicker from "./HopePicker";
import { FindHint, Narration } from "./Narration";
import HelpDialog from "./HelpDialog";
import PlayerDialog from "./PlayerDialog";
import ResultWindow from "./ResultWindow";
import ShareDialog from "./ShareDialog";
import TitleBanner from "./TitleBanner";
import { PixelButton } from "./pixel";

// ---------------------------------------------------------------------------
// Layout

const Stage = styled.main`
  position: fixed;
  inset: 0;
  overflow: hidden;
  /* first paint before the canvas draws: night sky over a dark meadow */
  background: linear-gradient(${colors.night} 0 58%, #2c295b 58% 66%, #21403d 66% 100%);
`;

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  touch-action: manipulation;
`;

const Hotspot = styled.button`
  position: absolute;
  z-index: 4;
  display: none;
  padding: 0;
  border: 0;
  background: transparent;

  &:disabled {
    cursor: default;
  }
`;

const Hud = styled.div`
  position: fixed;
  z-index: 20;
  top: calc(env(safe-area-inset-top) + 16px);
  left: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
  ${MOBILE} {
    top: calc(env(safe-area-inset-top) + 12px);
    left: 14px;
    right: 14px;
  }
`;

const Badge = styled.p<{ $crowded: boolean }>`
  ${({ $crowded }) =>
    $crowded &&
    css`
      ${MOBILE} {
        display: none !important;
      }
    `}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: rgba(19, 21, 50, 0.72);
  color: ${colors.cream};
  font-size: 12px;
  font-weight: 700;
  box-shadow:
    0 -3px 0 0 ${colors.cream},
    0 3px 0 0 ${colors.cream},
    -3px 0 0 0 ${colors.cream},
    3px 0 0 0 ${colors.cream};
  ${DESKTOP} {
    font-size: 18px;
  }
  span {
    color: ${colors.gold};
  }
  white-space: nowrap;
  @media (max-width: 379px) {
    display: none;
  }
`;

const HudButtons = styled.div`
  display: flex;
  gap: 16px;
  margin-left: auto;

  ${MOBILE} {
    gap: 10px;
    .arrows {
      display: none;
    }
  }
`;

const Form = styled.form`
  display: grid;
  gap: 8px;

  label {
    font-size: 12px;
    font-weight: 700;
    color: ${colors.muted};
    ${DESKTOP} {
      font-size: 18px;
    }
  }
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 18px;
  padding: 4px;

  input {
    flex: 1 1 160px;
    width: 100%;
    min-width: 0;
  }
`;

const NameInput = styled.input`
  min-height: 52px;
  padding: 8px 14px;
  border: 0;
  border-radius: 0;
  background: #fff;
  color: ${colors.ink};
  font-family: inherit;
  font-size: 24px;
  box-shadow:
    0 -4px 0 0 ${colors.ink},
    0 4px 0 0 ${colors.ink},
    -4px 0 0 0 ${colors.ink},
    4px 0 0 0 ${colors.ink},
    inset 0 4px 0 0 ${colors.paperShade};

  &::placeholder {
    color: #a8968a;
  }
  &:focus {
    outline: none;
    box-shadow:
      0 -4px 0 0 ${colors.red},
      0 4px 0 0 ${colors.red},
      -4px 0 0 0 ${colors.red},
      4px 0 0 0 ${colors.red},
      inset 0 4px 0 0 ${colors.paperShade};
  }
  &:disabled {
    background: #efe4d4;
    color: #8a7a6e;
  }
  ${MOBILE} {
    min-height: 48px;
    font-size: 18px;
  }
`;

const Note = styled.p`
  color: ${colors.muted};
  font-size: 12px;
  ${DESKTOP} {
    font-size: 18px;
  }
  button {
    margin-left: 8px;
    padding: 0 4px;
    border: 0;
    background: none;
    color: ${colors.wine};
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

/** Name step: the sheep's bubble, then the answer row right under it (no window around it). */
const NameStep = styled.div`
  display: grid;
  justify-items: center;
  gap: 18px;

  form {
    width: min(560px, 100%);
  }
  /* one row on every screen (input 160px+, "확인 ▶"); only the long closed/waiting labels wrap */
  form > div > button {
    flex: none;
  }
`;

const FloatNote = styled(Note)`
  display: table;
  margin: 2px auto 0;
  padding: 2px 10px;
  text-align: center;
  color: ${colors.cream};
  background: rgba(19, 21, 50, 0.78);
  button {
    color: ${colors.gold};
  }
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 18px;
  padding: 4px;
`;

const Toast = styled.div<{ $visible: boolean }>`
  position: fixed;
  z-index: 40;
  left: 50%;
  top: calc(env(safe-area-inset-top) + 70px);
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - 40px);
  padding: 8px 14px;
  background: ${colors.ink};
  color: ${colors.cream};
  font-size: 18px;
  text-align: center;
  pointer-events: none;
  box-shadow:
    0 -4px 0 0 ${colors.cream},
    0 4px 0 0 ${colors.cream},
    -4px 0 0 0 ${colors.cream},
    4px 0 0 0 ${colors.cream};
  ${({ $visible }) =>
    $visible
      ? css`
          opacity: 1;
          visibility: visible;
        `
      : css`
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s steps(2), visibility 0s linear 0.2s;
        `}
`;

// ---------------------------------------------------------------------------
// State

type ServerStatus = { kind: "loading" } | { kind: "ready"; state: EventState } | { kind: "error" };
type ModalState = { kind: "player"; song: Song } | { kind: "help" } | { kind: "share"; ticket: Ticket } | null;
type IntroStage = "ready" | "playing" | "title" | "done";
type Step = "name" | "bag" | "result";
type FocusTarget = "speaker" | "input" | "hope" | "song";

const SHAKE_MS = 900;
const REVEAL_MS = 700;
const TOAST_MS = 2600;
const MAX_TIMEOUT = 2_147_483_000;
const SOUND_KEY = "lucky-yang:sound";

function isTicket(value: unknown, state: EventState): value is Ticket {
  if (typeof value !== "object" || value === null) return false;
  const name = (value as { name?: unknown }).name;
  return normalizeName(name) === name && validateDraw(value, state) !== null;
}

export default function GameExperience() {
  const [introStage, setIntroStage] = useState<IntroStage>("ready");
  /** The opening narration (click to advance) runs before the search for the red sheep. */
  const [narrating, setNarrating] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [step, setStep] = useState<Step>("name");
  const [status, setStatus] = useState<ServerStatus>({ kind: "loading" });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [hope, setHope] = useState<HopeKey | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState({ message: "", visible: false });
  const [focusRequest, setFocusRequest] = useState<{ target: FocusTarget; seq: number } | null>(null);
  const [instantText, setInstantText] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotspotRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const speakerRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstHopeRef = useRef<HTMLButtonElement>(null);
  const songTitleRef = useRef<HTMLHeadingElement>(null);

  // Mirrors for async handlers.
  const busyRef = useRef(false);
  const savingRef = useRef(false);
  const composingRef = useRef(false);
  const stateRef = useRef<EventState | null>(null);
  const nameRef = useRef("");
  const ticketRef = useRef<Ticket | null>(null);
  const stepRef = useRef<Step>("name");
  const introDoneRef = useRef(false);
  const reducedRef = useRef(false);
  const soundRef = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusSeq = useRef(0);

  const state = status.kind === "ready" ? status.state : null;
  const phase = state?.phase;
  const mode = state?.mode;

  const requestFocus = useCallback((target: FocusTarget) => {
    focusSeq.current += 1;
    setFocusRequest({ target, seq: focusSeq.current });
  }, []);

  useEffect(() => {
    if (!focusRequest) return;
    const el = { speaker: speakerRef, input: inputRef, hope: firstHopeRef, song: songTitleRef }[focusRequest.target].current;
    el?.focus({ preventScroll: true });
  }, [focusRequest]);

  const notify = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_MS);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const goStep = useCallback((next: Step) => {
    stepRef.current = next;
    setStep(next);
  }, []);

  const showTicket = useCallback((next: Ticket | null) => {
    ticketRef.current = next;
    setTicket(next);
  }, []);

  // --- sound ----------------------------------------------------------------

  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === "off") {
        soundRef.current = false;
        setSoundOn(false);
      }
    } catch {
      /* storage blocked: keep the default */
    }
  }, []);

  const toggleSound = () => {
    const next = !soundRef.current;
    soundRef.current = next;
    setSoundOn(next);
    if (next) unlockAudio();
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      /* this tab only */
    }
  };

  const sfx = useCallback((play: () => void) => {
    if (soundRef.current) play();
  }, []);

  // --- engine ---------------------------------------------------------------

  const endIntro = useCallback(() => {
    introDoneRef.current = true;
    setIntroStage("done");
    requestFocus(stepRef.current === "result" ? "song" : stepRef.current === "bag" ? "hope" : "speaker");
  }, [requestFocus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = prefersReducedMotion();
    reducedRef.current = reduced;
    setInstantText(reduced);
    let engine: GameEngine;
    try {
      engine = new GameEngine(
        canvas,
        {
          onFound: () => sfx(playDing),
          onTitle: () => setIntroStage((s) => (s === "playing" ? "title" : s)),
          onIntroEnd: endIntro,
        },
        { reducedMotion: reduced },
      );
    } catch {
      // No canvas support: go straight to the conversation.
      endIntro();
      return;
    }
    engine.attachHotspot(hotspotRef.current);
    engine.start();
    engineRef.current = engine;
    // Re-created after the opening (a dev hot reload): go straight back to the end scene.
    if (introDoneRef.current) {
      engine.skipIntro();
      if (stepRef.current === "bag") engine.setBag("idle");
      else if (stepRef.current === "result") engine.showOpenedBag();
      measureDock();
      measureTitle();
    }
    if (process.env.NODE_ENV !== "production") (window as unknown as { __luckyYang?: GameEngine }).__luckyYang = engine;
    return () => {
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [endIntro, sfx]); // measureDock / measureTitle are stable (declared below, no deps)

  // The camera keeps the red sheep clear of the dialog/result window, whatever its height.
  const dockObserver = useRef<ResizeObserver | null>(null);
  const dockEl = useRef<HTMLDivElement | null>(null);
  const measureDock = useCallback(() => {
    const el = dockEl.current;
    engineRef.current?.setBottomInset(el ? window.innerHeight - el.getBoundingClientRect().top : 0);
  }, []);
  const dockRef = useCallback(
    (el: HTMLDivElement | null) => {
      dockObserver.current?.disconnect();
      dockObserver.current = null;
      dockEl.current = el;
      if (el) {
        dockObserver.current = new ResizeObserver(measureDock);
        dockObserver.current.observe(el);
      }
      measureDock();
    },
    [measureDock],
  );
  useEffect(() => () => dockObserver.current?.disconnect(), []);

  // …and below the title (which shrinks after the name step).
  const titleEl = useRef<HTMLElement | null>(null);
  const titleObserver = useRef<ResizeObserver | null>(null);
  const measureTitle = useCallback(() => {
    const el = titleEl.current;
    engineRef.current?.setTopInset(el ? el.getBoundingClientRect().bottom : 0);
  }, []);
  const titleRef = useCallback(
    (el: HTMLElement | null) => {
      titleObserver.current?.disconnect();
      titleObserver.current = null;
      titleEl.current?.removeEventListener("transitionend", measureTitle);
      titleEl.current = el;
      if (el) {
        titleObserver.current = new ResizeObserver(measureTitle);
        titleObserver.current.observe(el);
        el.addEventListener("transitionend", measureTitle);
      }
      measureTitle();
    },
    [measureTitle],
  );
  useEffect(() => {
    const timer = setTimeout(measureTitle, 450); // after the shrink transition
    return () => clearTimeout(timer);
  }, [step, measureTitle]);
  useEffect(() => () => titleObserver.current?.disconnect(), []);

  const startedRef = useRef(false);

  /** The red sheep was found (tapped, or "못 찾겠어요"). The tap also lets the browser play sound. */
  const startIntro = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    unlockAudio();
    setIntroStage("playing");
    if (engineRef.current) engineRef.current.begin();
    else endIntro();
  }, [endIntro]);

  const skipIntro = useCallback(() => {
    if (introDoneRef.current) return;
    if (!startedRef.current) {
      startedRef.current = true;
      unlockAudio();
    }
    setInstantText(true);
    if (engineRef.current) engineRef.current.skipIntro();
    else endIntro();
  }, [endIntro]);

  // Narration handles Enter/Space itself. Searching: Enter/Space = "못 찾겠어요". Esc always skips.
  useEffect(() => {
    if (introStage === "done") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " " && event.key !== "Escape") return;
      if (event.target instanceof HTMLElement && event.target.closest("button")) return; // the button handles it
      if (narrating && event.key !== "Escape") return;
      event.preventDefault();
      if (introStage === "ready" && event.key !== "Escape") startIntro();
      else skipIntro();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [introStage, narrating, skipIntro, startIntro]);

  /** The narration finished: now the visitor looks for the red sheep (its hint timer starts here). */
  const endNarration = useCallback(() => {
    setNarrating(false);
    engineRef.current?.startSearch();
  }, []);

  const replayIntro = () => {
    if (busyRef.current) return;
    setModal(null);
    introDoneRef.current = false;
    startedRef.current = false;
    setInstantText(reducedRef.current);
    setIntroStage("ready");
    setNarrating(true);
    engineRef.current?.replayIntro();
  };

  /** Taps on the meadow: the red sheep starts the opening, a white sheep just hops. */
  const onCanvasPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    unlockAudio();
    if (narrating) return; // the narration layer takes the taps
    if (!startedRef.current) {
      const hit = engineRef.current?.handleTap(event.clientX, event.clientY) ?? "none";
      if (hit === "hero") startIntro();
      else if (hit === "sheep") sfx(playBlip);
    } else if (!introDoneRef.current) skipIntro();
  };

  // --- server state -----------------------------------------------------------

  const refresh = useCallback(async (): Promise<EventState | null> => {
    try {
      const res = await fetch("/api/event", { cache: "no-store" });
      if (!res.ok) throw new Error(`event ${res.status}`);
      const next = (await res.json()) as EventState;
      stateRef.current = next;
      setStatus({ kind: "ready", state: next });
      return next;
    } catch {
      setStatus((prev) => (prev.kind === "ready" ? prev : { kind: "error" }));
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Outside the open window: close the player and go back to the name step.
  useEffect(() => {
    if (!state || state.phase === "open") return;
    setModal(null);
    if (stepRef.current !== "name") {
      goStep("name");
      showTicket(null);
      engineRef.current?.setBag("hidden");
      engineRef.current?.setMood("idle");
    }
  }, [state, goStep, showTicket]);

  // Live mode: re-check once at the next boundary, never per second.
  useEffect(() => {
    if (!state || state.mode !== "live" || state.phase === "closed") return;
    const boundary = state.phase === "waiting" ? state.opensAt : state.closesAt;
    const delay = Math.min(MAX_TIMEOUT, Math.max(100, boundary - state.now + 50));
    const timer = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(timer);
  }, [state, refresh]);

  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === "visible" && stateRef.current?.mode === "live") void refresh();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) recheck();
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [refresh]);

  // --- name -----------------------------------------------------------------

  const submitName = useCallback(async () => {
    if (busyRef.current || !introDoneRef.current) return;
    const current = stateRef.current;
    if (!current || current.phase !== "open") return;
    const cleanName = normalizeName(nameRef.current);
    if (!cleanName) {
      requestFocus("input");
      return;
    }
    if (current.mode === "live") {
      const stored = ticketRef.current ?? readLastDraw("live", current);
      if (stored) {
        // One ticket per browser in live mode: confirm the window is still open, then show it again.
        busyRef.current = true;
        setBusy(true);
        try {
          const fresh = await refresh();
          if (!fresh) notify("이벤트 상태를 확인하지 못했어요. 한 번 더 눌러 주세요.");
          else if (fresh.phase === "open") {
            showTicket({ ...stored, name: cleanName });
            engineRef.current?.showOpenedBag();
            engineRef.current?.setMood("happy");
            goStep("result");
            requestFocus("song");
          }
        } finally {
          busyRef.current = false;
          setBusy(false);
        }
        return;
      }
    }
    goStep("bag");
    setHope(null);
    engineRef.current?.setBag("drop");
    requestFocus("hope");
  }, [goStep, notify, refresh, requestFocus, showTicket]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (composingRef.current) return;
    void submitName();
  };

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    nameRef.current = event.target.value;
    setName(event.target.value);
  };

  // The Enter that commits a Hangul syllable must not also submit.
  const onNameKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229 || composingRef.current)) {
      event.preventDefault();
    }
  };

  const changeName = () => {
    if (busyRef.current) return;
    goStep("name");
    engineRef.current?.setBag("hidden");
    requestFocus("input");
  };

  // --- bag --------------------------------------------------------------------

  const openBag = useCallback(async (hopeKey: HopeKey) => {
    if (busyRef.current || !introDoneRef.current) return;
    const current = stateRef.current;
    if (!current || current.phase !== "open") return;
    const cleanName = normalizeName(nameRef.current);
    if (!cleanName) return;
    if (current.mode === "live" && ticketRef.current) return;
    const engine = engineRef.current;
    const wasResult = stepRef.current === "result";

    busyRef.current = true;
    setBusy(true);
    setHope(hopeKey);
    engine?.setMood("idle");
    engine?.setBag("shake");
    try {
      const previous: StoredDraw | null = current.mode === "test" ? (ticketRef.current ?? readLastDraw("test", current)) : null;
      const query = previous ? `?${new URLSearchParams({ song: String(previous.songIndex), wish: String(previous.blessingIndex) })}` : "";
      const [res] = await Promise.all([
        fetch(`/api/draw${query}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cleanName, hope: hopeKey }),
          cache: "no-store",
        }),
        wait(reducedRef.current ? 0 : SHAKE_MS),
      ]);
      if (res.status === 403) {
        engine?.setBag("idle");
        await refresh();
        return;
      }
      if (!res.ok) throw new Error(`draw ${res.status}`);
      const data: unknown = await res.json();
      if (!isTicket(data, current)) throw new Error("unexpected draw response");
      rememberDraw(current.mode, data);
      engine?.setBag("open");
      engine?.setMood("happy");
      sfx(playOpen);
      await wait(reducedRef.current ? 0 : REVEAL_MS);
      showTicket(data);
      goStep("result");
      requestFocus("song");
    } catch {
      if (wasResult) {
        engine?.showOpenedBag();
        engine?.setMood("happy");
      } else {
        engine?.setBag("idle");
      }
      setHope(null);
      notify("복주머니를 열지 못했어요. 한 번 더 눌러 주세요.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [goStep, notify, refresh, requestFocus, sfx, showTicket]);

  /** Test mode: back to the bag to pick a (maybe different) wish; the next draw skips the last one. */
  const chooseAgain = () => {
    if (busyRef.current) return;
    goStep("bag");
    setHope(null);
    engineRef.current?.setBag("idle");
    engineRef.current?.setMood("idle");
    requestFocus("hope");
  };

  const onBagHotspot = () => {
    if (stepRef.current !== "bag" || busyRef.current) return;
    notify("먼저 내년 1순위 소망을 골라 줘!");
    requestFocus("hope");
  };

  // --- result -----------------------------------------------------------------

  const onListen = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.focus();
    const current = ticketRef.current;
    if (!current) return;
    if (stateRef.current?.phase !== "open") {
      notify("이벤트가 열리는 동안 들을 수 있어요.");
      return;
    }
    setModal({ kind: "player", song: current.song });
  };

  const onShare = () => {
    const current = ticketRef.current;
    if (current) setModal({ kind: "share", ticket: current });
  };

  const onSave = async () => {
    const current = ticketRef.current;
    if (!current || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await saveTicket(current);
      notify("티켓 이미지를 만들었어요.");
    } catch {
      notify("이미지를 저장할 수 없어요. 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // --- derived ------------------------------------------------------------------

  const introDone = introStage === "done";
  const validName = normalizeName(name) !== null;
  const canDraw = introDone && phase === "open" && !busy && validName;
  const cleanName = normalizeName(name) ?? "";

  let line: string;
  if (step === "bag") line = `${cleanName}! 좋은 이름이다양.\n내년에 가장 바라는 1순위 소망은 뭐야?`;
  else if (status.kind === "loading") line = "복주머니를 준비하고 있어…";
  else if (status.kind === "error") line = "앗, 서버에 연결하지 못했어.\n잠시 후에 다시 연결해 줘.";
  else if (phase === "waiting") line = "복주머니는 2027년 1월 1일에 열려양.\n그때 꼭 다시 와 줘!";
  else if (phase === "closed") line = "올해의 복주머니는 마감됐어양.\n내년에 또 만나!";
  else line = "어떤 이름으로 불러줄꺼양?";

  const submitLabel = busy
    ? "확인하는 중…"
    : phase === "waiting"
      ? "2027년 1월 1일에 열려요"
      : phase === "closed"
        ? "올해의 복주머니가 마감됐어요"
        : "확인 ▶";

  let note: ReactNode;
  if (status.kind === "error")
    note = (
      <>
        서버에 연결하지 못했어요.
        <button type="button" onClick={() => void refresh()}>
          다시 연결
        </button>
      </>
    );
  else if (phase === "open") note = mode === "test" ? "TEST MODE · 지금은 여러 번 열 수 있어요." : "한국시간 1월 1일, 단 하루 열려요.";
  else if (phase) note = "이벤트 기간 · 2027년 1월 1일 00:00–24:00 (한국시간)";
  else note = " ";

  return (
    <Stage>
      <Canvas
        ref={canvasRef}
        aria-hidden="true"
        onPointerDown={onCanvasPointer}
      />
      <p className="visually-hidden">새벽 초원에 수많은 양이 풀을 뜯고, 카메라가 그 사이에 숨은 붉은 양을 찾아내면 언덕 뒤로 붉은 해가 떠오릅니다.</p>
      <Hotspot
        ref={hotspotRef}
        type="button"
        aria-label="그림 속 복주머니 열기"
        tabIndex={-1}
        disabled={!(step === "bag" && canDraw)}
        onClick={onBagHotspot}
      />

      <Hud>
        <Badge $crowded={introDone}>
          <span aria-hidden="true">♪</span> 복주머니 레코드
        </Badge>
        {introDone ? (
          <HudButtons>
            <PixelButton type="button" $tone="night" $small onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? "소리 끄기" : "소리 켜기"}>
              {soundOn ? "♪ ON" : "♪ OFF"}
            </PixelButton>
            <PixelButton type="button" $tone="night" $small onClick={replayIntro} disabled={busy}>
              처음부터
            </PixelButton>
            <PixelButton
              type="button"
              $tone="night"
              $small
              aria-label="이용 방법"
              onClick={(event) => {
                event.currentTarget.focus();
                setModal({ kind: "help" });
              }}
            >
              ?
            </PixelButton>
          </HudButtons>
        ) : (
          <HudButtons>
            <PixelButton type="button" $tone="night" $small onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? "소리 끄기" : "소리 켜기"}>
              {soundOn ? "♪ ON" : "♪ OFF"}
            </PixelButton>
            <PixelButton type="button" $tone="night" $small onClick={skipIntro}>
              건너뛰기<span className="arrows" aria-hidden="true"> ▶▶</span>
            </PixelButton>
          </HudButtons>
        )}
      </Hud>

      {(introStage === "title" || introStage === "done") && <TitleBanner compact={step !== "name"} wrapRef={titleRef} />}

      {introStage === "ready" && narrating && <Narration instant={instantText} onDone={endNarration} onGesture={unlockAudio} />}

      {introStage === "ready" && !narrating && (
        <Dock ref={dockRef}>
          <FindHint onGiveUp={startIntro} />
        </Dock>
      )}

      {introDone && (
        <Dock ref={dockRef}>
          {step === "result" && ticket ? (
            <ResultWindow
              ticket={ticket}
              titleRef={songTitleRef}
              busy={busy}
              saving={saving}
              hopeLabel={findHope(ticket.hope)?.label ?? null}
              showRedraw={mode === "test"}
              canRedraw={canDraw}
              onListen={onListen}
              onSave={() => void onSave()}
              onShare={onShare}
              onRedraw={chooseAgain}
            />
          ) : step === "name" ? (
            <NameStep>
              <SpeechBubble speaker="붉은 양" text={line} instant={instantText} headingRef={speakerRef} />
              <Form onSubmit={onSubmit} noValidate aria-busy={busy}>
                <label htmlFor="visitorName" className="visually-hidden">
                  이름 또는 별명
                </label>
                <Row>
                    <NameInput
                      ref={inputRef}
                      id="visitorName"
                      name="name"
                      type="text"
                      value={name}
                      onChange={onNameChange}
                      onKeyDown={onNameKeyDown}
                      onCompositionStart={() => {
                        composingRef.current = true;
                      }}
                      onCompositionEnd={() => {
                        composingRef.current = false;
                      }}
                      maxLength={NAME_MAX_LENGTH}
                      required
                      autoComplete="off"
                      enterKeyHint="go"
                      placeholder="불리고 싶은 이름"
                      aria-describedby="modeNote"
                      readOnly={busy}
                      disabled={state !== null && phase !== "open"}
                    />
                    <PixelButton type="submit" disabled={!canDraw}>
                      {submitLabel}
                    </PixelButton>
                  </Row>
                  <FloatNote id="modeNote">{note}</FloatNote>
                </Form>
            </NameStep>
          ) : (
            <DialogBox speaker="붉은 양" text={line} instant={instantText} headingRef={speakerRef}>
              <HopePicker disabled={!canDraw} chosen={hope} firstRef={firstHopeRef} onPick={(key) => void openBag(key)} />
              <Buttons>
                <PixelButton type="button" $tone="paper" $small onClick={changeName} disabled={busy}>
                  이름 바꾸기
                </PixelButton>
                <Note aria-live="polite">{busy ? "복주머니 여는 중…" : "소망을 고르면 복주머니가 열려요."}</Note>
              </Buttons>
            </DialogBox>
          )}
        </Dock>
      )}

      {modal?.kind === "player" && <PlayerDialog song={modal.song} onClose={() => setModal(null)} />}
      {modal?.kind === "help" && <HelpDialog onClose={() => setModal(null)} />}
      {modal?.kind === "share" && (
        <ShareDialog
          song={modal.ticket.song}
          pick={{ songIndex: modal.ticket.songIndex, blessingIndex: modal.ticket.blessingIndex, hope: modal.ticket.hope }}
          onClose={() => setModal(null)}
        />
      )}

      <Toast role="status" aria-live="polite" $visible={toast.visible}>
        {toast.message}
      </Toast>
    </Stage>
  );
}
