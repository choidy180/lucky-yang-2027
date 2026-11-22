"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import styled, { css, keyframes } from "styled-components";
import { prefersReducedMotion } from "@/lib/portrait";
import { readLastDraw, rememberDraw, validateDraw } from "@/lib/storage";
import { saveTicket } from "@/lib/ticket";
import { NAME_MAX_LENGTH, normalizeName, type EventState, type Song, type StoredDraw, type Ticket } from "@/lib/types";
import { MOBILE, colors } from "@/styles/global";
import DrawResult from "./DrawResult";
import FortuneScene from "./FortuneScene";
import HelpDialog from "./HelpDialog";
import IntroPortrait from "./IntroPortrait";
import PlayerDialog from "./PlayerDialog";
import { Eyebrow, MASCOT_SRC, PlainButton, PrimaryButton, Spark, TinyDisc } from "./ui";

// ---------------------------------------------------------------------------
// Layout

const Experience = styled.div`
  min-height: 100svh;
  display: flex;
  flex-direction: column;
`;

const wrap = css`
  width: min(1200px, calc(100% - 104px));
  margin-inline: auto;

  @media (max-width: 980px) {
    width: calc(100% - 56px);
  }
  ${MOBILE} {
    width: calc(100% - 32px);
  }
`;

const Header = styled.header`
  background: #fbf8f0ed;
  border-bottom: 1px solid #d6cbbb;
`;

const HeaderInner = styled.div`
  ${wrap}
  height: 77px; /* + 1px border = 78px */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  nav {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  ${MOBILE} {
    height: 61px;
    nav {
      gap: 12px;
    }
  }
  @media (max-width: 355px) {
    nav {
      gap: 6px;
    }
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  strong {
    font-size: 1.24rem;
    letter-spacing: -0.065em;
  }

  ${MOBILE} {
    gap: 8px;
    strong {
      font-size: 1.05rem;
    }
  }
`;

// Pixel headphones, cut from a solid square.
const BrandIcon = styled.span`
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 2px solid #84342d;
  border-radius: 9px;
  background: ${colors.red};
  color: #ffeeca;
  box-shadow: inset -2px -2px #ab3c32;

  i {
    display: block;
    width: 21px;
    height: 21px;
    background: currentColor;
    clip-path: polygon(16% 15%, 26% 15%, 26% 5%, 74% 5%, 74% 15%, 84% 15%, 84% 25%, 94% 25%, 94% 83%, 84% 83%, 84% 94%, 68% 94%, 68% 56%, 83% 56%, 83% 36%, 74% 36%, 74% 25%, 26% 25%, 26% 36%, 17% 36%, 17% 56%, 32% 56%, 32% 94%, 16% 94%, 16% 83%, 6% 83%, 6% 25%, 16% 25%);
  }

  ${MOBILE} {
    width: 31px;
    height: 31px;
    i {
      width: 18px;
      height: 18px;
    }
  }
`;

const Main = styled.main`
  flex: 1;
  width: min(1170px, calc(100% - 96px));
  margin-inline: auto;
  display: grid;
  align-content: center;
  padding-block: clamp(22px, 5vh, 60px);

  ${MOBILE} {
    width: calc(100% - 32px);
    padding-block: 16px 24px;
  }
`;

const arrive = keyframes`
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: 1.11fr 1fr;
  align-items: stretch;
  background: ${colors.card};
  border: 1.5px solid ${colors.frame};
  border-radius: 18px;
  box-shadow: 0 5px 0 #b8aa95;
  overflow: hidden;
  /* Restarts whenever the experience is un-hidden after the intro. */
  animation: ${arrive} 0.36s ease-out both;

  ${MOBILE} {
    grid-template-columns: 1fr;
    border-radius: 13px;
  }
`;

const Copy = styled.div`
  min-width: 0;
  padding: clamp(36px, 4.1vw, 70px) clamp(32px, 3.9vw, 64px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;

  @media (min-width: 1500px) {
    padding-block: 65px;
  }
  @media (max-width: 980px) {
    padding: 30px;
  }
  ${MOBILE} {
    padding: 27px 25px 24px;
  }
  @media (max-width: 355px) {
    padding: 20px;
  }
`;

const Title = styled.h1`
  margin: 19px 0 15px;
  font-size: clamp(3.1rem, 4.7vw, 4.7rem);
  line-height: 1.13;
  letter-spacing: -0.085em;
  font-weight: 700;

  em {
    font-style: normal;
    color: ${colors.wine};
  }
  .star {
    display: inline-block;
    margin: 12px 0 0 13px;
    vertical-align: top;
    font-size: 0.36em;
    color: ${colors.gold};
    transform: rotate(8deg);
  }

  ${MOBILE} {
    margin: 11px 0 6px;
    font-size: clamp(2.4rem, 8vw, 3.45rem);
    br {
      display: none;
    }
    em {
      margin-left: 0.14em;
    }
    .star {
      margin: 4px 0 0 6px;
    }
  }
`;

