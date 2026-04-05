import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, Calendar, Activity, ChevronRight, CheckCircle2, 
  Trophy, Plus, X, Heart, TrendingUp, AlertCircle, Watch,
  Zap, Wind, Mountain, MapPin, History, Navigation, Map, CalendarDays,
  Users, PlayCircle, PlusCircle, ArrowUpRight, Target, Settings, LogOut,
  Timer, Gauge, ListChecks, Info, Edit3, Lock, Unlock, Save, RefreshCw
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, onAuthStateChanged, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, getDoc 
} from 'firebase/firestore';

// ==========================================
// 🛠️ SETTINGS
// ==========================================
const DEBUG_FORCE_RACE_DAY = false; 
const TEAM_INVITE_CODE = 'ENDURE24';
const LAP_DISTANCE = 5; 

// --- DATE CONSTANTS ---
const PLAN_START_DATE = new Date('2026-02-23T00:00:00'); 
const EVENT_DATE_DEFAULT = new Date('2026-06-06T12:00:00'); 

// --- UTILITY FUNCTIONS (Hoisted) ---
function getCurrentTrainingDay() {
  const now = new Date();
  const diffTime = now.getTime() - PLAN_START_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentWeekIndex = Math.floor(diffDays / 7);
  const currentDayIndex = diffDays % 7;
  return { week: currentWeekIndex + 1, dayIndex: currentDayIndex, diffDays };
}

