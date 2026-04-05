import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, Calendar, Activity, ChevronRight, CheckCircle2, 
  Trophy, Plus, X, Heart, TrendingUp, AlertCircle, Watch,
  Zap, Wind, Mountain, MapPin, History, Navigation, Map, CalendarDays,
  Users, PlayCircle, PlusCircle, ArrowUpRight, Target, Settings, LogOut,
  Timer, Gauge, ListChecks, Info, Edit3, Lock, Unlock, Save
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
// 🛠️ PREVIEW SETTINGS
// Set this to TRUE to see the June 6th Race Day Dashboard right now!
// ==========================================
const DEBUG_FORCE_RACE_DAY = false; 

const TEAM_INVITE_CODE = 'ENDURE24';
const LAP_DISTANCE = 5; // Endure 24 laps are 5 miles

// --- DATE CONSTANTS ---
const PLAN_START_DATE = new Date('2026-02-23T00:00:00'); 
const EVENT_DATE_DEFAULT = new Date('2026-06-06T12:00:00'); 

// --- UTILITY FUNCTIONS ---
function getCurrentTrainingDay() {
  const now = new Date();
  const diffTime = now.getTime() - PLAN_START_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentWeekIndex = Math.floor(diffDays / 7);
  const currentDayIndex = diffDays % 7;
  return { week: currentWeekIndex + 1, dayIndex: currentDayIndex, diffDays };
}