const Greeting = styled.p`
  margin: 4px 0 28px;
  color: #61564c;
  font-size: 1.01rem;
  line-height: 1.7;
  letter-spacing: -0.025em;

  ${MOBILE} {
    margin: 5px 0 14px;
    font-size: 0.94rem;
  }
`;

const Form = styled.form`
  width: 100%;
  display: grid;
  gap: 8px;

  label {
    color: #4d3c32;
    font-size: 0.9rem;
    font-weight: 700;
  }
  ${PrimaryButton} {
    width: 100%;
    margin-top: 4px;
  }
`;

const NameInput = styled.input`
  width: 100%;
  min-height: 50px;
  padding: 10px 14px;
  border: 1px solid #b5a390;
  border-radius: 8px;
  background: #fff;
  color: ${colors.ink};
  font-size: 16px;

  &::placeholder {
    color: #83796f;
  }
  &:focus {
    outline: 2px solid #a24435;
    outline-offset: 1px;
  }
  &:disabled {
    background: #f4efe6;
    color: #7a6e62;
  }
`;

const ModeNote = styled.p`
  align-self: center;
  margin-top: 13px;
  color: #726458;
  font-size: 0.81rem;
  text-align: center;

  button {
    margin-left: 6px;
    padding: 2px 4px;
    border: 0;
    background: none;
    color: ${colors.wine};
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  ${MOBILE} {
    font-size: 0.78rem;
  }
`;

const Footer = styled.footer`
  ${wrap}
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 0 24px;
  border-top: 1px solid #d9cdb9;
  color: #776c5f;
  font-size: 0.78rem;

  span:first-child {
    display: flex;
    align-items: center;
    gap: 7px;
    font-weight: 700;
  }
  ${MOBILE} {
    font-size: 0.72rem;
  }
`;

const Toast = styled.div<{ $visible: boolean }>`
  position: fixed;
  z-index: 30;
  left: 50%;
  bottom: max(22px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - 32px);
  padding: 10px 16px;
  border-radius: 8px;
  background: #34302a;
  color: #fff;
  font-size: 0.9rem;
  text-align: center;
  pointer-events: none;
  ${({ $visible }) =>
    $visible
      ? css`
          opacity: 1;
          visibility: visible;
          transition: opacity 0.2s ease;
        `
      : css`
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0s linear 0.2s;
        `}
`;

// ---------------------------------------------------------------------------
// State

type ServerStatus = { kind: "loading" } | { kind: "ready"; state: EventState } | { kind: "error" };
type DialogState = { kind: "player"; song: Song } | { kind: "help" } | null;
type FocusTarget = "entry" | "song" | "input";

const SHAKE_WAIT_MS = 580;
const TOAST_MS = 2500;
const MAX_TIMEOUT = 2_147_483_000;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isTicket(value: unknown, state: EventState): value is Ticket {
  if (typeof value !== "object" || value === null) return false;
  const name = (value as { name?: unknown }).name;
  return normalizeName(name) === name && validateDraw(value, state) !== null;
}

