// ============================================================
// BLISTER SISTERS — ENDURE 24 RACE DAY APP
// Updated: lap start/finish redesign + personal avg est. times
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, collection, onSnapshot,
  setDoc, updateDoc, addDoc, getDocs, query, orderBy, serverTimestamp
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import React, {
  useState, useEffect, useRef, useMemo, useCallback
} from "react";
import { createRoot } from "react-dom/client";

// ── Firebase config — keep your existing values ──────────────
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL:       process.env.REACT_APP_FIREBASE_DATABASE_URL,
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Constants ────────────────────────────────────────────────
const RACE_START_DEFAULT = new Date("2026-06-07T00:00:00"); // midnight race day
const RACE_DURATION_MS   = 24 * 60 * 60 * 1000;            // 24 hours
const DEFAULT_LAP_MIN    = 50;                               // fallback lap estimate (mins)
const TEAM_NAMES         = ["Laura", "Lucie", "Emma", "Jemma"]; // update as needed

// ── Colour palette ───────────────────────────────────────────
const C = {
  bg:       "#0d0d14",
  surface:  "#16161f",
  card:     "#1e1e2e",
  border:   "#2a2a3d",
  pink:     "#ff0080",
  blue:     "#00d4ff",
  lime:     "#ccff00",
  purple:   "#a78bfa",
  text:     "#f0f0f8",
  muted:    "#6b6b8a",
  danger:   "#ff4444",
  success:  "#00e5a0",
};

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

/** True if today's date (local) matches the race date. */
function isRaceDay(raceMeta) {
  const now         = new Date();
  const raceStart   = raceMeta?.startTime
    ? new Date(raceMeta.startTime)
    : RACE_START_DEFAULT;

  const todayStr    = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const raceStr     = `${raceStart.getFullYear()}-${raceStart.getMonth()}-${raceStart.getDate()}`;
  return todayStr === raceStr;
}