const DEFAULT_TRAINING_PLAN = [
  { week: 1, dateStr: "23rd Feb", stage: "build", days: [ { id: "w1-mon", day: "Monday", type: "run", workout: "50 min easy run (conversational pace) (4-5/10 effort)" }, { id: "w1-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w1-wed", day: "interval", type: "run", workout: "25 minutes easy. 6 x 3 minutes HM pace with 25 minutes cool down easy" }, { id: "w1-thu", day: "Thursday", type: "run", workout: "30 mins easy" }, { id: "w1-fri", day: "Friday", type: "run", workout: "40 min easy" }, { id: "w1-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w1-sun", day: "Sunday", type: "run", workout: "Strong finish run: 50 minutes easy pace then 20 minutes pick up pace to finish strong at a pace you can maintain." } ] },
  { week: 2, dateStr: "2nd March", stage: "build", days: [ { id: "w2-mon", day: "Monday", type: "recovery", workout: "30 mins VERY EASY Recovery run. Listen to your body (3/10)" }, { id: "w2-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w2-wed", day: "interval", type: "run", workout: "Warm up 15 mins. 4 x 5 minute intervals at HM pace with 3 minutes jog between. cool down 10 mins" }, { id: "w2-thu", day: "Thursday", type: "run", workout: "40 mins easy" }, { id: "w2-fri", day: "Friday", type: "run", workout: "60 mins easy" }, { id: "w2-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w2-sun", day: "Sunday", type: "run", workout: "25 minutes easy, 15 minutes at HM pace, 15 minutes easy, 15 min at HM pace then 25 minutes easy" } ] },
  { week: 3, dateStr: "9th March", stage: "build", days: [ { id: "w3-mon", day: "Monday", type: "recovery", workout: "40 mins VERY EASY recovery run" }, { id: "w3-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w3-wed", day: "hills", type: "run", workout: "Hill sprints: warm up 2 miles, 8-10x 40 secs up hill. recovery on way back down. Cool down 2 miles" }, { id: "w3-thu", day: "Thursday", type: "run", workout: "40 mins Easy" }, { id: "w3-fri", day: "Friday", type: "run", workout: "Double day: 30 min + 60 min easy. Can be combined as one 90 minute run if preferred." }, { id: "w3-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w3-sun", day: "Sunday", type: "run", workout: "Long run: 2 hours easy pace" } ] },
  { week: 4, dateStr: "16th March", stage: "build", days: [ { id: "w4-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" }, { id: "w4-tue", day: "Tuesday", type: "run", workout: "60 min easy" }, { id: "w4-wed", day: "interval", type: "run", workout: "Morning Intervals: 8 x 2mins 10k pace (60-90 sec rec). Afternoon: 30 minutes recovery run very easy." }, { id: "w4-thu", day: "Thursday", type: "run", workout: "60 min easy" }, { id: "w4-fri", day: "Friday", type: "run", workout: "Double day: 40 min + 60 min easy." }, { id: "w4-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w4-sun", day: "Sunday", type: "run", workout: "Strong finish run: 90 minutes easy, then 25 minutes pick up pace to finish strong at a pace you can maintain." } ] },
  { week: 5, dateStr: "23rd March", stage: "build", days: [ { id: "w5-mon", day: "Monday", type: "recovery", workout: "30 min recovery. very easy" }, { id: "w5-tue", day: "Tuesday", type: "rest", workout: "REST" }, { id: "w5-wed", day: "interval", type: "run", workout: "75 min easy. Option: 4 x 6 mins HM pace with 3 minutes jog between." }, { id: "w5-thu", day: "Thursday", type: "run", workout: "60 min recovery very easy" }, { id: "w5-fri", day: "Friday", type: "run", workout: "40 min easy" }, { id: "w5-sat", day: "Saturday", type: "rest", workout: "REST" }, { id: "w5-sun", day: "Sunday", type: "run", workout: "Long run: 90 min easy" } ] },
  { week: 6, dateStr: "30th March", stage: "step back", days: [ { id: "w6-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" }, { id: "w6-tue", day: "Tuesday", type: "run", workout: "60 min easy" }, { id: "w6-wed", day: "hills", type: "run", workout: "Hills: 15 mins warm up, 6-8 sets of 2 mins up, recovery on way down, 15 mins cool down. Afternoon: 40 minutes recovery run." }, { id: "w6-thu", day: "Thursday", type: "run", workout: "60 min easy" }, { id: "w6-fri", day: "Friday", type: "run", workout: "Double day: 30 min + 60 min easy. (Can be combined as 90 min)" }, { id: "w6-sat", day: "Saturday", type: "run", workout: "30 minutes easy" }, { id: "w6-sun", day: "Sunday", type: "run", workout: "Long run: 14-15 miles easy pace" } ] },
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

const AVATAR_EMOJIS_LIST = ['🏃‍♀️', '🐆', '🦄', '⚡', '🦋', '🦊', '🔥', '👑', '😎', '💪', '🚀', '🌟', '💖', '🦖', '🐢', '🥑', '🍉', '🤘', '💃', '💫', '👟', '🏆', '🌈', '🐾', '🏔️', '🏃🏻‍♀️', '🏃🏽‍♀️', '🏃🏾‍♀️', '🏃🏿‍♀️', '💯'];
const AVATAR_BGS_LIST = [
  'from-pink-500 to-teal-400',
  'from-purple-500 to-pink-500',
  'from-rose-500 to-pink-600',
  'from-fuchsia-500 to-pink-500',
  'from-pink-400 to-rose-400',
  'from-pink-500 to-orange-400',
  'from-indigo-500 via-purple-500 to-pink-500',
  'from-fuchsia-600 to-purple-600',
  'from-orange-500 to-rose-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500'
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

  // Favicon
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='7' fill='%23ec4899'/%3E%3Cpath d='M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
  }, []);

  // Firebase Listeners
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); });
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

  if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-pink-500 font-sans font-black uppercase tracking-widest"><Watch className="animate-spin w-10 h-10 mr-4" /> Powering Up...</div>;
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
        {view === 'team' && <TeamView profiles={teamProfiles} relayLaps={relayLaps} user={user} db={db} appId={appId} currentProfile={profile} raceMeta={raceMeta} />}
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

// --- SUB-COMPONENTS ---