export default function NewYearExperience() {
  const [introActive, setIntroActive] = useState(true);
  const [introRun, setIntroRun] = useState(0);
  const [status, setStatus] = useState<ServerStatus>({ kind: "loading" });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState({ message: "", visible: false });
  const [focusRequest, setFocusRequest] = useState<{ target: FocusTarget; seq: number } | null>(null);

  // Refs mirror the values the async handlers must read without stale closures.
  const busyRef = useRef(false);
  const savingRef = useRef(false);
  const composingRef = useRef(false);
  const introActiveRef = useRef(true);
  const stateRef = useRef<EventState | null>(null);
  const nameRef = useRef("");
  const ticketRef = useRef<Ticket | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusSeq = useRef(0);

  const entryTitleRef = useRef<HTMLHeadingElement>(null);
  const songTitleRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const state = status.kind === "ready" ? status.state : null;
  const phase = state?.phase;
  const mode = state?.mode;

  const requestFocus = useCallback((target: FocusTarget) => {
    focusSeq.current += 1;
    setFocusRequest({ target, seq: focusSeq.current });
  }, []);

  useEffect(() => {
    if (!focusRequest) return;
    const el =
      focusRequest.target === "song" ? songTitleRef.current : focusRequest.target === "input" ? inputRef.current : entryTitleRef.current;
    el?.focus({ preventScroll: true });
  }, [focusRequest]);

  const notify = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_MS);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showTicket = useCallback(
    (next: Ticket | null) => {
      ticketRef.current = next;
      setTicket(next);
      if (next) requestFocus("song");
    },
    [requestFocus],
  );

  // --- server state -------------------------------------------------------

  const refresh = useCallback(async (): Promise<EventState | null> => {
    try {
      const res = await fetch("/api/event", { cache: "no-store" });
      if (!res.ok) throw new Error(`event ${res.status}`);
      const next = (await res.json()) as EventState;
      stateRef.current = next;
      setStatus({ kind: "ready", state: next });
      return next;
    } catch {
      // Keep the last known state; only a first failure turns into the retry message.
      setStatus((prev) => (prev.kind === "ready" ? prev : { kind: "error" }));
      return null;
    }
  }, []);

  // The status request starts together with the intro.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Outside the open window: close the player and return to the entry panel.
  useEffect(() => {
    if (!state || state.phase === "open") return;
    setDialog(null);
    if (ticketRef.current) showTicket(null);
  }, [state, showTicket]);

  // Live mode: re-check exactly at the next boundary (no per-second polling).
  useEffect(() => {
    if (!state || state.mode !== "live" || state.phase === "closed") return;
    const boundary = state.phase === "waiting" ? state.opensAt : state.closesAt;
    const delay = Math.min(MAX_TIMEOUT, Math.max(100, boundary - state.now + 50));
    const timer = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(timer);
  }, [state, refresh]);

  // Live mode: a tab that wakes up or comes back from the background re-checks once.
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

  // --- intro --------------------------------------------------------------

  const endIntro = useCallback(() => {
    introActiveRef.current = false;
    setIntroActive(false);
    requestFocus(ticketRef.current ? "song" : "entry");
  }, [requestFocus]);

  const replayIntro = () => {
    if (busyRef.current) return;
    setDialog(null);
    introActiveRef.current = true;
    setIntroActive(true);
    setIntroRun((n) => n + 1);
  };

  // --- draw ---------------------------------------------------------------

  const openBag = useCallback(async () => {
    if (busyRef.current) return;
    const current = stateRef.current;
    if (introActiveRef.current || !current || current.phase !== "open") return;
    const cleanName = normalizeName(nameRef.current);
    if (!cleanName) {
      if (!ticketRef.current) requestFocus("input");
      return;
    }
    if (current.mode === "live" && ticketRef.current) return; // one ticket in live mode

    busyRef.current = true;
    setBusy(true);
    try {
      if (current.mode === "live") {
        const stored = readLastDraw("live", current);
        if (stored) {
          // Confirm with the server that the bag is still open before showing the kept ticket.
          const fresh = await refresh();
          if (!fresh) notify("이벤트 상태를 확인하지 못했어요. 한 번 더 눌러 주세요.");
          else if (fresh.phase === "open") showTicket({ ...stored, name: cleanName });
          return;
        }
      }

      const previous: StoredDraw | null = current.mode === "test" ? (ticketRef.current ?? readLastDraw("test", current)) : null;
      const query = previous ? `?${new URLSearchParams({ song: String(previous.songIndex), wish: String(previous.blessingIndex) })}` : "";

      setShaking(true);
      const [res] = await Promise.all([
        fetch(`/api/draw${query}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: cleanName }),
          cache: "no-store",
        }),
        wait(prefersReducedMotion() ? 0 : SHAKE_WAIT_MS),
      ]);
      if (res.status === 403) {
        await refresh();
        return;
      }
      if (!res.ok) throw new Error(`draw ${res.status}`);
      const data: unknown = await res.json();
      if (!isTicket(data, current)) throw new Error("unexpected draw response");
      rememberDraw(current.mode, data);
      showTicket(data);
    } catch {
      notify("복주머니를 열지 못했어요. 한 번 더 눌러 주세요.");
    } finally {
      busyRef.current = false;
      setBusy(false);
      setShaking(false);
    }
  }, [notify, refresh, requestFocus, showTicket]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (composingRef.current) return;
    void openBag();
  };

  const onNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    nameRef.current = event.target.value;
    setName(event.target.value);
  };

  // The Enter that commits a Hangul syllable must not also submit the form.
  const onNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229 || composingRef.current)) {
      event.preventDefault();
    }
  };

  // --- result actions -----------------------------------------------------

  const onListen = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.focus();
    const current = ticketRef.current;
    if (!current) return;
    if (stateRef.current?.phase !== "open") {
      notify("이벤트가 열리는 동안 들을 수 있어요.");
      return;
    }
    setDialog({ kind: "player", song: current.song });
  };

  const onSave = async () => {
    const current = ticketRef.current;
    if (!current || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const image = new Image();
      image.src = MASCOT_SRC;
      await saveTicket(current, image);
      notify("티켓 이미지를 만들었어요.");
    } catch {
      notify("이미지를 저장할 수 없어요. 다시 시도해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // --- derived UI ---------------------------------------------------------

  const validName = normalizeName(name) !== null;
  const canDraw = !introActive && phase === "open" && !busy && validName;
  const bagDisabled = !canDraw || (mode === "live" && ticket !== null);
  const drawLabel = busy
    ? "복주머니 여는 중…"
    : phase === "waiting"
      ? "2027년 1월 1일에 열려요"
      : phase === "closed"
        ? "올해의 복주머니가 마감됐어요"
        : "복주머니 열기";

  let modeNote: ReactNode;
  if (status.kind === "loading") modeNote = "복주머니를 준비하고 있어요.";
  else if (status.kind === "error")
    modeNote = (
      <>
        서버에 연결하지 못했어요.
        <button type="button" onClick={() => void refresh()}>
          다시 연결
        </button>
      </>
    );
  else if (phase === "open") modeNote = mode === "test" ? "테스트 모드 · 지금은 여러 번 열 수 있어요." : "한국시간 1월 1일, 단 하루 열려요.";
  else modeNote = "이벤트 기간 · 2027년 1월 1일 00:00–24:00 (한국시간)";

  const bagLabel = ticket ? (mode === "test" ? "그림 속 복주머니 다시 열기" : "이미 연 복주머니") : "그림 속 복주머니 열기";

  return (
    <>
      {introActive && <IntroPortrait key={introRun} onFinish={endIntro} />}

      <Experience hidden={introActive} inert={introActive}>
        <Header>
          <HeaderInner>
            <Brand>
              <BrandIcon aria-hidden="true">
                <i />
              </BrandIcon>
              <strong>복주머니 레코드</strong>
            </Brand>
            <nav aria-label="이벤트 메뉴">
              <PlainButton type="button" onClick={replayIntro} disabled={busy}>
                인트로 다시 보기
              </PlainButton>
              <PlainButton
                type="button"
                onClick={(event) => {
                  event.currentTarget.focus();
                  setDialog({ kind: "help" });
                }}
              >
                이용 방법
              </PlainButton>
            </nav>
          </HeaderInner>
        </Header>

        <Main>
          <Hero aria-label="새해 첫 곡 복주머니">
            <FortuneScene
              revealed={ticket !== null && !busy}
              shaking={shaking}
              bagDisabled={bagDisabled}
              bagLabel={bagLabel}
              onBag={() => void openBag()}
            />

            <Copy hidden={ticket !== null} aria-busy={busy}>
              <Eyebrow>2027 NEW YEAR</Eyebrow>
              <Title ref={entryTitleRef} tabIndex={-1}>
                올해 첫 곡은
                <br />
                <em>뭐양?</em>
                <span className="star" aria-hidden="true">
                  ✦
                </span>
              </Title>
              <Greeting>
                어떤 이름으로 불러줄까양?
                <br />네 첫 곡과 새해 덕담을 담아 왔어.
              </Greeting>
              <Form onSubmit={onSubmit} noValidate>
                <label htmlFor="visitorName">이름 또는 별명</label>
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
                <PrimaryButton type="submit" disabled={!canDraw}>
                  <Spark aria-hidden="true">✦</Spark>
                  <span>{drawLabel}</span>
                </PrimaryButton>
              </Form>
              <ModeNote id="modeNote">{modeNote}</ModeNote>
            </Copy>

            {ticket && (
              <Copy aria-busy={busy}>
                <DrawResult
                  ticket={ticket}
                  titleRef={songTitleRef}
                  busy={busy}
                  saving={saving}
                  showRedraw={mode === "test"}
                  canRedraw={canDraw}
                  onListen={onListen}
                  onSave={() => void onSave()}
                  onRedraw={() => void openBag()}
                />
              </Copy>
            )}
          </Hero>
        </Main>

        <Footer>
          <span>
            <TinyDisc aria-hidden="true" />
            복주머니 레코드
          </span>
          <span>2027 정미년 새해 음악 이벤트</span>
        </Footer>
      </Experience>

      {dialog?.kind === "player" && <PlayerDialog song={dialog.song} onClose={() => setDialog(null)} />}
      {dialog?.kind === "help" && <HelpDialog onClose={() => setDialog(null)} />}

      <Toast role="status" aria-live="polite" $visible={toast.visible}>
        {toast.message}
      </Toast>
    </>
  );
}