// --- OFFICIAL PDF ALIGNED PLAN ---
const DEFAULT_TRAINING_PLAN = [
  { week: 1, dateStr: "23rd Feb", stage: "build", days: [ { id: "w1-mon", day: "Monday", type: "run", workout: "50 min easy run (conversational pace) (4-5/10 effort)" }, { id: "w1-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w1-wed", day: "interval", type: "run", workout: "25 minutes easy. 6 x 3 minutes HM pace with 25 minutes cool down easy" }, { id: "w1-thu", day: "Thursday", type: "run", workout: "30 mins easy" }, { id: "w1-fri", day: "Friday", type: "run", workout: "40 min easy" }, { id: "w1-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w1-sun", day: "Sunday", type: "run", workout: "Strong finish run: 50 minutes easy pace then 20 minutes pick up pace to finish strong at a pace you can maintain." } ] },
  { week: 2, dateStr: "2nd March", stage: "build", days: [ { id: "w2-mon", day: "Monday", type: "recovery", workout: "30 mins VERY EASY Recovery run. Listen to your body (3/10)" }, { id: "w2-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w2-wed", day: "interval", type: "run", workout: "Warm up 15 mins. 4 x 5 minute intervals at HM pace with 3 minutes jog between. cool down 10 mins" }, { id: "w2-thu", day: "Thursday", type: "run", workout: "40 mins easy" }, { id: "w2-fri", day: "Friday", type: "run", workout: "60 mins easy" }, { id: "w2-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w2-sun", day: "Sunday", type: "run", workout: "25 minutes easy, 15 minutes at HM pace, 15 minutes easy, 15 min at HM pace then 25 minutes easy" } ] },
  { week: 3, dateStr: "9th March", stage: "build", days: [ { id: "w3-mon", day: "Monday", type: "recovery", workout: "40 mins VERY EASY recovery run" }, { id: "w3-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w3-wed", day: "hills", type: "run", workout: "Hill sprints: warm up 2 miles, 8-10x 40 secs up hill. recovery on way back down. Cool down 2 miles" }, { id: "w3-thu", day: "Thursday", type: "run", workout: "40 mins Easy" }, { id: "w3-fri", day: "Friday", type: "run", workout: "Double day: 30 min + 60 min easy. Can be combined as one 90 minute run if preferred." }, { id: "w3-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w3-sun", day: "Sunday", type: "run", workout: "Long run: 2 hours easy pace" } ] },
  { week: 4, dateStr: "16th March", stage: "build", days: [ { id: "w4-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" }, { id: "w4-tue", day: "Tuesday", type: "run", workout: "60 min easy" }, { id: "w4-wed", day: "interval", type: "run", workout: "Morning Intervals: 8 x 2mins 10k pace (60-90 sec rec). Afternoon: 30 minutes recovery run very easy." }, { id: "w4-thu", day: "Thursday", type: "run", workout: "60 min easy" }, { id: "w4-fri", day: "Friday", type: "run", workout: "Double day: 40 min + 60 min easy." }, { id: "w4-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w4-sun", day: "Sunday", type: "run", workout: "Strong finish run: 90 minutes easy, then 25 minutes pick up pace to finish strong at a pace you can maintain." } ] },
  { week: 5, dateStr: "23rd March", stage: "build", days: [ { id: "w5-mon", day: "Monday", type: "recovery", workout: "30 min recovery. very easy" }, { id: "w5-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w5-wed", day: "interval", type: "run", workout: "75 min easy. Option: 4 x 6 mins HM pace with 3 minutes jog between." }, { id: "w5-thu", day: "Thursday", type: "run", workout: "60 min recovery very easy" }, { id: "w5-fri", day: "Friday", type: "run", workout: "40 min easy" }, { id: "w5-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w5-sun", day: "Sunday", type: "run", workout: "Long run: 90 min easy" } ] },
  { week: 6, dateStr: "30th March", stage: "build", days: [ { id: "w6-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" }, { id: "w6-tue", day: "Tuesday", type: "run", workout: "60 min easy" }, { id: "w6-wed", day: "hills", type: "run", workout: "Hills: 15 mins warm up, 6-8 sets of 2 mins up, recovery on way down, 15 mins cool down. Afternoon: 40 minutes recovery run." }, { id: "w6-thu", day: "Thursday", type: "run", workout: "60 min easy" }, { id: "w6-fri", day: "Friday", type: "run", workout: "Double day: 30 min + 60 min easy. (Can be combined as 90 min)" }, { id: "w6-sat", day: "Saturday", type: "run", workout: "30 minutes easy" }, { id: "w6-sun", day: "Sunday", type: "run", workout: "Long run: 14-15 miles easy pace" } ] },
  { week: 7, dateStr: "6th April", stage: "build", days: [ { id: "w7-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" }, { id: "w7-tue", day: "Tuesday", type: "run", workout: "45 mins easy" }, { id: "w7-wed", day: "interval", type: "run", workout: "Morning: 4 x 1 mile at HM pace (5 min rec). Afternoon: 35 minutes recovery run very easy." }, { id: "w7-thu", day: "Thursday", type: "recovery", workout: "70 min recovery very easy" }, { id: "w7-fri", day: "Friday", type: "run", workout: "Double day: 40 min + 50 min easy." }, { id: "w7-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w7-sun", day: "Sunday", type: "run", workout: "20 mins easy pace, 30 mins moderate pace, 30 mins easy pace" } ] },
  { week: 8, dateStr: "13th April", stage: "build", days: [ { id: "w8-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" }, { id: "w8-tue", day: "Tuesday", type: "run", workout: "60 min easy" }, { id: "w8-wed", day: "interval", type: "run", workout: "30 mins moderate pace, 20 mins easy pace" }, { id: "w8-thu", day: "Thursday", type: "run", workout: "70 min recovery very easy" }, { id: "w8-fri", day: "Friday", type: "run", workout: "45 min easy" }, { id: "w8-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w8-sun", day: "Sunday", type: "run", workout: "Long run: 16-17 miles easy pace" } ] },
  { week: 9, dateStr: "20th April", stage: "step back", days: [ { id: "w9-mon", day: "Monday", type: "recovery", workout: "40 mins recovery very easy" }, { id: "w9-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w9-wed", day: "run", workout: "Double day: 40 min + 40 min easy" }, { id: "w9-thu", day: "Thursday", type: "rest", workout: "REST" }, { id: "w9-fri", day: "Friday", type: "run", workout: "60 min easy" }, { id: "w9-sat", day: "Saturday", type: "run", workout: "35 mins easy" }, { id: "w9-sun", day: "Sunday", type: "run", workout: "Long run: 100 mins easy" } ] },
  { week: 10, dateStr: "27th April", stage: "peak", days: [ { id: "w10-mon", day: "Monday", type: "run", workout: "30 min easy" }, { id: "w10-tue", day: "Tuesday", type: "run", workout: "60 min at or below MAF" }, { id: "w10-wed", day: "interval", type: "run", workout: "Morning: 5 x 1km at 10k pace (2 min rec). Afternoon: 30 mins recovery run." }, { id: "w10-thu", day: "Thursday", type: "recovery", workout: "40 min recovery very easy" }, { id: "w10-fri", day: "Friday", type: "run", workout: "Double day: 40+30 min easy" }, { id: "w10-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w10-sun", day: "Sunday", type: "run", workout: "Long run 18 miles: 6m very easy, 6m at 10-20s faster, 6m at 10-20s faster." } ] },
  { week: 11, dateStr: "4th May", stage: "peak", days: [ { id: "w11-mon", day: "Monday", type: "recovery", workout: "40 mins recovery very easy" }, { id: "w11-tue", day: "Tuesday", type: "run", workout: "45 mins easy" }, { id: "w11-wed", day: "run", workout: "Morning: 45 mins fartleks or hills. Afternoon: 60 mins recovery very easy." }, { id: "w11-thu", day: "Thursday", type: "run", workout: "60 min easy" }, { id: "w11-fri", day: "Friday", type: "run", workout: "Double day: 40 min + 40 min easy" }, { id: "w11-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w11-sun", day: "Sunday", type: "run", workout: "Long run: 2.5 hours total" } ] },
  { week: 12, dateStr: "11th May", stage: "peak", days: [ { id: "w12-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" }, { id: "w12-tue", day: "Tuesday", type: "run", workout: "50 mins easy" }, { id: "w12-wed", day: "interval", type: "run", workout: "Speed session: 2 mile warm up, 15 x 200m (1 min rec), 2 mile cool down." }, { id: "w12-thu", day: "Thursday", type: "run", workout: "60 min easy" }, { id: "w12-fri", day: "Friday", type: "run", workout: "Double day: 40 min + 30 min easy" }, { id: "w12-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w12-sun", day: "Sunday", type: "run", workout: "Long run: 20-22 miles" } ] },
  { week: 13, dateStr: "18th May", stage: "taper week 1", days: [ { id: "w13-mon", day: "Monday", type: "recovery", workout: "30 mins recovery very easy" }, { id: "w13-tue", day: "Tuesday", type: "run", workout: "60 min easy" }, { id: "w13-wed", day: "interval", type: "run", workout: "Morning: 3 x 1 miles 10k pace (3 min jog rec). Afternoon: 40 mins recovery run below MAF." }, { id: "w13-thu", day: "Thursday", type: "recovery", workout: "60 min recovery very easy" }, { id: "w13-fri", day: "Friday", type: "run", workout: "Double day: 40 min + 60 min easy" }, { id: "w13-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w13-sun", day: "Sunday", type: "run", workout: "Tempo run: 30e, 15HM, 15e, 15HM, 30e (mins)." } ] },
  { week: 14, dateStr: "25th May", stage: "taper week 2", days: [ { id: "w14-mon", day: "Monday", type: "recovery", workout: "30 mins recovery very easy" }, { id: "w14-tue", day: "Tuesday", type: "run", workout: "60 min easy" }, { id: "w14-wed", day: "hills", type: "run", workout: "Morning Hills: 15 min warm up, 8-10 x 60 sec hill, 15 min cool down." }, { id: "w14-thu", day: "Thursday", type: "recovery", workout: "45 min recovery very easy" }, { id: "w14-fri", day: "Friday", type: "run", workout: "60 mins easy" }, { id: "w14-sat", day: "Saturday", type: "run", workout: "50 mins easy" }, { id: "w14-sun", day: "Sunday", type: "run", workout: "70 mins easy" } ] },
  { week: 15, dateStr: "1st June", stage: "taper week 3", days: [ { id: "w15-mon", day: "Monday", type: "rest", workout: "REST" }, { id: "w15-tue", day: "Tuesday", type: "run", workout: "40 min easy" }, { id: "w15-wed", day: "run", workout: "10 mins warm up, 25 mins fartleks, 10 mins cool down." }, { id: "w15-thu", day: "Thursday", type: "rest", workout: "REST" }, { id: "w15-fri", day: "Friday", type: "run", workout: "30 mins easy" }, { id: "w15-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w15-sun", day: "Sunday", type: "race", workout: "ENDURE 24! READING 🔥" } ] }
];