function fmtTime(ms) {
  if (!ms) return "--:--";
  const d = new Date(ms);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(ms) {
  if (!ms || ms <= 0) return "--";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function fmtEst(ts) {
  if (!ts) return "TBC";
  return fmtTime(ts);
}

/** ms since epoch for "now" */
const now = () => Date.now();

// ────────────────────────────────────────────────────────────
// PERSONAL AVERAGE LAP CALCULATOR
// Returns average lap duration (ms) for a given runner name,
// based on all their completed laps.  Falls back to DEFAULT_LAP_MIN.
// ────────────────────────────────────────────────────────────
function getRunnerAvgMs(laps, runnerName) {
  const completed = laps.filter(
    l => l.runner === runnerName &&
         l.status === "complete" &&
         l.startedAt &&
         l.finishedAt
  );
  if (completed.length === 0) return DEFAULT_LAP_MIN * 60 * 1000;
  const total = completed.reduce((sum, l) => sum + (l.finishedAt - l.startedAt), 0);
  return Math.round(total / completed.length);
}

// ────────────────────────────────────────────────────────────
// ESTIMATED TIME CHAIN
// Given the sorted lap order and all laps data, compute:
//   estStart  — when each runner is expected to start
//   estFinish — when each runner is expected to finish
// Logic:
//   - If a runner has startedAt: their est. finish = startedAt + their personal avg
//   - If next runner has no startedAt: their est. start = prev runner's est. finish
// ────────────────────────────────────────────────────────────
function buildEstChain(laps) {
  // Sort: active/claimed first, then by claimedAt
  const active = [...laps]
    .filter(l => l.status !== "complete")
    .sort((a, b) => (a.claimedAt || 0) - (b.claimedAt || 0));

  const result = [];
  let chainFinish = null;

  for (const lap of active) {
    const avgMs  = getRunnerAvgMs(laps, lap.runner);
    let estStart  = null;
    let estFinish = null;

    if (lap.startedAt) {
      // Runner is actively running — use their actual start
      estStart  = lap.startedAt;
      estFinish = lap.startedAt + avgMs;
    } else {
      // Claimed but not started — estimate from chain
      estStart  = chainFinish;
      estFinish = chainFinish ? chainFinish + avgMs : null;
    }

    chainFinish = estFinish;
    result.push({ ...lap, estStart, estFinish, avgMs });
  }

  return result;
}

// ────────────────────────────────────────────────────────────
// FIREBASE ACTIONS
// ────────────────────────────────────────────────────────────
async function claimLap(runnerName) {
  await addDoc(collection(db, "laps"), {
    runner:    runnerName,
    status:    "claimed",
    claimedAt: now(),
    startedAt: null,
    finishedAt: null,
  });
}

async function startLap(lapId) {
  await updateDoc(doc(db, "laps", lapId), {
    status:    "running",
    startedAt: now(),
  });
}

async function finishLap(lapId) {
  await updateDoc(doc(db, "laps", lapId), {
    status:     "complete",
    finishedAt: now(),
  });
}

// ────────────────────────────────────────────────────────────
// GLOBAL STYLES (injected once)
// ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Permanent+Marker&family=Outfit:wght@300;400;600;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:      ${C.bg};
    --surface: ${C.surface};
    --card:    ${C.card};
    --border:  ${C.border};
    --pink:    ${C.pink};
    --blue:    ${C.blue};
    --lime:    ${C.lime};
    --purple:  ${C.purple};
    --text:    ${C.text};
    --muted:   ${C.muted};
    --success: ${C.success};
    --danger:  ${C.danger};
  }

  html, body, #root {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: 'Outfit', sans-serif;
    font-size: 15px;
    -webkit-tap-highlight-color: transparent;
    overflow: hidden;
  }

  /* Scrollable inner pane */
  .scroll-pane {
    height: calc(100dvh - 64px);
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px 14px 24px;
    -webkit-overflow-scrolling: touch;
  }

  /* Headings */
  .display { font-family: 'Dela Gothic One', cursive; }
  .marker  { font-family: 'Permanent Marker', cursive; }

  /* ── BOTTOM TAB BAR ── */
  .tab-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 64px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    z-index: 100;
  }
  .tab-btn {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 3px; background: none; border: none; cursor: pointer;
    color: var(--muted); transition: color 0.15s;
    font-family: 'Outfit', sans-serif; font-size: 9px;
    font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  }
  .tab-btn.active { color: var(--pink); }
  .tab-btn span.icon { font-size: 20px; }

  /* ── CARDS ── */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 12px;
    position: relative;
    overflow: hidden;
  }
  .card.glow-pink { box-shadow: 0 0 24px rgba(255,0,128,0.15); border-color: rgba(255,0,128,0.3); }
  .card.glow-blue { box-shadow: 0 0 24px rgba(0,212,255,0.15); border-color: rgba(0,212,255,0.3); }
  .card.glow-lime { box-shadow: 0 0 24px rgba(204,255,0,0.15);  border-color: rgba(204,255,0,0.3); }

  /* ── LAP CARD STATUS STRIP ── */
  .status-strip {
    position: absolute; top: 0; left: 0; width: 4px; height: 100%;
    border-radius: 16px 0 0 16px;
  }

  /* ── BUTTONS ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 12px 20px; border: none; border-radius: 12px;
    font-family: 'Dela Gothic One', cursive; font-size: 13px;
    letter-spacing: 1px; cursor: pointer; transition: transform 0.1s, opacity 0.1s;
    text-transform: uppercase; white-space: nowrap;
  }
  .btn:active { transform: scale(0.96); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  /* START — electric blue, large, full-width */
  .btn-start {
    background: var(--blue); color: #000;
    width: 100%; padding: 16px; font-size: 16px;
    border-radius: 14px;
    box-shadow: 0 0 20px rgba(0,212,255,0.4);
    animation: pulseBlue 2s ease-in-out infinite;
  }
  @keyframes pulseBlue {
    0%,100% { box-shadow: 0 0 20px rgba(0,212,255,0.4); }
    50%      { box-shadow: 0 0 36px rgba(0,212,255,0.7); }
  }

  /* FINISH — hot pink, full-width */
  .btn-finish {
    background: var(--pink); color: #fff;
    width: 100%; padding: 16px; font-size: 16px;
    border-radius: 14px;
    box-shadow: 0 0 20px rgba(255,0,128,0.4);
    animation: pulsePink 1.5s ease-in-out infinite;
  }
  @keyframes pulsePink {
    0%,100% { box-shadow: 0 0 20px rgba(255,0,128,0.4); }
    50%      { box-shadow: 0 0 40px rgba(255,0,128,0.75); }
  }

  /* CLAIM — outlined lime */
  .btn-claim {
    background: transparent; color: var(--lime);
    border: 2px solid var(--lime); width: 100%; padding: 14px;
    font-size: 14px; border-radius: 14px;
  }
  .btn-claim:hover { background: rgba(204,255,0,0.08); }

  /* Secondary / ghost */
  .btn-ghost {
    background: transparent; color: var(--muted);
    border: 1px solid var(--border); padding: 8px 16px;
    font-size: 11px; border-radius: 8px;
  }

  /* ── BADGES ── */
  .badge {
    display: inline-flex; align-items: center;
    padding: 3px 10px; border-radius: 99px;
    font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  }
  .badge-claimed  { background: rgba(167,139,250,0.15); color: var(--purple); }
  .badge-running  { background: rgba(0,212,255,0.15);   color: var(--blue); }
  .badge-complete { background: rgba(0,229,160,0.15);   color: var(--success); }
  .badge-waiting  { background: rgba(107,107,138,0.15); color: var(--muted); }

  /* ── TIMER ── */
  .live-timer {
    font-family: 'Dela Gothic One', cursive;
    font-size: 36px; color: var(--blue);
    text-shadow: 0 0 20px rgba(0,212,255,0.6);
    letter-spacing: 2px;
  }

  /* ── EST TIME ROW ── */
  .est-row {
    display: flex; justify-content: space-between;
    font-size: 12px; color: var(--muted); margin-top: 6px;
  }
  .est-val { color: var(--text); font-weight: 600; }

  /* ── SECTION HEADERS ── */
  .section-title {
    font-family: 'Dela Gothic One', cursive;
    font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--muted); margin: 20px 0 10px;
  }

  /* ── HISTORY TABLE ── */
  .hist-row {
    display: flex; justify-content: space-between;
    padding: 10px 0; border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .hist-row:last-child { border-bottom: none; }

  /* ── STATS NUMBERS ── */
  .stat-num {
    font-family: 'Dela Gothic One', cursive;
    font-size: 32px; color: var(--pink);
    text-shadow: 0 0 16px rgba(255,0,128,0.4);
  }

  /* ── GRAIN OVERLAY ── */
  body::after {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 999;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  /* ── SLIDE-UP ANIMATION ── */
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .slide-up { animation: slideUp 0.35s ease forwards; }

  /* ── RUNNER AVATAR ── */
  .avatar {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Dela Gothic One', cursive; font-size: 14px;
    flex-shrink: 0;
  }

  /* ── PROGRESS BAR ── */
  .progress-track {
    height: 6px; background: var(--border); border-radius: 99px; overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, var(--pink), var(--blue));
    transition: width 0.6s ease;
    box-shadow: 0 0 8px rgba(255,0,128,0.5);
  }
`;

// ────────────────────────────────────────────────────────────
// LIVE TIMER (shows elapsed time for a running lap)
// ────────────────────────────────────────────────────────────
function LiveTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(now() - startedAt);
  useEffect(() => {
    const id = setInterval(() => setElapsed(now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <div className="live-timer">{fmtDuration(elapsed)}</div>;
}

// ────────────────────────────────────────────────────────────
// AVATAR
// ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [C.pink, C.blue, C.lime, C.purple];
function Avatar({ name, idx }) {
  const bg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const initials = name?.slice(0, 2).toUpperCase() || "?";
  const textColor = bg === C.lime ? "#000" : "#fff";
  return (
    <div className="avatar" style={{ background: bg, color: textColor }}>
      {initials}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// LAP CARD — the main race day UI unit
//
// KEY DESIGN:
//   claimed  → show START button immediately (not gated on anyone else)
//   running  → show FINISH button + live timer
//   complete → show duration summary
//
// Each card also shows:
//   est. start (if not yet running) / actual start
//   est. finish based on personal avg
// ────────────────────────────────────────────────────────────
function LapCard({ lapData, allLaps, runnerIdx, myName, onStart, onFinish }) {
  const { id, runner, status, claimedAt, startedAt, finishedAt, estStart, estFinish, avgMs } = lapData;
  const isMe = runner === myName;
  const accentColor =
    status === "running"  ? C.blue :
    status === "complete" ? C.success :
    status === "claimed"  ? C.purple : C.muted;

  const glowClass =
    (isMe && status === "running")  ? "card glow-blue" :
    (isMe && status === "claimed")  ? "card glow-lime" : "card";

  const completedDuration = finishedAt && startedAt ? finishedAt - startedAt : null;

  return (
    <div className={`${glowClass} slide-up`} style={{ animationDelay: `${runnerIdx * 60}ms` }}>
      {/* Status strip */}
      <div className="status-strip" style={{ background: accentColor }} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingLeft: 8 }}>
        <Avatar name={runner} idx={runnerIdx} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {runner}
            {isMe && (
              <span style={{ color: C.pink, fontSize: 11, marginLeft: 6, fontWeight: 400 }}>
                (you)
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
            Claimed {fmtTime(claimedAt)}
          </div>
        </div>
        {/* Badge */}
        <span className={`badge badge-${status}`}>
          {status === "running"  ? "🏃 Running" :
           status === "claimed"  ? "⏳ Claimed" :
           status === "complete" ? "✅ Done"    : status}
        </span>
      </div>

      {/* ── RUNNING STATE ── */}
      {status === "running" && (
        <div style={{ paddingLeft: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>ELAPSED</div>
          <LiveTimer startedAt={startedAt} />

          <div className="est-row" style={{ marginTop: 10, marginBottom: 16 }}>
            <span>Started</span>
            <span className="est-val">{fmtTime(startedAt)}</span>
            <span style={{ marginLeft: 16 }}>Est. finish</span>
            <span className="est-val" style={{ color: C.blue }}>{fmtEst(estFinish)}</span>
          </div>

          {/* FINISH button — only show to the runner themselves */}
          {isMe && (
            <button className="btn btn-finish" onClick={() => onFinish(id)}>
              🏁 Lap Complete
            </button>
          )}
        </div>
      )}

      {/* ── CLAIMED STATE ── */}
      {status === "claimed" && (
        <div style={{ paddingLeft: 8 }}>
          <div className="est-row" style={{ marginBottom: 14 }}>
            <span>Est. start</span>
            <span className="est-val" style={{ color: C.purple }}>
              {estStart ? fmtEst(estStart) : "Waiting…"}
            </span>
            <span style={{ marginLeft: 16 }}>Est. finish</span>
            <span className="est-val" style={{ color: C.purple }}>
              {estFinish ? fmtEst(estFinish) : "TBC"}
            </span>
          </div>

          {avgMs !== DEFAULT_LAP_MIN * 60 * 1000 && (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
              Based on personal avg: {fmtDuration(avgMs)}
            </div>
          )}

          {/* START button — available immediately once claimed, no gate */}
          {isMe && (
            <button className="btn btn-start" onClick={() => onStart(id)}>
              ▶ Start My Lap
            </button>
          )}
        </div>
      )}

      {/* ── COMPLETE STATE ── */}
      {status === "complete" && (
        <div style={{ paddingLeft: 8 }}>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>STARTED</div>
              <div style={{ fontWeight: 600 }}>{fmtTime(startedAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>FINISHED</div>
              <div style={{ fontWeight: 600 }}>{fmtTime(finishedAt)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>DURATION</div>
              <div style={{ fontWeight: 700, color: C.success }}>
                {fmtDuration(completedDuration)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// RACE DAY VIEW
// ────────────────────────────────────────────────────────────
function RaceDayView({ laps, myName, raceMeta }) {
  const handleStart  = useCallback(lapId => startLap(lapId),  []);
  const handleFinish = useCallback(lapId => finishLap(lapId), []);

  // Build estimated time chain for active laps
  const chain = useMemo(() => buildEstChain(laps), [laps]);

  // Completed laps (sorted newest first)
  const completedLaps = useMemo(
    () => laps.filter(l => l.status === "complete")
              .sort((a, b) => b.finishedAt - a.finishedAt),
    [laps]
  );

  // Total laps completed
  const totalLaps = completedLaps.length;

  // Race elapsed
  const raceStartMs = raceMeta?.startTime || RACE_START_DEFAULT.getTime();
  const raceElapsed = Date.now() - raceStartMs;
  const raceProgress = Math.min(1, raceElapsed / RACE_DURATION_MS);

  // Can I claim? — only if I have no active (claimed or running) lap
  const myActiveLap = laps.find(
    l => l.runner === myName && (l.status === "claimed" || l.status === "running")
  );

  const handleClaim = async () => {
    if (myActiveLap) return;
    await claimLap(myName);
  };

  // Map runner name → index for avatar colours
  const runnerIndex = name => TEAM_NAMES.indexOf(name) >= 0
    ? TEAM_NAMES.indexOf(name)
    : TEAM_NAMES.length;

  return (
    <div className="scroll-pane">

      {/* ── HEADER ── */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div className="display" style={{
          fontSize: 28, color: C.pink,
          textShadow: "0 0 24px rgba(255,0,128,0.5)",
        }}>
          ENDURE 24 🏆
        </div>
        <div className="marker" style={{ fontSize: 15, color: C.muted, marginTop: 4 }}>
          Blister Sisters — Race Day
        </div>

        {/* Race progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 4 }}>
            <span>Race started</span>
            <span>{Math.round(raceProgress * 100)}% complete</span>
            <span>24h</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${raceProgress * 100}%` }} />
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "flex", gap: 0, marginTop: 16,
          background: C.surface, borderRadius: 12, overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}>
          {[
            { label: "Laps Done", val: totalLaps },
            { label: "Running", val: laps.filter(l => l.status === "running").length },
            { label: "Queued", val: laps.filter(l => l.status === "claimed").length },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: "12px 0", textAlign: "center",
              borderRight: i < 2 ? `1px solid ${C.border}` : "none",
            }}>
              <div className="stat-num" style={{ fontSize: 24 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CLAIM BUTTON ── */}
      {!myActiveLap && (
        <button className="btn btn-claim" onClick={handleClaim} style={{ marginBottom: 20 }}>
          ＋ Claim Next Lap
        </button>
      )}

      {/* ── ACTIVE LAPS ── */}
      {chain.length > 0 && (
        <>
          <div className="section-title">Active &amp; Queued</div>
          {chain.map((lap, idx) => (
            <LapCard
              key={lap.id}
              lapData={lap}
              allLaps={laps}
              runnerIdx={runnerIndex(lap.runner)}
              myName={myName}
              onStart={handleStart}
              onFinish={handleFinish}
            />
          ))}
        </>
      )}

      {/* ── COMPLETED LAPS ── */}
      {completedLaps.length > 0 && (
        <>
          <div className="section-title">Completed Laps</div>
          <div className="card">
            {completedLaps.map((lap, idx) => (
              <div key={lap.id} className="hist-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={lap.runner} idx={runnerIndex(lap.runner)} />
                  <span style={{ fontWeight: 600 }}>{lap.runner}</span>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>
                    {fmtTime(lap.startedAt)} → {fmtTime(lap.finishedAt)}
                  </span>
                  <span style={{ fontWeight: 700, color: C.success }}>
                    {fmtDuration(lap.finishedAt - lap.startedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {chain.length === 0 && completedLaps.length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, paddingTop: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏃‍♀️</div>
          <div className="display" style={{ fontSize: 16, marginBottom: 8 }}>
            No laps yet
          </div>
          <div style={{ fontSize: 13 }}>
            Claim the first lap to get started!
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// STATS VIEW
// ────────────────────────────────────────────────────────────
function StatsView({ laps }) {
  const completedLaps = laps.filter(l => l.status === "complete" && l.startedAt && l.finishedAt);

  const byRunner = useMemo(() => {
    const map = {};
    for (const name of TEAM_NAMES) {
      const mine = completedLaps.filter(l => l.runner === name);
      const totalMs = mine.reduce((s, l) => s + (l.finishedAt - l.startedAt), 0);
      map[name] = {
        count: mine.length,
        avgMs: mine.length ? Math.round(totalMs / mine.length) : null,
        bestMs: mine.length ? Math.min(...mine.map(l => l.finishedAt - l.startedAt)) : null,
        totalMs,
      };
    }
    return map;
  }, [completedLaps]);

  const totalLaps = completedLaps.length;
  const fastestLap = completedLaps.length
    ? completedLaps.reduce((best, l) =>
        (l.finishedAt - l.startedAt) < (best.finishedAt - best.startedAt) ? l : best
      )
    : null;

  return (
    <div className="scroll-pane">
      <div className="display" style={{ fontSize: 22, color: C.pink, marginBottom: 16,
        textShadow: "0 0 16px rgba(255,0,128,0.4)" }}>
        Team Stats
      </div>

      {/* Overall */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 0 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div className="stat-num">{totalLaps}</div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              Total Laps
            </div>
          </div>
          <div style={{ flex: 1, textAlign: "center", borderLeft: `1px solid ${C.border}` }}>
            <div className="stat-num" style={{ color: C.lime }}>
              {fastestLap ? fmtDuration(fastestLap.finishedAt - fastestLap.startedAt) : "--"}
            </div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              Fastest
            </div>
          </div>
        </div>
        {fastestLap && (
          <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 8 }}>
            🏆 {fastestLap.runner}
          </div>
        )}
      </div>

      {/* Per runner */}
      <div className="section-title">Per Runner</div>
      {TEAM_NAMES.map((name, idx) => {
        const s = byRunner[name] || {};
        return (
          <div key={name} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <Avatar name={name} idx={idx} />
              <div className="display" style={{ fontSize: 15 }}>{name}</div>
              <span style={{ marginLeft: "auto", fontWeight: 700, color: C.blue }}>
                {s.count || 0} lap{s.count !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>AVG</div>
                <div style={{ fontWeight: 600 }}>{s.avgMs ? fmtDuration(s.avgMs) : "--"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>BEST</div>
                <div style={{ fontWeight: 600, color: C.lime }}>{s.bestMs ? fmtDuration(s.bestMs) : "--"}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted }}>TOTAL TIME</div>
                <div style={{ fontWeight: 600 }}>{s.totalMs ? fmtDuration(s.totalMs) : "--"}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ONBOARDING
// ────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [chosen, setChosen] = useState(null);

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center",
    }}>
      <div style={{ fontSize: 56, marginBottom: 16, animation: "slideUp 0.4s ease" }}>🏃‍♀️</div>
      <div className="display" style={{
        fontSize: 32, color: C.pink, textShadow: "0 0 24px rgba(255,0,128,0.5)",
        marginBottom: 6,
      }}>
        BLISTER SISTERS
      </div>
      <div className="marker" style={{ fontSize: 18, color: C.blue, marginBottom: 32 }}>
        Endure 24 — Race Day
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
        Who are you?
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        {TEAM_NAMES.map((name, idx) => (
          <button
            key={name}
            onClick={() => setChosen(name)}
            style={{
              background: chosen === name ? C.pink : C.card,
              color: chosen === name ? "#fff" : C.text,
              border: `2px solid ${chosen === name ? C.pink : C.border}`,
              borderRadius: 12, padding: "14px 20px",
              fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15,
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: chosen === name ? "0 0 20px rgba(255,0,128,0.4)" : "none",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            <Avatar name={name} idx={idx} />
            {name}
          </button>
        ))}
      </div>
      {chosen && (
        <button
          className="btn btn-start"
          style={{ marginTop: 24, maxWidth: 280 }}
          onClick={() => onComplete(chosen)}
        >
          Let's Go! 🔥
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB BAR
// ────────────────────────────────────────────────────────────
const TABS = [
  { id: "race",  label: "Race",  icon: "🏁" },
  { id: "stats", label: "Stats", icon: "📊" },
];

function TabBar({ active, onChange }) {
  return (
    <div className="tab-bar">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`tab-btn ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          <span className="icon">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TRAINING VIEW (shown when not race day)
// ────────────────────────────────────────────────────────────
function TrainingView() {
  const today = new Date();
  const race  = new Date("2026-06-07");
  const daysLeft = Math.max(0, Math.ceil((race - today) / 86400000));

  return (
    <div className="scroll-pane" style={{ textAlign: "center" }}>
      <div style={{ paddingTop: 60 }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🏃‍♀️</div>
        <div className="display" style={{ fontSize: 28, color: C.pink, marginBottom: 8,
          textShadow: "0 0 24px rgba(255,0,128,0.5)" }}>
          TRAINING MODE
        </div>
        <div className="marker" style={{ fontSize: 16, color: C.muted, marginBottom: 32 }}>
          Race day unlocks on 7 Jun
        </div>
        <div className="card" style={{ display: "inline-block", padding: "24px 40px" }}>
          <div className="stat-num" style={{ fontSize: 48 }}>{daysLeft}</div>
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>
            Days to Endure 24
          </div>
        </div>
        <div style={{ marginTop: 24, color: C.muted, fontSize: 13 }}>
          The Race Day dashboard will appear automatically on race day.
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ROOT APP
// ────────────────────────────────────────────────────────────
export default function App() {
  const [myName,    setMyName]    = useState(() => localStorage.getItem("bs-runner") || "");
  const [laps,      setLaps]      = useState([]);
  const [raceMeta,  setRaceMeta]  = useState(null);
  const [tab,       setTab]       = useState("race");
  const [authReady, setAuthReady] = useState(false);

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) await signInAnonymously(auth);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // ── Listen: race_meta ──
  useEffect(() => {
    if (!authReady) return;
    const unsub = onSnapshot(doc(db, "race_meta", "config"), snap => {
      setRaceMeta(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, [authReady]);

  // ── Listen: laps collection ──
  useEffect(() => {
    if (!authReady) return;
    const q = query(collection(db, "laps"), orderBy("claimedAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setLaps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [authReady]);

  // ── Save name ──
  const handleNameChosen = useCallback(name => {
    localStorage.setItem("bs-runner", name);
    setMyName(name);
  }, []);

  // ── Loading ──
  if (!authReady) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, animation: "slideUp 0.5s ease" }}>🏃‍♀️</div>
          <div className="display" style={{ color: C.pink, marginTop: 12 }}>Loading…</div>
        </div>
      </div>
    );
  }

  // ── Onboarding ──
  if (!myName) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <Onboarding onComplete={handleNameChosen} />
      </>
    );
  }

  const raceActive = isRaceDay(raceMeta);

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{
        padding: "12px 16px 10px",
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div className="display" style={{ fontSize: 14, color: C.pink, letterSpacing: 2 }}>
          BLISTER SISTERS
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar name={myName} idx={TEAM_NAMES.indexOf(myName)} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{myName}</span>
          <button
            className="btn-ghost btn"
            style={{ padding: "4px 10px", fontSize: 10 }}
            onClick={() => { localStorage.removeItem("bs-runner"); setMyName(""); }}
          >
            Switch
          </button>
        </div>
      </div>

      {/* Main content */}
      {!raceActive ? (
        <TrainingView />
      ) : (
        <>
          {tab === "race"  && <RaceDayView laps={laps} myName={myName} raceMeta={raceMeta} />}
          {tab === "stats" && <StatsView laps={laps} />}
          <TabBar active={tab} onChange={setTab} />
        </>
      )}
    </>
  );
}