function EditPlanModal({ day, onClose, onSave }) {
  const [text, setText] = useState(String(day.workout || ''));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-neutral-900 border border-pink-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-black text-white mb-4 flex items-center"><Edit3 className="w-5 h-5 mr-2 text-pink-500" /> Edit Workout</h2>
        <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-2">{String(day.day)} • Week {Number(day.weekIndex) + 1}</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-pink-500 mb-6 h-32 resize-none" />
        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-all">Cancel</button>
          <button onClick={() => onSave(text)} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center"><Save className="w-4 h-4 mr-2" /> Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function PlanView({ logs, trainingPlan, completedLogIds, openLogModal, getLogForDay, currentWeekNum, diffDays, onEditDay }) {
  const [expandedWeek, setExpandedWeek] = useState(currentWeekNum > 0 && currentWeekNum <= 15 ? currentWeekNum : 1);
  const [isEditMode, setIsEditMode] = useState(false);
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight">Bootcamp Plan</h2><button onClick={() => setIsEditMode(!isEditMode)} className={`flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${isEditMode ? 'bg-pink-600 text-white shadow-lg' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}>{isEditMode ? <><Unlock className="w-3 h-3 mr-1.5" /> Editing Mode</> : <><Lock className="w-3 h-3 mr-1.5" /> Modify Plan</>}</button></div>
      <div className="space-y-6">
        <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-5 md:p-6 overflow-hidden shadow-lg">
          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center mb-5"><Activity className="w-4 h-4 mr-2 text-teal-400" /> Training Density</h3>
          <div className="overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-2 min-w-max items-start">
              <div className="flex flex-col gap-2 text-[9px] font-bold text-neutral-500 uppercase tracking-widest mr-1 mt-5 justify-between h-full"><span className="h-4 md:h-5 flex items-center">Mon</span><span className="h-4 md:h-5 flex items-center"></span><span className="h-4 md:h-5 flex items-center">Wed</span><span className="h-4 md:h-5 flex items-center"></span><span className="h-4 md:h-5 flex items-center">Fri</span><span className="h-4 md:h-5 flex items-center"></span><span className="h-4 md:h-5 flex items-center">Sun</span></div>
              {trainingPlan.map((week, wIndex) => (
                <div key={week.week} className="flex flex-col gap-2">
                  <div className="text-[8px] font-bold text-neutral-600 text-center mb-1">W{week.week}</div>
                  {week.days.map((day, dIndex) => {
                    const globalDayIndex = (wIndex * 7) + dIndex;
                    const isRest = day.workout === "REST";
                    const isLogged = logs.find(l => l.dayId === day.id);
                    const isPast = globalDayIndex < diffDays;
                    const isToday = globalDayIndex === diffDays;
                    let cellClass = "w-4 h-4 md:w-5 md:h-5 rounded-[4px] transition-all cursor-pointer ";
                    if (isLogged) cellClass += "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]";
                    else if (isRest) cellClass += "bg-neutral-800/40 cursor-default";
                    else if (isToday) cellClass += "bg-neutral-900 border border-pink-500 animate-pulse";
                    else if (isPast) cellClass += "bg-teal-900/30 border border-teal-800/40";
                    else cellClass += "bg-neutral-950 border border-neutral-800";
                    return <button key={day.id} onClick={() => !isRest && openLogModal(day, week)} className={cellClass} disabled={isRest} />;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        {trainingPlan.map((week, wIndex) => (
          <div key={week.week} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden transition-all shadow-md">
            <button onClick={() => setExpandedWeek(expandedWeek === week.week ? null : week.week)} className="w-full flex items-center justify-between p-5 bg-neutral-900 hover:bg-neutral-800/50 transition-colors text-left">
              <div><div className="flex items-center space-x-3"><h3 className="text-lg font-bold">Week {week.week}</h3><span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest bg-neutral-800 text-neutral-400">{week.stage}</span></div><p className="text-xs text-pink-500 font-medium tracking-wide mt-1">Starts {week.dateStr}</p></div>
              <ChevronRight className={`transform transition-transform ${expandedWeek === week.week ? 'rotate-90 text-pink-500' : 'text-neutral-500'}`} />
            </button>
            {expandedWeek === week.week && (
              <div className="divide-y divide-neutral-800/50 border-t border-neutral-800 bg-neutral-950/50">
                {week.days.map((day) => {
                  const isRest = day.workout === "REST";
                  const isCompleted = completedLogIds.includes(day.id);
                  const logData = getLogForDay(day.id);
                  return (
                    <div key={day.id} className={`p-4 flex gap-4 transition-colors ${isRest ? 'opacity-50' : 'hover:bg-neutral-800/40'}`}>
                      <div className="flex-shrink-0 flex flex-col items-center pt-1 w-10"><span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{day.day.substring(0,3)}</span>{isCompleted ? <CheckCircle2 className="w-5 h-5 text-teal-400 mt-1" /> : isRest ? <div className="w-2 h-2 rounded-full bg-neutral-700 mt-2"></div> : <div className="w-5 h-5 rounded-full border-2 border-pink-500 mt-1"></div>}</div>
                      <div className="flex-1" onClick={() => !isEditMode && !isRest && openLogModal(day, week)}>
                        <p className={`text-sm md:text-base leading-snug ${isRest ? 'text-neutral-500' : 'text-neutral-200'}`}>{day.workout}</p>
                        {isCompleted && logData && (<div className="mt-3 p-3 bg-neutral-900 border border-teal-500/20 rounded-xl"><div className="flex flex-wrap gap-y-2 items-center space-x-4 text-xs font-medium text-teal-400">{logData.distance > 0 && <span>{logData.distance} mi</span>}{logData.duration > 0 && <span>{logData.duration} min</span>}{logData.vibe && <span>{String(logData.vibe)}</span>}</div></div>)}
                      </div>
                      {isEditMode && (<button onClick={() => onEditDay(day, wIndex)} className="p-2 bg-neutral-800 hover:bg-pink-600 rounded-lg text-white self-center transition-colors"><Edit3 className="w-4 h-4" /></button>)}
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
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-200 mb-2">Race Time Elapsed</p>
          <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg">{elapsed}</h2>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-pink-500/30 rounded-3xl p-6 relative overflow-hidden">
          <PlayCircle className="absolute -right-6 -bottom-6 w-24 h-24 text-pink-500/5 rotate-12" />
          <h3 className="text-xs font-black uppercase tracking-widest text-pink-500 mb-4 flex items-center">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping mr-2"></span> On Course
          </h3>
          {runningLap ? (
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-2xl">🏃‍♀️</div>
              <div><p className="text-xl font-black text-white">{String(runningLap.runnerName)}</p><p className="text-xs text-neutral-400">Started Lap {String(runningLap.lapNumber)}</p></div>
            </div>
          ) : <p className="text-neutral-500 italic text-sm">Nobody out right now.</p>}
        </div>
        <div className="bg-neutral-900 border border-teal-500/30 rounded-3xl p-6 relative overflow-hidden">
          <Users className="absolute -right-6 -bottom-6 w-24 h-24 text-teal-500/5 -rotate-12" />
          <h3 className="text-xs font-black uppercase tracking-widest text-teal-400 mb-4">On Deck</h3>
          {nextLap ? (
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center text-2xl">🔥</div>
              <div><p className="text-xl font-black text-white">{String(nextLap.runnerName)}</p><p className="text-xs text-neutral-400">Ready for Lap {String(nextLap.lapNumber)}</p></div>
            </div>
          ) : <p className="text-neutral-500 italic text-sm">Next slot open!</p>}
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

function TeamView({ profiles, relayLaps, user, db, appId, currentProfile, raceMeta }) {
  const [activeTab, setActiveTab] = useState('leaderboard'); 
  const sortedProfiles = [...profiles].sort((a, b) => (b.totalMiles || 0) - (a.totalMiles || 0));
  const claimLap = async (lapId) => { if (!user || !currentProfile) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'laps', lapId), { runnerId: user.uid, runnerName: currentProfile.displayName || "Unknown Sister", status: 'claimed' }); };
  const startLap = async (lapId) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'laps', lapId), { status: 'running', startTime: Date.now() }); };
  const finishLap = async (lapId) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'laps', lapId), { status: 'complete', endTime: Date.now() }); };
  const createLap = async () => { const lapId = `lap_${Date.now()}`; await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'laps', lapId), { lapNumber: relayLaps.length + 1, runnerId: null, runnerName: null, status: 'open', createdAt: Date.now() }); };
  const updateRaceMeta = async (field, val) => { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'race_meta', 'main'), { [field]: val }, { merge: true }); };
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex space-x-2 bg-neutral-900 p-1.5 rounded-xl border border-neutral-800">
        <button onClick={() => setActiveTab('leaderboard')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg ${activeTab === 'leaderboard' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Leaderboard</button>
        <button onClick={() => setActiveTab('relay')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg ${activeTab === 'relay' ? 'bg-pink-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Relay Board</button>
        <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg ${activeTab === 'settings' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500'}`}><Settings className="w-4 h-4" /></button>
      </div>
      {activeTab === 'leaderboard' && (
        <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden divide-y divide-neutral-800/50">
          <div className="p-5 bg-neutral-950/30 flex justify-between items-center"><h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Training Miles</h3></div>
          {sortedProfiles.map((p, i) => (
            <div key={p.id} className="p-4 px-6 flex items-center justify-between"><div className="flex items-center space-x-4"><span className="text-neutral-600 font-black">#{i+1}</span><div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.avatarBg || 'from-pink-500 to-teal-400'} flex items-center justify-center`}>{String(p.avatarEmoji || '?')}</div><div><p className="font-bold text-white text-sm">{String(p.displayName || 'Anon')}</p><p className="text-[10px] text-neutral-500 uppercase font-black">{Number(p.totalRuns || 0)} sessions</p></div></div><p className="text-pink-400 font-black">{(Number(p.totalMiles || 0)).toFixed(1)} mi</p></div>
          ))}
        </div>
      )}
      {activeTab === 'relay' && (
        <div className="space-y-4">
          <button onClick={createLap} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center"><PlusCircle className="w-4 h-4 mr-2" /> Add Next 5-Mile Lap</button>
          {relayLaps.map((lap) => (
            <div key={lap.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4"><div className="w-10 h-10 bg-neutral-950 rounded-xl flex items-center justify-center font-black">L{String(lap.lapNumber)}</div><div><p className="font-bold text-white">{String(lap.runnerName || "Unclaimed")}</p><p className="text-[10px] uppercase text-neutral-500 font-bold">{String(lap.status)}</p></div></div>
              <div className="flex space-x-2">
                {!lap.runnerId && <button onClick={() => claimLap(lap.id)} className="bg-teal-500/20 text-teal-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Claim</button>}
                {lap.runnerId === user?.uid && lap.status === 'claimed' && <button onClick={() => startLap(lap.id)} className="bg-pink-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Start</button>}
                {lap.runnerId === user?.uid && lap.status === 'running' && <button onClick={() => finishLap(lap.id)} className="bg-teal-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Finish</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-black text-white">Event Mission Settings</h3>
          <div className="space-y-4">
            <div><label className="text-xs font-bold text-neutral-400 uppercase block mb-1 tracking-widest">Team Goal (Miles)</label><input type="number" value={Number(raceMeta.goalMiles || 100)} onChange={(e) => updateRaceMeta('goalMiles', Number(e.target.value))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-pink-500" /></div>
            <div><label className="text-xs font-bold text-neutral-400 uppercase block mb-1 tracking-widest">Race Start Time</label><input type="datetime-local" value={new Date((raceMeta.startTime || Date.now()) - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0,16)} onChange={(e) => updateRaceMeta('startTime', new Date(e.target.value).getTime())} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-pink-500 [color-scheme:dark]" /></div>
          </div>
        </div>
      )}
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl group min-h-[160px]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&w=1200&q=80')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/80 to-transparent"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-pink-500/20 border border-pink-500/30 text-pink-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 backdrop-blur-sm"><CalendarDays className="w-3.5 h-3.5" /><span>Day {Number(currentDayNumber)} of 105</span></div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Ready to crush it{profile?.displayName ? `, ${String(profile.displayName).split(' ')[0]}` : ''}?</h2>
          <p className="text-neutral-300 max-w-md font-medium text-sm">Week {Number(currentWeekNum)} • The miles are adding up!</p>
        </div>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5"><div className="flex justify-between items-end mb-3"><h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Plan Completion</h3><span className="text-xl font-black text-white">{Number(completionPct)}%</span></div><div className="w-full bg-neutral-950 rounded-full h-3 border border-neutral-800 overflow-hidden"><div className="bg-gradient-to-r from-pink-600 to-teal-400 h-full" style={{ width: `${completionPct}%` }}></div></div></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex flex-col justify-between"><Activity className="text-pink-500 w-5 h-5 mb-1" /><div className="text-2xl font-black text-white">{(Number(totalMiles)||0).toFixed(1)}</div><div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Miles Logged</div></div>
        <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex flex-col justify-between"><CalendarDays className="text-pink-400 w-5 h-5 mb-1" /><div className="text-2xl font-black text-white">{Number(timeLeft.days)}d</div><div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Until Race Day</div></div>
      </div>
      <div>
        <h3 className="text-sm uppercase font-black text-pink-500 mb-4 flex items-center"><Flame className="w-4 h-4 mr-2" /> Up Next</h3>
        {todayWorkout ? (
          <div onClick={() => openLogModal(todayWorkout.day, todayWorkout.week)} className="group cursor-pointer bg-neutral-900 border border-pink-500/30 hover:border-pink-500/60 rounded-2xl p-5 transition-all relative overflow-hidden"><p className="text-[10px] font-bold bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full uppercase mb-3 inline-block">Week {Number(todayWorkout.week.week)} • {String(todayWorkout.day.day)}</p><p className="text-lg font-medium text-white leading-relaxed">{String(todayWorkout.day.workout)}</p><div className="mt-4 flex items-center text-[10px] text-neutral-500 uppercase font-black tracking-widest"><Activity className="w-4 h-4 mr-1.5" /> Tap to log</div></div>
        ) : <p className="text-neutral-500 italic text-sm text-center py-4">No workout scheduled today. Rest up!</p>}
      </div>
    </div>
  );
}

function StatCard({ icon, label, val, unit, color }) {
  return (
    <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex flex-col justify-between">
      <div className={`${color} mb-1`}>{React.cloneElement(icon, { className: "w-5 h-5" })}</div>
      <div><div className="text-2xl font-black text-white">{String(val)}</div><div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider leading-none mt-1">{String(label)} <br/> {unit && <span className="opacity-50 lowercase font-normal italic">({unit})</span>}</div></div>
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
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight">Overall Progress</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-pink-900/40 to-neutral-900 border border-pink-500/30 rounded-3xl p-5"><Activity className="text-pink-400 mb-2 w-6 h-6" /><div className="text-4xl font-black text-white">{stats.miles.toFixed(1)}</div><div className="text-[10px] text-pink-200 uppercase font-bold mt-1">Total Miles</div></div>
        <div className="bg-gradient-to-br from-teal-900/30 to-neutral-900 border border-teal-500/30 rounded-3xl p-5"><Watch className="text-teal-400 mb-2 w-6 h-6" /><div className="text-4xl font-black text-white">{Math.floor(stats.time/60)}h</div><div className="text-[10px] text-teal-200 uppercase font-bold mt-1">Time on Feet</div></div>
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-900/30 to-neutral-900 border border-indigo-500/30 rounded-3xl p-5"><Mountain className="text-indigo-400 mb-2 w-6 h-6" /><div className="text-4xl font-black text-white">{stats.elev}</div><div className="text-[10px] text-indigo-200 uppercase font-bold mt-1">Elevation (ft)</div></div>
      </div>
    </div>
  );
}

function LogModal({ day, existingLog, onClose, db, user, appId, profile }) {
  const [distance, setDistance] = useState(existingLog?.distance || '');
  const [duration, setDuration] = useState(existingLog?.duration || '');
  const [elevation, setElevation] = useState(existingLog?.elevation || '');
  const [heartRate, setHeartRate] = useState(existingLog?.heartRate || '');
  const [effort, setEffort] = useState(existingLog?.effort || 5);
  const [notes, setNotes] = useState(existingLog?.notes || '');
  const [vibe, setVibe] = useState(existingLog?.vibe || '😎');
  const [actualDate, setActualDate] = useState(existingLog?.actualDate || new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => {
    e.preventDefault(); if (!user) return; setSaving(true);
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'run_logs', day.id), { dayId: day.id, weekId: day.week, distance: Number(distance) || 0, duration: Number(duration) || 0, elevation: Number(elevation) || 0, heartRate: Number(heartRate) || 0, effort: Number(effort) || 0, notes, vibe, actualDate, updatedAt: new Date().toISOString() }); onClose(); } catch (err) { console.error(err); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 rounded-t-3xl md:rounded-3xl border border-neutral-800 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-neutral-800"><div><h3 className="text-xl font-black text-white">Log Your Run</h3><p className="text-xs text-pink-500 font-bold uppercase tracking-widest mt-1">Week {day.week} • {day.day}</p></div><button onClick={onClose} className="p-2 bg-neutral-800 text-neutral-400 rounded-full hover:text-white transition-colors"><X className="w-5 h-5" /></button></div>
        <div className="p-5 overflow-y-auto"><div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-4 mb-6 text-sm text-neutral-200">{day.workout}</div>
          <form id="log-form" onSubmit={handleSave} className="space-y-5">
            <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1">Date</label><input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 [color-scheme:dark]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1">Dist (mi)</label><input type="number" step="0.01" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" /></div>
              <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1">Time (min)</label><input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" /></div>
            </div>
            <div className="space-y-3"><div className="flex justify-between items-end"><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1">Effort</label><span className="text-lg font-black text-pink-500">{effort}<span className="text-sm text-neutral-500">/10</span></span></div><input type="range" min="1" max="10" value={effort} onChange={(e) => setEffort(e.target.value)} className="w-full accent-pink-500" /></div>
            <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1">Notes</label><textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-pink-500" placeholder="How was it? Shoes? Vibes?" /></div>
          </form>
        </div>
        <div className="p-5 border-t border-neutral-800 flex gap-3 pb-safe"><button type="submit" form="log-form" disabled={saving} className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs uppercase tracking-widest rounded-xl py-4 shadow-lg transition-all">{saving ? 'Saving...' : 'Save Run'}</button></div>
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
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 font-sans relative"><div className="bg-neutral-900 border border-pink-500/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl -mt-10 -mr-10"></div><div className="flex flex-col items-center mb-8 relative z-10"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20 mb-4"><Flame className="w-8 h-8 text-white" /></div><h1 className="text-2xl font-black text-white uppercase italic tracking-tight">Blister Sisters</h1><p className="text-[10px] text-pink-400 font-black uppercase tracking-widest mt-1">Sisterhood Secure Login</p></div>{error && (<div className="bg-red-500/10 border border-red-500/50 text-red-400 text-[10px] font-bold p-3 rounded-xl mb-6 relative z-10">{error}</div>)}<form onSubmit={handleSubmit} className="space-y-4 relative z-10">{!isLogin && (<div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1 mb-1 block">Team Invite Code</label><input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" required /></div>)}<div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1 mb-1 block">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" required /></div><div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1 mb-1 block">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500" required /></div><button type="submit" disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg mt-4 transition-all">{loading ? 'Working...' : (isLogin ? 'Login' : 'Sign Up')}</button></form><button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-[10px] text-neutral-500 font-black uppercase tracking-widest hover:text-white transition-colors relative z-10">{isLogin ? "Join the team" : "Back to login"}</button></div></div>
  );
}

function ProfileSetupModal({ user, db, appId, existingProfile, onClose }) {
  const [name, setName] = useState(existingProfile?.displayName || '');
  const [avatarEmoji, setAvatarEmoji] = useState(existingProfile?.avatarEmoji || AVATAR_EMOJIS_LIST[0]);
  const [avatarBg, setAvatarBg] = useState(existingProfile?.avatarBg || AVATAR_BGS_LIST[0]);
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => { e.preventDefault(); if (!name.trim()) return; setSaving(true); try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { displayName: name, avatarEmoji, avatarBg, createdAt: existingProfile ? existingProfile.createdAt : new Date().toISOString() }, { merge: true }); onClose(); } catch(err) { console.error(err); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-neutral-900 border border-pink-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
        {existingProfile && (<button onClick={onClose} className="absolute top-4 right-4 p-2 text-neutral-400 bg-neutral-800 rounded-full"><X className="w-4 h-4" /></button>)}
        <div className="text-center mb-8 relative z-10"><div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-3xl shadow-lg mx-auto mb-4`}>{String(avatarEmoji)}</div><h2 className="text-2xl font-black text-white">{existingProfile ? 'Edit Profile' : 'Welcome'}</h2></div>
        <form onSubmit={handleSave} className="space-y-6 text-left relative z-10">
          <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1 mb-2 block">Runner Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-pink-500" required /></div>
          
          <div><label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1 mb-2 block">Icon</label><div className="grid grid-cols-6 gap-2">{AVATAR_EMOJIS_LIST.slice(0,18).map(emoji => (<button key={emoji} type="button" onClick={() => setAvatarEmoji(emoji)} className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg transition-all ${avatarEmoji === emoji ? 'bg-neutral-800 border border-pink-500 scale-110' : 'bg-neutral-950'}`}>{emoji}</button>))}</div></div>
          
          <div>
            <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest ml-1 mb-2 block">Background Color</label>
            <div className="grid grid-cols-6 gap-3">
              {AVATAR_BGS_LIST.map(bg => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setAvatarBg(bg)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${bg} transition-all ${avatarBg === bg ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-pink-600 text-white font-black uppercase py-4 rounded-xl mt-4 shadow-lg">{saving ? 'Saving...' : 'Finish'}</button>
        </form>
      </div>
    </div>
  );
}

function NavButton({ icon, label, isActive, onClick }) { return (<button onClick={onClick} className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-pink-500' : 'text-neutral-500 hover:text-neutral-300'}`}>{React.cloneElement(icon, { className: "w-4 h-4" })}<span>{label}</span></button>); }
function MobileNavButton({ icon, label, isActive, onClick }) { return (<button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${isActive ? 'text-pink-500' : 'text-neutral-500'}`}>{React.cloneElement(icon, { className: `w-5 h-5 mb-1 ${isActive ? 'drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]' : ''}` })}<span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span></button>); }