const AVATAR_EMOJIS_LIST = ['🏃‍♀️', '🐆', '🦄', '⚡', '🦋', '🦊', '🔥', '👑', '😎', '💪', '🚀', '🌟', '💖', '🦖', '🐢', '🤘', '💃', '💫', '🏆', '🌈', '🐾', '🏃🏽‍♀️', '🏃🏾‍♀️', '💯'];
const AVATAR_BGS_LIST = [
  'from-pink-500 to-rose-600',
  'from-fuchsia-500 to-pink-500',
  'from-pink-400 to-orange-400',
  'from-rose-500 to-indigo-600',
  'from-purple-600 to-pink-400',
  'from-teal-400 to-pink-500',
  'from-pink-500 to-teal-400',
  'from-purple-500 to-pink-500',
  'from-rose-500 to-pink-600',
  'from-indigo-500 via-purple-500 to-pink-500',
  'from-orange-500 to-rose-500',
  'from-blue-400 to-indigo-500',
];

const StravaIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" /></svg>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [teamProfiles, setTeamProfiles] = useState([]);
  const [relayLaps, setRelayLaps] = useState([]);
  const [raceMeta, setRaceMeta] = useState({ startTime: EVENT_DATE_DEFAULT.getTime(), goalMiles: 100 });
  const [trainingPlan, setTrainingPlan] = useState(DEFAULT_TRAINING_PLAN);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  
  // Modals / UI State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [planEditDay, setPlanEditDay] = useState(null);
  
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'blister-sisters-app';
  
  const app = useMemo(() => initializeApp(firebaseConfig), [firebaseConfig]);
  const auth = useMemo(() => getAuth(app), [app]);
  const db = useMemo(() => getFirestore(app), [app]);

  // --- DERIVED STATE ---
  const { week: currentWeekNum, dayIndex, diffDays } = useMemo(() => getCurrentTrainingDay(), []);

  const isRaceDay = useMemo(() => {
    if (DEBUG_FORCE_RACE_DAY) return true;
    const now = new Date();
    const raceStart = new Date(raceMeta.startTime);
    const raceEnd = new Date(raceMeta.startTime + (48 * 3600000));
    return now >= new Date(raceStart.getFullYear(), raceStart.getMonth(), raceStart.getDate()) && now < raceEnd;
  }, [raceMeta.startTime]);

  // Favicon logic
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='7' fill='%23ec4899'/%3E%3Cpath d='M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
  }, []);

  // Firebase sequences
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {}
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { 
      setUser(currentUser); 
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const unsubLogs = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'run_logs'), (s) => {
      setLogs(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubProfiles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'profiles'), (s) => {
      const pData = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeamProfiles(pData);
      const myP = pData.find(p => p.id === user.uid);
      if (myP) setProfile(myP);
      else if (!user.isAnonymous) setShowProfileSetup(true);
    });

    const unsubRelay = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'laps'), (s) => {
      setRelayLaps(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.lapNumber - b.lapNumber));
    });

    const unsubMeta = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'race_meta', 'main'), (s) => {
      if (s.exists()) setRaceMeta(s.data());
    });

    const unsubPlan = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'training', 'plan'), async (s) => {
      if (s.exists()) {
        setTrainingPlan(s.data().weeks);
      } else {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'training', 'plan'), { weeks: DEFAULT_TRAINING_PLAN });
      }
      setLoading(false);
    });

    return () => { unsubLogs(); unsubProfiles(); unsubRelay(); unsubMeta(); unsubPlan(); };
  }, [user, db, appId]);

  // Derived calculations
  const todayWorkout = useMemo(() => {
    const week = trainingPlan.find(w => w.week === currentWeekNum);
    return week ? { day: week.days[dayIndex], week } : null;
  }, [trainingPlan, currentWeekNum, dayIndex]);

  const effectivelyCompletedIds = useMemo(() => {
    let pastIds = [];
    let counter = 0;
    for (const w of trainingPlan) {
      for (const d of w.days) {
        if (counter < diffDays && d.workout !== "REST") pastIds.push(d.id);
        counter++;
      }
    }
    return Array.from(new Set([...logs.map(l => l.dayId), ...pastIds]));
  }, [logs, trainingPlan, diffDays]);

  const totalWorkoutsCount = useMemo(() => trainingPlan.reduce((acc, w) => acc + w.days.filter(d => d.workout !== "REST").length, 0), [trainingPlan]);
  const completionPct = Math.round((effectivelyCompletedIds.length / totalWorkoutsCount) * 100) || 0;

  const openLogModal = (dayData, weekData) => { setSelectedDay({ ...dayData, week: weekData.week }); setLogModalOpen(true); };
  
  const updateWorkout = async (weekIndex, dayId, newWorkoutText) => {
    const updatedPlan = [...trainingPlan];
    const day = updatedPlan[weekIndex].days.find(d => d.id === dayId);
    if (day) day.workout = newWorkoutText;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'training', 'plan'), { weeks: updatedPlan });
    setPlanEditDay(null);
  };

  const resetPlanToDefault = async () => {
    if (!window.confirm("Master Reset: This replaces the team plan with the original PDF schedule. Proceed?")) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'training', 'plan'), { weeks: DEFAULT_TRAINING_PLAN });
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-pink-500 font-sans font-black uppercase tracking-widest"><Watch className="animate-spin w-12 h-12 mb-6" /> Mission Control...</div>;
  if (!user) return <AuthScreen auth={auth} />;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-pink-500 selection:text-white pb-24 md:pb-0">
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-pink-900/30 px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg"><Flame className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white uppercase italic leading-none">Blister Sisters</h1>
              <p className="text-[10px] text-pink-400 font-black tracking-widest uppercase mt-1">{isRaceDay ? "RACE DAY LIVE" : "Training HQ"}</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden md:flex space-x-6 mr-6">
              <NavButton icon={<Activity />} label="Dash" isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
              <NavButton icon={<Calendar />} label="Plan" isActive={view === 'plan'} onClick={() => setView('plan')} />
              <NavButton icon={<TrendingUp />} label="Stats" isActive={view === 'stats'} onClick={() => setView('stats')} />
              <NavButton icon={<Users />} label="Team" isActive={view === 'team'} onClick={() => setView('team')} />
            </div>
            {profile && <button onClick={() => setIsEditingProfile(true)} className="p-2 text-neutral-400 hover:text-pink-500 transition-colors bg-neutral-900 rounded-full border border-neutral-800"><Settings className="w-5 h-5" /></button>}
            <button onClick={() => signOut(auth)} className="p-2 text-neutral-400 hover:text-pink-500 transition-colors bg-neutral-900 rounded-full border border-neutral-800 ml-2"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8">
        {view === 'dashboard' && (
          isRaceDay 
          ? <RaceDayDashboard raceMeta={raceMeta} laps={relayLaps} user={user} db={db} appId={appId} currentProfile={profile} /> 
          : <DashboardView logs={logs} openLogModal={openLogModal} todayWorkout={todayWorkout} totalMiles={logs.reduce((a,c)=>a+(Number(c.distance)||0),0)} completionPct={completionPct} profile={profile || {}} currentWeekNum={currentWeekNum} diffDays={diffDays} />
        )}
        {view === 'plan' && (
          <PlanView 
            logs={logs} 
            trainingPlan={trainingPlan}
            completedLogIds={effectivelyCompletedIds} 
            openLogModal={openLogModal} 
            getLogForDay={(id)=>logs.find(l=>l.dayId===id)} 
            currentWeekNum={currentWeekNum} 
            diffDays={diffDays} 
            onEditDay={(day, weekIndex) => setPlanEditDay({ ...day, weekIndex })}
          />
        )}
        {view === 'stats' && <StatsView logs={logs} completionPct={completionPct} />}
        {view === 'team' && <TeamView profiles={teamProfiles} relayLaps={relayLaps} user={user} db={db} appId={appId} currentProfile={profile} raceMeta={raceMeta} onResetPlan={resetPlanToDefault} />}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-950/90 backdrop-blur-md border-t border-neutral-800 flex justify-around p-2 z-40 pb-safe shadow-2xl">
        <MobileNavButton icon={<Activity />} label="Dash" isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
        <MobileNavButton icon={<Calendar />} label="Plan" isActive={view === 'plan'} onClick={() => setView('plan')} />
        <MobileNavButton icon={<TrendingUp />} label="Stats" isActive={view === 'stats'} onClick={() => setView('stats')} />
        <MobileNavButton icon={<Users />} label="Team" isActive={view === 'team'} onClick={() => setView('team')} />
      </nav>

      {planEditDay && <EditPlanModal day={planEditDay} onClose={() => setPlanEditDay(null)} onSave={(text) => updateWorkout(planEditDay.weekIndex, planEditDay.id, text)} />}
      {logModalOpen && selectedDay && <LogModal day={selectedDay} existingLog={logs.find(l=>l.dayId===selectedDay.id)} onClose={() => { setLogModalOpen(false); setSelectedDay(null); }} db={db} user={user} appId={appId} profile={profile || {}} />}
      {(showProfileSetup || isEditingProfile) && user && <ProfileSetupModal user={user} db={db} appId={appId} existingProfile={isEditingProfile ? profile : null} onClose={() => { setShowProfileSetup(false); setIsEditingProfile(false); }} />}
    </div>
  );
}

// --- VIEWS ---

function RaceDayDashboard({ raceMeta, laps, user, db, appId, currentProfile }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Date.now() - (raceMeta.startTime || Date.now());
      if (diff < 0) { setElapsed('Starting Soon...'); return; }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${hours}h ${mins}m ${secs}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [raceMeta.startTime]);

  const completedLaps = laps.filter(l => l.status === 'complete');
  const runningLap = laps.find(l => l.status === 'running');
  const nextLap = laps.find(l => l.status === 'claimed');
  const totalMiles = completedLaps.length * LAP_DISTANCE;
  const totalDurationMs = completedLaps.reduce((acc, lap) => acc + (lap.endTime - lap.startTime), 0);
  const avgPace = totalMiles > 0 ? (totalDurationMs / 60000) / totalMiles : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-pink-600 to-rose-700 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-pink-200 mb-2">Race Time Elapsed</p>
          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg">{elapsed}</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-pink-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <h3 className="text-xs font-black uppercase tracking-widest text-pink-500 mb-4 flex items-center">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping mr-2"></span> On Course
          </h3>
          {runningLap ? <div className="flex items-center space-x-4 relative z-10"><div className="text-2xl">🏃‍♀️</div><div><p className="text-xl font-black text-white">{String(runningLap.runnerName)}</p><p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Lap {String(runningLap.lapNumber)}</p></div></div> : <p className="text-neutral-500 italic text-sm">Nobody out right now.</p>}
        </div>
        <div className="bg-neutral-900 border border-teal-500/30 rounded-3xl p-6 shadow-xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-teal-400 mb-4">On Deck</h3>
          {nextLap ? <div className="flex items-center space-x-4 relative z-10"><div className="text-2xl">🔥</div><div><p className="text-xl font-black text-white">{String(nextLap.runnerName)}</p><p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Ready for Lap {String(nextLap.lapNumber)}</p></div></div> : <p className="text-neutral-500 italic text-sm">Next slot open!</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Activity />} label="Total Distance" val={totalMiles} unit="mi" color="text-pink-500" />
        <StatCard icon={<Timer />} label="Avg Pace" val={avgPace > 0 ? `${Math.floor(avgPace)}:${Math.round((avgPace%1)*60).toString().padStart(2,'0')}` : '--'} unit="/mi" color="text-teal-400" />
        <StatCard icon={<Gauge />} label="Laps Done" val={completedLaps.length} unit="laps" color="text-purple-500" />
        <StatCard icon={<Target />} label="Remaining" val={Math.max(0, raceMeta.goalMiles - totalMiles)} unit="mi" color="text-indigo-400" />
      </div>
    </div>
  );
}

function PlanView({ logs, trainingPlan, completedLogIds, openLogModal, getLogForDay, currentWeekNum, diffDays, onEditDay }) {
  const [expandedWeek, setExpandedWeek] = useState(currentWeekNum > 0 && currentWeekNum <= 15 ? currentWeekNum : 1);
  const [isEditMode, setIsEditMode] = useState(false);

  const getStageColor = (stage) => {
    if (stage.includes('peak')) return 'bg-rose-500/10 border-rose-500/40';
    if (stage.includes('step back')) return 'bg-amber-500/10 border-amber-500/40';
    if (stage.includes('taper')) return 'bg-purple-500/10 border-purple-500/40';
    return 'bg-pink-500/5 border-white/5';
  };

  const getStageTextColor = (stage) => {
    if (stage.includes('peak')) return 'text-rose-400';
    if (stage.includes('step back')) return 'text-amber-400';
    if (stage.includes('taper')) return 'text-purple-400';
    return 'text-pink-400';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight">Training Log</h2><button onClick={() => setIsEditMode(!isEditMode)} className={`flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isEditMode ? 'bg-pink-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}>{isEditMode ? <><Unlock className="w-3.5 h-3.5 mr-2" /> Editing Mode</> : <><Lock className="w-3.5 h-3.5 mr-2" /> Modify Plan</>}</button></div>
      <div className="space-y-8">
        <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
          <h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] mb-6 flex items-center"><Activity className="w-4 h-4 mr-2 text-teal-400" /> Training Density</h3>
          <div className="overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-2.5 min-w-max items-start">
              <div className="flex flex-col gap-2.5 text-[9px] font-black text-neutral-600 uppercase tracking-widest mr-2 mt-6 justify-between h-[155px]"><span className="h-4 flex items-center">Mon</span><span className="h-4 flex items-center">Wed</span><span className="h-4 flex items-center">Fri</span><span className="h-4 flex items-center">Sun</span></div>
              {trainingPlan.map((week, wIndex) => (
                <div key={week.week} className={`flex flex-col gap-2 p-1.5 rounded-xl border ${getStageColor(week.stage)}`}>
                  <div className={`text-[9px] font-black text-center mb-1 uppercase tracking-tighter ${getStageTextColor(week.stage)}`}>W{week.week}</div>
                  {week.days.map((day, dIndex) => {
                    const globalDayIndex = (wIndex * 7) + dIndex;
                    const isRest = day.workout === "REST";
                    const isLogged = logs.find(l => l.dayId === day.id);
                    const isPast = globalDayIndex < diffDays;
                    const isToday = globalDayIndex === diffDays;
                    let cellClass = "w-5 h-5 rounded-md transition-all cursor-pointer border ";
                    if (isLogged) cellClass += "bg-pink-500 border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.5)] scale-105 z-10";
                    else if (isRest) cellClass += "bg-neutral-950 border-neutral-800 opacity-30 cursor-default";
                    else if (isToday) cellClass += "bg-neutral-900 border-pink-500 animate-pulse ring-2 ring-pink-500/20 z-10";
                    else if (isPast) cellClass += "bg-teal-600 border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.3)]";
                    else cellClass += "bg-neutral-900 border-white/10 hover:border-pink-500/50";
                    return <button key={day.id} onClick={() => !isRest && openLogModal(day, week)} className={cellClass} disabled={isRest} title={`${day.day}: ${day.workout}`} />;
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-[9px] font-black text-neutral-500 uppercase tracking-widest pt-5 border-t border-white/5">
            <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-neutral-900 border border-neutral-800 mr-2 opacity-30"></div> Rest</span>
            <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-neutral-900 border border-white/10 mr-2"></div> Future</span>
            <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-teal-600 border border-teal-400 mr-2"></div> Done</span>
            <span className="flex items-center"><div className="w-3 h-3 rounded-sm bg-pink-500 border border-pink-400 mr-2 shadow-[0_0_5px_rgba(236,72,153,0.5)]"></div> Logged</span>
            <span className="ml-auto flex gap-3">
               <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></div> Peak</span>
               <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></div> Step Back</span>
            </span>
          </div>
        </div>

        {trainingPlan.map((week, wIndex) => (
          <div key={week.week} className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden transition-all shadow-xl">
            <button onClick={() => setExpandedWeek(expandedWeek === week.week ? null : week.week)} className={`w-full flex items-center justify-between p-6 bg-neutral-900 hover:bg-neutral-800/50 transition-colors text-left border-l-4 ${getStageTextColor(week.stage).replace('text', 'border')}`}>
              <div><div className="flex items-center space-x-3"><h3 className="text-lg font-black text-white italic">Week {week.week}</h3><span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-neutral-950 border border-white/5 ${getStageTextColor(week.stage)}`}>{week.stage}</span></div><p className="text-xs text-neutral-500 font-bold tracking-wide mt-1.5">Begins {week.dateStr}</p></div>
              <ChevronRight className={`transform transition-transform ${expandedWeek === week.week ? 'rotate-90 text-pink-500' : 'text-neutral-500'}`} />
            </button>
            {expandedWeek === week.week && (
              <div className="divide-y divide-neutral-800/50 border-t border-neutral-800 bg-neutral-950/30">
                {week.days.map((day) => {
                  const isRest = day.workout === "REST";
                  const isCompleted = completedLogIds.includes(day.id);
                  const logData = getLogForDay(day.id);
                  return (
                    <div key={day.id} className={`p-5 flex gap-5 transition-colors ${isRest ? 'opacity-40' : 'hover:bg-neutral-800/40'}`}>
                      <div className="flex-shrink-0 flex flex-col items-center pt-1 w-12"><span className="text-[10px] font-black uppercase text-neutral-600 tracking-[0.2em] mb-1">{day.day.substring(0,3)}</span>{isCompleted ? <CheckCircle2 className="w-6 h-6 text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.4)]" /> : isRest ? <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 mt-2"></div> : <div className="w-6 h-6 rounded-full border-2 border-pink-500 mt-1"></div>}</div>
                      <div className="flex-1" onClick={() => !isEditMode && !isRest && openLogModal(day, week)}>
                        <p className={`text-base font-medium leading-relaxed ${isRest ? 'text-neutral-600 italic' : 'text-neutral-100'}`}>{day.workout}</p>
                        {isCompleted && logData && (<div className="mt-4 p-4 bg-neutral-900/50 border border-teal-500/20 rounded-2xl shadow-inner"><div className="flex flex-wrap gap-y-2 items-center space-x-5 text-[11px] font-black uppercase tracking-widest text-teal-400">{logData.distance > 0 && <span>{logData.distance} mi</span>}{logData.duration > 0 && <span>{logData.duration} min</span>}{logData.vibe && <span className="text-lg">{String(logData.vibe)}</span>}</div></div>)}
                      </div>
                      {isEditMode && (<button onClick={() => onEditDay(day, wIndex)} className="p-3 bg-neutral-800 hover:bg-pink-600 rounded-xl text-white self-center transition-all shadow-lg"><Edit3 className="w-4 h-4" /></button>)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardView({ logs, openLogModal, todayWorkout, totalMiles, completionPct, profile, currentWeekNum, diffDays }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0 });
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = EVENT_DATE_DEFAULT.getTime() - Date.now();
      if (diff > 0) setTimeLeft({ days: Math.floor(diff/86400000), hours: Math.floor((diff%86400000)/3600000) });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const currentDayNumber = Math.min(Math.max(diffDays + 1, 1), 105);
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl group min-h-[180px]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity grayscale group-hover:scale-110 transition-transform duration-1000" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1552674605-15c371123a61?auto=format&fit=crop&w=1200&q=80')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-pink-500/20 border border-pink-500/30 text-pink-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-sm shadow-xl"><CalendarDays className="w-3.5 h-3.5" /><span>Day {Number(currentDayNumber)} of 105</span></div>
          <h2 className="text-3xl font-black text-white mb-3 tracking-tight leading-tight">Crush it{profile?.displayName ? `, ${String(profile.displayName).split(' ')[0]}` : ''}.</h2>
          <p className="text-neutral-400 max-w-sm font-bold text-sm tracking-wide uppercase">Week {Number(currentWeekNum)} • Every mile counts!</p>
        </div>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-end mb-4"><h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em]">Bootcamp Completion</h3><span className="text-2xl font-black text-white italic">{Number(completionPct)}%</span></div>
        <div className="w-full bg-neutral-950 rounded-full h-4 border border-white/5 overflow-hidden relative shadow-inner">
          <div className="bg-gradient-to-r from-pink-600 via-rose-500 to-teal-400 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(236,72,153,0.3)]" style={{ width: `${completionPct}%` }}></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 rounded-[2rem] p-6 border border-neutral-800 flex flex-col justify-between shadow-2xl group hover:border-pink-500/30 transition-all"><Activity className="text-pink-500 w-6 h-6 mb-2" /><div><div className="text-3xl font-black text-white">{(Number(totalMiles)||0).toFixed(1)}</div><div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mt-1">Team Miles Logged</div></div></div>
        <div className="bg-neutral-900 rounded-[2rem] p-6 border border-neutral-800 flex flex-col justify-between shadow-2xl group hover:border-teal-500/30 transition-all"><CalendarDays className="text-teal-400 w-6 h-6 mb-2" /><div><div className="text-3xl font-black text-white">{Number(timeLeft.days)}d</div><div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mt-1">Until Race Starts</div></div></div>
      </div>
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-500 mb-5 flex items-center"><Flame className="w-4 h-4 mr-2" /> Current Objective</h3>
        {todayWorkout ? (
          <div onClick={() => openLogModal(todayWorkout.day, todayWorkout.week)} className="group cursor-pointer bg-neutral-900 border border-white/5 hover:border-pink-500/50 rounded-3xl p-6 transition-all relative overflow-hidden shadow-2xl">
            <p className="text-[10px] font-black bg-pink-500/20 text-pink-400 px-4 py-1.5 rounded-full uppercase mb-4 inline-block tracking-widest border border-pink-500/20">Week {Number(todayWorkout.week.week)} • {String(todayWorkout.day.day)}</p>
            <p className="text-xl font-bold text-neutral-100 leading-relaxed italic pr-8">{String(todayWorkout.day.workout)}</p>
            <ArrowUpRight className="absolute right-6 top-6 w-6 h-6 text-neutral-700 group-hover:text-pink-500 transition-colors" />
            <div className="mt-6 flex items-center text-[10px] text-pink-500/60 uppercase font-black tracking-[0.2em] group-hover:text-pink-400 transition-colors"><Activity className="w-4 h-4 mr-2" /> Tap to log session</div>
          </div>
        ) : <p className="text-neutral-500 italic text-sm text-center py-8 bg-neutral-900/50 border border-neutral-800 rounded-3xl border-dashed">Rest day! Recovery is training too.</p>}
      </div>
    </div>
  );
}

function StatCard({ icon, label, val, unit, color }) {
  return (
    <div className="bg-neutral-900 rounded-3xl p-5 border border-neutral-800 flex flex-col justify-between shadow-2xl h-full">
      <div className={`${color} mb-2`}>{React.cloneElement(icon, { className: "w-6 h-6" })}</div>
      <div><div className="text-2xl font-black text-white leading-none">{String(val)}</div><div className="text-[9px] text-neutral-500 font-black uppercase tracking-widest leading-tight mt-2">{String(label)} <br/> {unit && <span className="opacity-40 italic lowercase">({unit})</span>}</div></div>
    </div>
  );
}

function StatsView({ logs, completionPct }) {
  const stats = useMemo(() => {
    const s = { miles: 0, time: 0, elev: 0 };
    logs.forEach(l => { s.miles += Number(l.distance)||0; s.time += Number(l.duration)||0; s.elev += Number(l.elevation)||0; });
    return s;
  }, [logs]);
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black tracking-tight italic">Mission Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-pink-900/40 to-neutral-900 border border-pink-500/20 rounded-[2rem] p-6 shadow-2xl"><Activity className="text-pink-400 mb-3 w-7 h-7" /><div className="text-4xl font-black text-white leading-none">{stats.miles.toFixed(1)}</div><div className="text-[10px] text-pink-200 uppercase font-black tracking-widest mt-3">Total Miles</div></div>
        <div className="bg-gradient-to-br from-teal-900/30 to-neutral-900 border border-teal-500/20 rounded-[2rem] p-6 shadow-2xl"><Watch className="text-teal-400 mb-3 w-7 h-7" /><div className="text-4xl font-black text-white leading-none">{Math.floor(stats.time/60)}<span className="text-xl ml-1">h</span></div><div className="text-[10px] text-teal-200 uppercase font-black tracking-widest mt-3">Time on Feet</div></div>
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-900/30 to-neutral-900 border border-indigo-500/20 rounded-[2rem] p-6 shadow-2xl"><Mountain className="text-indigo-400 mb-3 w-7 h-7" /><div className="text-4xl font-black text-white leading-none">{stats.elev}</div><div className="text-[10px] text-indigo-200 uppercase font-black tracking-widest mt-3">Elevation (ft)</div></div>
      </div>
    </div>
  );
}

function LogModal({ day, existingLog, onClose, db, user, appId, profile }) {
  const [distance, setDistance] = useState(existingLog?.distance || '');
  const [duration, setDuration] = useState(existingLog?.duration || '');
  const [elevation, setElevation] = useState(existingLog?.elevation || '');
  const [effort, setEffort] = useState(existingLog?.effort || 5);
  const [notes, setNotes] = useState(existingLog?.notes || '');
  const [vibe, setVibe] = useState(existingLog?.vibe || '😎');
  const [actualDate, setActualDate] = useState(existingLog?.actualDate || new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => {
    e.preventDefault(); if (!user) return; setSaving(true);
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'run_logs', day.id), { dayId: day.id, weekId: day.week, distance: Number(distance) || 0, duration: Number(duration) || 0, elevation: Number(elevation) || 0, effort: Number(effort) || 0, notes, vibe, actualDate, updatedAt: new Date().toISOString() }); onClose(); } catch (err) { console.error(err); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-neutral-900 rounded-t-[2.5rem] md:rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-7 border-b border-white/5"><div><h3 className="text-2xl font-black text-white italic">Log Run</h3><p className="text-[10px] text-pink-500 font-black uppercase tracking-[0.2em] mt-1.5">Week {day.week} • {day.day}</p></div><button onClick={onClose} className="p-3 bg-neutral-800 text-neutral-400 rounded-full hover:text-white transition-colors shadow-lg"><X className="w-5 h-5" /></button></div>
        <div className="p-7 overflow-y-auto"><div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-5 mb-8 text-sm text-neutral-200 font-medium leading-relaxed italic">"{day.workout}"</div>
          <form id="log-form" onSubmit={handleSave} className="space-y-6">
            <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-2 block">Date Completed</label><input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-pink-500 font-bold [color-scheme:dark]" /></div>
            <div className="grid grid-cols-2 gap-5">
              <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-2 block">Distance (mi)</label><input type="number" step="0.01" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-pink-500 font-black" /></div>
              <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-2 block">Time (min)</label><input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-pink-500 font-black" /></div>
            </div>
            <div><div className="flex justify-between items-center mb-3"><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1">Effort Score</label><span className="text-xl font-black text-pink-500 italic">{effort}/10</span></div><input type="range" min="1" max="10" value={effort} onChange={(e) => setEffort(e.target.value)} className="w-full accent-pink-500 h-2 bg-neutral-800 rounded-full appearance-none" /></div>
            <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-2 block">Session Notes</label><textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white text-sm resize-none focus:outline-none focus:border-pink-500 font-medium" placeholder="How did the blisters feel? Vibe?" /></div>
          </form>
        </div>
        <div className="p-7 border-t border-white/5 bg-neutral-900/50 flex gap-4 pb-safe"><button type="submit" form="log-form" disabled={saving} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl py-5 shadow-[0_0_25px_rgba(219,39,119,0.3)] transition-all transform active:scale-95">{saving ? 'Transmitting...' : 'Save Log'}</button></div>
      </div>
    </div>
  );
}

function AuthScreen({ auth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setError(''); setLoading(true); try { if (!isLogin) { if (inviteCode !== TEAM_INVITE_CODE) throw new Error("Whoops! Incorrect Team Invite Code."); await createUserWithEmailAndPassword(auth, email, password); } else { await signInWithEmailAndPassword(auth, email, password); } } catch (err) { setError(err.message.replace('Firebase:', '').trim()); } finally { setLoading(false); } };
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity grayscale" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1552674605-15c371123a61?auto=format&fit=crop&w=1200&q=80')` }} />
      <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/5 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-10 relative z-10"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.4)] mb-6"><Flame className="w-8 h-8 text-white" /></div><h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Blister Sisters</h1><p className="text-[10px] text-pink-400 font-black uppercase tracking-[0.3em] mt-2">Elite Headquarters</p></div>
        {error && (<div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-[10px] font-black uppercase p-4 rounded-2xl mb-8 text-center tracking-widest">{error}</div>)}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {!isLogin && (<div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-2 block">Team Invite Code</label><input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-pink-500 font-black tracking-widest" placeholder="ENDURE24" required /></div>)}
          <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-2 block">Email Address</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-pink-500 font-bold" required /></div>
          <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-2 block">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-pink-500 font-bold" required /></div>
          <button type="submit" disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.3)] mt-6 transition-all">{loading ? 'Processing...' : (isLogin ? 'Login to HQ' : 'Join Training')}</button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-8 text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] hover:text-white transition-colors relative z-10">{isLogin ? "Not on the team? Sign up here" : "Return to Login"}</button>
      </div>
    </div>
  );
}

function ProfileSetupModal({ user, db, appId, existingProfile, onClose }) {
  const [name, setName] = useState(existingProfile?.displayName || '');
  const [avatarEmoji, setAvatarEmoji] = useState(existingProfile?.avatarEmoji || AVATAR_EMOJIS_LIST[0]);
  const [avatarBg, setAvatarBg] = useState(existingProfile?.avatarBg || AVATAR_BGS_LIST[0]);
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => { e.preventDefault(); if (!name.trim()) return; setSaving(true); try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { displayName: name, avatarEmoji, avatarBg, createdAt: existingProfile ? existingProfile.createdAt : new Date().toISOString() }, { merge: true }); onClose(); } catch(err) { console.error(err); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-neutral-900 border border-white/5 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl relative">
        {existingProfile && (<button onClick={onClose} className="absolute top-6 right-6 p-3 text-neutral-400 bg-neutral-800 rounded-full hover:text-white transition-colors shadow-lg"><X className="w-5 h-5" /></button>)}
        <div className="text-center mb-10 relative z-10"><div className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-5xl shadow-2xl mx-auto mb-6 border-4 border-white/10`}>{String(avatarEmoji)}</div><h2 className="text-2xl font-black text-white italic tracking-tight">{existingProfile ? 'Edit Profile' : 'Welcome, Sister.'}</h2></div>
        <form onSubmit={handleSave} className="space-y-8 text-left relative z-10">
          <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-3 block">Runner Identity</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-white font-black focus:outline-none focus:border-pink-500 shadow-inner" placeholder="e.g. Speedy Sarah" required /></div>
          <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-3 block">Avatar Emoji</label><div className="grid grid-cols-6 gap-3">{AVATAR_EMOJIS_LIST.map(emoji => (<button key={emoji} type="button" onClick={() => setAvatarEmoji(emoji)} className={`h-11 text-2xl flex items-center justify-center rounded-xl transition-all ${avatarEmoji === emoji ? 'bg-pink-600 border border-pink-400 shadow-lg scale-110' : 'bg-neutral-950 border border-neutral-800 opacity-60'}`}>{emoji}</button>))}</div></div>
          <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] ml-1 mb-3 block">Signature Flair (Gradient)</label><div className="grid grid-cols-6 gap-3">{AVATAR_BGS_LIST.map(bg => ( <button key={bg} type="button" onClick={() => setAvatarBg(bg)} className={`h-8 rounded-full bg-gradient-to-br ${bg} transition-all ${avatarBg === bg ? 'ring-2 ring-white scale-125 shadow-xl z-10' : 'opacity-40 hover:opacity-100'}`} /> ))}</div></div>
          <button type="submit" disabled={saving} className="w-full bg-pink-600 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl mt-4 shadow-[0_10px_30px_rgba(236,72,153,0.3)] transform transition-all active:scale-95">{saving ? 'Locking in...' : 'Join the Team'}</button>
        </form>
      </div>
    </div>
  );
}

function NavButton({ icon, label, isActive, onClick }) { return (<button onClick={onClick} className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-pink-500' : 'text-neutral-500 hover:text-neutral-300'}`}>{React.cloneElement(icon, { className: "w-4.5 h-4.5" })}<span>{label}</span></button>); }
function MobileNavButton({ icon, label, isActive, onClick }) { return (<button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${isActive ? 'text-pink-500 scale-110' : 'text-neutral-500'}`}>{React.cloneElement(icon, { className: `w-5.5 h-5.5 mb-1 ${isActive ? 'drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]' : ''}` })}<span className="text-[8px] font-black uppercase tracking-[0.2em]">{label}</span></button>); }
