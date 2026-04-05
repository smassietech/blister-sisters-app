import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, Calendar, Activity, ChevronRight, CheckCircle2, 
  Trophy, Plus, X, Heart, TrendingUp, AlertCircle, Watch,
  Zap, Wind, Mountain, MapPin, History, Navigation, Map, CalendarDays,
  Users, PlayCircle, PlusCircle, ArrowUpRight, Target, Settings, LogOut
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, onAuthStateChanged, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc 
} from 'firebase/firestore';

// ==========================================
// 🔒 BLISTER SISTERS SECURITY WHITELIST 🔒
// Add the approved email addresses here. 
// ONLY these emails will be allowed to sign up!
// ==========================================
const ALLOWED_EMAILS = [
  'lauralynnemassie@gmail.com',
  'jessica@example.com',
  'admin@blistersisters.com'
];

// The shared secret code they need to register for the first time
const TEAM_INVITE_CODE = 'ENDURE24';

// --- DATA: Endure 24 Bootcamp Plan ---
const PLAN_START_DATE = new Date('2026-02-23T00:00:00'); 
const EVENT_DATE = new Date('2026-06-06T12:00:00'); 

const AVATAR_EMOJIS = [
  '🏃‍♀️', '🐆', '🦄', '⚡', '🦋', '🦊', '🔥', '👑', '😎', '💪',
  '🚀', '🌟', '💖', '🦖', '🐢', '🥑', '🍉', '🤘', '💃', '💫',
  '👟', '🏆', '🌈', '🐾', '🏔️', '🏃🏻‍♀️', '🏃🏽‍♀️', '🏃🏾‍♀️', '🏃🏿‍♀️', '💯'
];
const AVATAR_BGS = [
  'from-pink-500 to-teal-400',
  'from-purple-500 to-pink-500',
  'from-orange-500 to-rose-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500'
];

const StravaIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
  </svg>
);

const getCurrentTrainingDay = () => {
  const now = new Date();
  const diffTime = now - PLAN_START_DATE;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const currentWeekIndex = Math.floor(diffDays / 7);
  const currentDayIndex = diffDays % 7;
  return { week: currentWeekIndex + 1, dayIndex: currentDayIndex, diffDays };
};

const TRAINING_PLAN = [
  {
    week: 1, dateStr: "23rd Feb", stage: "build",
    days: [
      { id: "w1-mon", day: "Monday", type: "run", workout: "50 min easy run (conversational pace) (4-5/10 effort)" },
      { id: "w1-tue", day: "Tuesday", type: "rest", workout: "REST" },
      { id: "w1-wed", day: "interval", type: "run", workout: "25 minutes easy. 6 x 3 minutes HM pace with 25 minutes cool down easy" },
      { id: "w1-thu", day: "Thursday", type: "run", workout: "30 mins easy" },
      { id: "w1-fri", day: "Friday", type: "rest", workout: "REST" },
      { id: "w1-sat", day: "Saturday", type: "run", workout: "Strong finish run: 50 minutes easy pace then 20 minutes pick up pace to finish strong at a pace you can maintain." },
      { id: "w1-sun", day: "Sunday", type: "rest", workout: "REST" },
    ]
  },
  {
    week: 2, dateStr: "2nd March", stage: "build",
    days: [
      { id: "w2-mon", day: "Monday", type: "recovery", workout: "30 mins VERY EASY Recovery run. Listen to your body, go at a pace that requires little effort (3/10)" },
      { id: "w2-tue", day: "Tuesday", type: "rest", workout: "REST" },
      { id: "w2-wed", day: "interval", type: "run", workout: "Warm up 15 mins. 4 x 5 minute intervals at HM pace with 3 minutes jog between intervals. cool down 10 mins" },
      { id: "w2-thu", day: "Thursday", type: "run", workout: "40 mins Easy" },
      { id: "w2-fri", day: "Friday", type: "rest", workout: "REST" },
      { id: "w2-sat", day: "Saturday", type: "run", workout: "25 minutes easy. 15 minutes at HM pace. 15 minutes easy. 15 min at HM pace then 25 minutes easy" },
      { id: "w2-sun", day: "Sunday", type: "rest", workout: "REST" },
    ]
  },
  {
    week: 3, dateStr: "9th March", stage: "build",
    days: [
      { id: "w3-mon", day: "Monday", type: "recovery", workout: "40 mins VERY EASY recovery run" },
      { id: "w3-tue", day: "Tuesday", type: "rest", workout: "REST" },
      { id: "w3-wed", day: "hills", type: "run", workout: "Hill sprints: warm up 2 miles, 8-10x 40 secs up hill. recovery on way back down. Cool down 2 miles" },
      { id: "w3-thu", day: "Thursday", type: "run", workout: "60 min recovery very easy pace" },
      { id: "w3-fri", day: "Friday", type: "rest", workout: "REST" },
      { id: "w3-sat", day: "Saturday", type: "run", workout: "long run 2 hours easy pace" },
      { id: "w3-sun", day: "Sunday", type: "rest", workout: "REST" },
    ]
  },
  {
    week: 4, dateStr: "16th March", stage: "build",
    days: [
      { id: "w4-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" },
      { id: "w4-tue", day: "Tuesday", type: "run", workout: "60 min easy" },
      { id: "w4-wed", day: "interval", type: "run", workout: "Morning Intervals 8 x 2mins 10k pace 60-90 sec recovery between sets. afternoon 30 minutes. recovery run very easy" },
      { id: "w4-thu", day: "Thursday", type: "run", workout: "60 min easy" },
      { id: "w4-fri", day: "Friday", type: "rest", workout: "REST" },
      { id: "w4-sat", day: "Saturday", type: "run", workout: "Strong finish run: 90 minutes easy, then 25 minutes pick up pace to finish strong at a pace you can maintain" },
      { id: "w4-sun", day: "Sunday", type: "rest", workout: "REST" },
    ]
  },
  {
    week: 5, dateStr: "23rd March", stage: "build",
    days: [
      { id: "w5-mon", day: "Monday", type: "recovery", workout: "30 min recovery. very easy" },
      { id: "w5-tue", day: "Tuesday", type: "rest", workout: "REST" },
      { id: "w5-wed", day: "interval", type: "run", workout: "75 min easy. Morning intervals option one: 4 x 6 mins HM pace with 3 minutes jog between" },
      { id: "w5-thu", day: "Thursday", type: "run", workout: "60 min recovery very easy" },
      { id: "w5-fri", day: "Friday", type: "rest", workout: "REST" },
      { id: "w5-sat", day: "Saturday", type: "run", workout: "long run: 90 min easy" },
      { id: "w5-sun", day: "Sunday", type: "rest", workout: "REST" },
    ]
  },
  {
    week: 6, dateStr: "30th March", stage: "step back",
    days: [
      { id: "w6-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" },
      { id: "w6-tue", day: "Tuesday", type: "run", workout: "60 min easy" },
      { id: "w6-wed", day: "hills", type: "run", workout: "Hills 15 mins warm up 6-8 sets of 2 mins up recovery on way down 15 mins cool down. afternoon 40 minutes. recovery run" },
      { id: "w6-thu", day: "Thursday", type: "run", workout: "60 min easy" },
      { id: "w6-fri", day: "Friday", type: "run", workout: "30 min + 60 min easy. So two runs in one day. Can be combined as one 90 minute run if preferred." },
      { id: "w6-sat", day: "Saturday", type: "run", workout: "30 minutes easy" },
      { id: "w6-sun", day: "Sunday", type: "rest", workout: "REST" },
    ]
  },
  {
    week: 7, dateStr: "6th April", stage: "build",
    days: [
      { id: "w7-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" },
      { id: "w7-tue", day: "Tuesday", type: "run", workout: "45 mins easy" },
      { id: "w7-wed", day: "interval", type: "run", workout: "Warm up 1 mile. 4 x 1 mile at HM pace 5 mins recovery bewteen sets Cool down 1 mile. afternoon 35 minutes recovery run very easy" },
      { id: "w7-thu", day: "Thursday", type: "recovery", workout: "70 min recovery very easy" },
      { id: "w7-fri", day: "Friday", type: "rest", workout: "REST" },
      { id: "w7-sat", day: "Saturday", type: "run", workout: "20 mins easy pace, 30 mins moderate pace, 30 mins easy pace" },
      { id: "w7-sun", day: "Sunday", type: "rest", workout: "REST" },
    ]
  },
  {
    week: 8, dateStr: "13th April", stage: "build",
    days: [
      { id: "w8-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" },
      { id: "w8-tue", day: "Tuesday", type: "run", workout: "60 min easy" },
      { id: "w8-wed", day: "interval", type: "run", workout: "30 mins moderate pace, 20 mins easy pace" },
      { id: "w8-thu", day: "Thursday", type: "run", workout: "40 min easy" },
      { id: "w8-fri", day: "Friday", type: "rest", workout: "REST" },
      { id: "w8-sat", day: "Saturday", type: "run", workout: "16-17 miles easy pace" },
      { id: "w8-sun", day: "Sunday", type: "rest", workout: "REST" },
    ]
  },
  {
    week: 9, dateStr: "20th April", stage: "step back",
    days: [
      { id: "w9-mon", day: "Monday", type: "recovery", workout: "40 mins recovery very easy" },
      { id: "w9-tue", day: "Tuesday", type: "rest", workout: "REST" },
      { id: "w9-wed", day: "run", workout: "40 min 40 min easy" },
      { id: "w9-thu", day: "Thursday", type: "rest", workout: "REST" },
      { id: "w9-fri", day: "Friday", type: "run", workout: "60 min easy" },
      { id: "w9-sat", day: "Saturday", type: "run", workout: "35 mins easy" },
      { id: "w9-sun", day: "Sunday", type: "run", workout: "100 mins easy" },
    ]
  },
  {
    week: 10, dateStr: "27th April", stage: "peak",
    days: [
      { id: "w10-mon", day: "Monday", type: "run", workout: "30 min easy" },
      { id: "w10-tue", day: "Tuesday", type: "run", workout: "60 min at or below MAF" },
      { id: "w10-wed", day: "interval", type: "run", workout: "2 mile warm up 5 x 1km at 10k pace 2 min rec between sets 2 miles cool down afternoon 30 mins recovery run" },
      { id: "w10-thu", day: "Thursday", type: "recovery", workout: "40 min recovery very easy" },
      { id: "w10-fri", day: "Friday", type: "run", workout: "40+30 min easy" },
      { id: "w10-sat", day: "Saturday", type: "rest", workout: "REST" },
      { id: "w10-sun", day: "Sunday", type: "run", workout: "18 miles: 6 miles at very easy pace, 6. miles at 10-20 sec faster, 6 miles at 10-20 sec faster (only increase pace if feeling good)" },
    ]
  },
  {
    week: 11, dateStr: "4th May", stage: "peak",
    days: [
      { id: "w11-mon", day: "Monday", type: "recovery", workout: "40 mins recovery very easy" },
      { id: "w11-tue", day: "Tuesday", type: "run", workout: "45 mins easy" },
      { id: "w11-wed", day: "run", workout: "morning run 45 mins fartleks or hills afternoon 60 mins recovery very easy" },
      { id: "w11-thu", day: "Thursday", type: "run", workout: "60 min easy" },
      { id: "w11-fri", day: "Friday", type: "run", workout: "40 min + 40 min easy" },
      { id: "w11-sat", day: "Saturday", type: "rest", workout: "REST" },
      { id: "w11-sun", day: "Sunday", type: "run", workout: "2 hours 30 Total easy pace Increase pace for last 30 mins if feeling good" },
    ]
  },
  {
    week: 12, dateStr: "11th May", stage: "peak",
    days: [
      { id: "w12-mon", day: "Monday", type: "recovery", workout: "30 min recovery very easy" },
      { id: "w12-tue", day: "Tuesday", type: "run", workout: "50 mins easy" },
      { id: "w12-wed", day: "interval", type: "run", workout: "2 Mile warm up 15 x200m 1 min recovery 2 mile cool down" },
      { id: "w12-thu", day: "Thursday", type: "run", workout: "60 min easy" },
      { id: "w12-fri", day: "Friday", type: "run", workout: "40 min +30 min easy" },
      { id: "w12-sat", day: "Saturday", type: "rest", workout: "REST" },
      { id: "w12-sun", day: "Sunday", type: "run", workout: "20-22 miles easy pace" },
    ]
  },
  {
    week: 13, dateStr: "18th May", stage: "taper week 1",
    days: [
      { id: "w13-mon", day: "Monday", type: "recovery", workout: "30 mins recovery very easy" },
      { id: "w13-tue", day: "Tuesday", type: "run", workout: "60 min easy" },
      { id: "w13-wed", day: "interval", type: "run", workout: "Morning intervals 1 mile warm up 3 x 1 miles 10k pace with a 3 min jog between sets 1 miles cool down afternoon 40 minutes recovery run below MAF" },
      { id: "w13-thu", day: "Thursday", type: "recovery", workout: "60 min recovery very easy" },
      { id: "w13-fri", day: "Friday", type: "run", workout: "40 min 60 min easy" },
      { id: "w13-sat", day: "Saturday", type: "rest", workout: "REST" },
      { id: "w13-sun", day: "Sunday", type: "run", workout: "Tempo run: 30 mins easy, 15 mins at HM pace, 15 mins easy, 15 mins at HM pace, 30 mins easy" },
    ]
  },
  {
    week: 14, dateStr: "25th May", stage: "taper week 2",
    days: [
      { id: "w14-mon", day: "Monday", type: "recovery", workout: "30 mins recovery very easy" },
      { id: "w14-tue", day: "Tuesday", type: "run", workout: "60 min easy" },
      { id: "w14-wed", day: "hills", type: "run", workout: "moming run-hills 15 min warm up 8-10 x 60 sec hill recovery on way down 15 min cool down" },
      { id: "w14-thu", day: "Thursday", type: "recovery", workout: "45 min recovery very easy" },
      { id: "w14-fri", day: "Friday", type: "run", workout: "60 mins easy" },
      { id: "w14-sat", day: "Saturday", type: "run", workout: "50 mins easy" },
      { id: "w14-sun", day: "Sunday", type: "run", workout: "70 mins easy" },
    ]
  },
  {
    week: 15, dateStr: "1st June", stage: "taper week 3",
    days: [
      { id: "w15-mon", day: "Monday", type: "rest", workout: "REST" },
      { id: "w15-tue", day: "Tuesday", type: "run", workout: "40 min easy" },
      { id: "w15-wed", day: "run", workout: "10 mins warm up 25 mins of fartleks 10 mins cool down" },
      { id: "w15-thu", day: "Thursday", type: "rest", workout: "REST" },
      { id: "w15-fri", day: "Friday", type: "run", workout: "30 mins easy" },
      { id: "w15-sat", day: "Saturday", type: "rest", workout: "REST" },
      { id: "w15-sun", day: "Sunday", type: "race", workout: "ENDURE 24! 🔥" },
    ]
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [teamProfiles, setTeamProfiles] = useState([]);
  const [relayLaps, setRelayLaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'plan', 'stats', 'team'
  
  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Firebase initialization inside the component
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'blister-sisters-app';
  
  const app = useMemo(() => initializeApp(firebaseConfig), [firebaseConfig]);
  const auth = useMemo(() => getAuth(app), [app]);
  const db = useMemo(() => getFirestore(app), [app]);

  // Set Favicon dynamically
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%23e11d48'/%3E%3Cpath d='M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
  }, []);

  // Auth Effect
  useEffect(() => {
    const initAuth = async () => {
      try {
        // If we are in the Canvas preview, we automatically log you in securely to test the app.
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
        // If we are deployed on the web, it will skip this and show the secure Email Login Screen!
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  // Data Fetching Effect
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // 1. Listen to private user logs
    const logsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'run_logs');
    const unsubLogs = onSnapshot(logsRef, (snapshot) => {
      const logsData = [];
      snapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() });
      });
      setLogs(logsData);
    }, (error) => console.error(error));

    // 2. Listen to public profiles (for team leaderboard)
    const publicProfilesRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
    const unsubProfiles = onSnapshot(publicProfilesRef, (snapshot) => {
      const pData = [];
      let foundCurrentUser = false;
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        pData.push(data);
        if (doc.id === user.uid) {
          setProfile(data);
          foundCurrentUser = true;
        }
      });
      setTeamProfiles(pData);
      
      // Prompt to setup name if they logged in but haven't created a profile yet
      // Ignore this requirement if they are the Canvas test user (isAnonymous)
      if (!foundCurrentUser && !user.isAnonymous) {
        setShowProfileSetup(true); 
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    // 3. Listen to public event relay laps
    const relayRef = collection(db, 'artifacts', appId, 'public', 'data', 'laps');
    const unsubRelay = onSnapshot(relayRef, (snapshot) => {
      const laps = [];
      snapshot.forEach(doc => laps.push({ id: doc.id, ...doc.data() }));
      // Sort by creation or lap number in memory
      laps.sort((a, b) => a.createdAt - b.createdAt);
      setRelayLaps(laps);
    }, (error) => console.error(error));

    return () => { unsubLogs(); unsubProfiles(); unsubRelay(); };
  }, [user, db, appId]);

  // Sync personal aggregate stats to public profile whenever logs change
  useEffect(() => {
    if (!user || !profile || !profile.displayName) return; // Only sync if profile is setup
    
    const totalM = logs.reduce((acc, log) => acc + (Number(log.distance) || 0), 0);
    const totalR = logs.filter(log => log.distance > 0 || log.duration > 0).length;
    
    // Write summary stats back to public profile for the leaderboard
    const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid);
    setDoc(profileRef, { 
      totalMiles: totalM, 
      totalRuns: totalR,
      lastActive: new Date().toISOString()
    }, { merge: true }).catch(e => console.error("Error syncing stats:", e));
    
  }, [logs, user, profile?.displayName, db, appId]); // Intentionally omitting `profile` whole object to avoid loop

  // Derived state
  const completedLogIds = logs.map(log => log.dayId);
  const totalMiles = logs.reduce((acc, log) => acc + (Number(log.distance) || 0), 0);
  const totalDuration = logs.reduce((acc, log) => acc + (Number(log.duration) || 0), 0);
  const totalElevation = logs.reduce((acc, log) => acc + (Number(log.elevation) || 0), 0);
  const totalRuns = logs.filter(log => log.distance > 0 || log.duration > 0).length;

  const totalWorkouts = useMemo(() => {
    return TRAINING_PLAN.reduce((acc, week) => acc + week.days.filter(d => d.workout !== "REST").length, 0);
  }, []);
  const completionPct = Math.round((completedLogIds.length / totalWorkouts) * 100) || 0;

  // Determine current day and past unlogged days for late-builders
  const { week: currentWeekNum, dayIndex, diffDays } = useMemo(() => getCurrentTrainingDay(), []);
  
  const { todayWorkout, pastUnlogged } = useMemo(() => {
    let today = null;
    let missed = [];
    
    let dayCounter = 0;
    for (const w of TRAINING_PLAN) {
      for (const d of w.days) {
        if (w.week === currentWeekNum && dayCounter % 7 === dayIndex) {
          today = { day: d, week: w };
        }
        if (dayCounter < diffDays && d.workout !== "REST" && !completedLogIds.includes(d.id)) {
          missed.push({ day: d, week: w });
        }
        dayCounter++;
      }
    }
    return { todayWorkout: today, pastUnlogged: missed };
  }, [currentWeekNum, dayIndex, diffDays, completedLogIds]);

  // Handlers
  const openLogModal = (dayData, weekData) => {
    setSelectedDay({ ...dayData, week: weekData.week });
    setLogModalOpen(true);
  };

  const toggleStrava = async () => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid);
      await setDoc(profileRef, { stravaConnected: !(profile?.stravaConnected || false) }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const getLogForDay = (dayId) => logs.find(l => l.dayId === dayId);

  // Components
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-pink-500 font-sans">
        <Watch className="animate-spin w-10 h-10 mr-3" /> Loading Blister Sisters HQ...
      </div>
    );
  }

  // Show Auth Screen if not logged in
  if (!user) {
    return <AuthScreen auth={auth} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-pink-500 selection:text-white pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-pink-900/30 px-4 py-4 shadow-lg shadow-pink-900/10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">Blister Sisters</h1>
              <p className="text-xs text-pink-400 font-medium tracking-widest">Endure 24 Bootcamp</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="hidden md:flex space-x-6 mr-6">
              <NavButton icon={<Activity />} label="Dashboard" isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
              <NavButton icon={<Calendar />} label="Plan" isActive={view === 'plan'} onClick={() => setView('plan')} />
              <NavButton icon={<TrendingUp />} label="Stats" isActive={view === 'stats'} onClick={() => setView('stats')} />
              <NavButton icon={<Users />} label="Team" isActive={view === 'team'} onClick={() => setView('team')} />
            </div>
            {profile && (
              <button onClick={() => setIsEditingProfile(true)} className="p-2 text-neutral-400 hover:text-pink-500 transition-colors bg-neutral-900 rounded-full border border-neutral-800">
                <Settings className="w-5 h-5" />
              </button>
            )}
            {/* Always show logout button */}
            <button onClick={() => signOut(auth)} title="Sign Out" className="p-2 text-neutral-400 hover:text-pink-500 transition-colors bg-neutral-900 rounded-full border border-neutral-800 ml-2">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 py-8">
        {view === 'dashboard' && <DashboardView logs={logs} openLogModal={openLogModal} totalRuns={totalRuns} todayWorkout={todayWorkout} pastUnlogged={pastUnlogged} completedLogIds={completedLogIds} totalMiles={totalMiles} completionPct={completionPct} profile={profile || {}} toggleStrava={toggleStrava} />}
        {view === 'plan' && <PlanView logs={logs} completedLogIds={completedLogIds} openLogModal={openLogModal} getLogForDay={getLogForDay} currentWeekNum={currentWeekNum} />}
        {view === 'stats' && <StatsView totalMiles={totalMiles} totalDuration={totalDuration} totalElevation={totalElevation} totalRuns={totalRuns} logs={logs} completedLogIds={completedLogIds} totalWorkouts={totalWorkouts} completionPct={completionPct} />}
        {view === 'team' && <TeamView profiles={teamProfiles} relayLaps={relayLaps} user={user} db={db} appId={appId} currentProfile={profile} />}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 flex justify-around p-2 z-40 pb-safe">
        <MobileNavButton icon={<Activity />} label="Dash" isActive={view === 'dashboard'} onClick={() => setView('dashboard')} />
        <MobileNavButton icon={<Calendar />} label="Plan" isActive={view === 'plan'} onClick={() => setView('plan')} />
        <MobileNavButton icon={<TrendingUp />} label="Stats" isActive={view === 'stats'} onClick={() => setView('stats')} />
        <MobileNavButton icon={<Users />} label="Team" isActive={view === 'team'} onClick={() => setView('team')} />
      </nav>

      {/* Log Modal */}
      {logModalOpen && selectedDay && (
        <LogModal 
          day={selectedDay} 
          existingLog={getLogForDay(selectedDay.id)}
          onClose={() => { setLogModalOpen(false); setSelectedDay(null); }}
          db={db}
          user={user}
          appId={appId}
          profile={profile || {}}
        />
      )}

      {/* Profile Setup Modal */}
      {(showProfileSetup || isEditingProfile) && user && (
        <ProfileSetupModal 
          user={user} 
          db={db} 
          appId={appId} 
          existingProfile={isEditingProfile ? profile : null}
          onClose={() => {
            setShowProfileSetup(false);
            setIsEditingProfile(false);
          }} 
        />
      )}
    </div>
  );
}

// --- VIEWS ---

function DashboardView({ logs, openLogModal, totalRuns, todayWorkout, pastUnlogged, completedLogIds, totalMiles, completionPct, profile, toggleStrava }) {
  // Find next upcoming if today is complete/rest
  let nextWorkoutDay = null;
  let nextWorkoutWeek = null;
  
  if (!todayWorkout || todayWorkout.day.workout === "REST" || completedLogIds.includes(todayWorkout?.day?.id)) {
    for (const week of TRAINING_PLAN) {
      for (const day of week.days) {
        if (day.workout !== "REST" && !completedLogIds.includes(day.id)) {
          nextWorkoutDay = day;
          nextWorkoutWeek = week;
          break;
        }
      }
      if (nextWorkoutDay) break;
    }
  } else {
    nextWorkoutDay = todayWorkout.day;
    nextWorkoutWeek = todayWorkout.week;
  }

  // Countdown Timer Logic
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 });
  
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = EVENT_DATE.getTime() - now.getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          mins: Math.floor((difference / 1000 / 60) % 60)
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Hero Welcome with Photo-Realistic Background */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl group">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity group-hover:scale-105 transition-transform duration-1000 ease-out"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&w=1200&q=80')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/80 to-transparent"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl pointer-events-none -mt-10 -mr-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between h-full min-h-[140px]">
          <div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
              Ready to crush it{profile?.displayName ? `, ${profile.displayName.split(' ')[0]}` : ''}?
            </h2>
            <p className="text-neutral-300 max-w-md font-medium text-sm leading-relaxed drop-shadow-md">
              You're {totalRuns} sessions deep. The miles are adding up and the blister count is rising! Keep pushing, sister.
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Progress Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-lg">
        <div className="flex justify-between items-end mb-3">
          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center">
            <Target className="w-4 h-4 mr-2 text-pink-500" /> Plan Completion
          </h3>
          <span className="text-xl font-black text-white">{completionPct}%</span>
        </div>
        <div className="w-full bg-neutral-950 rounded-full h-3 border border-neutral-800 overflow-hidden relative">
          <div 
            className="bg-gradient-to-r from-pink-600 to-teal-400 h-full transition-all duration-1000 ease-out"
            style={{ width: `${completionPct}%` }}
          ></div>
        </div>
      </div>

      {/* Quick Stats & Countdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex flex-col justify-between">
          <div className="text-pink-500 mb-1"><Activity className="w-5 h-5" /></div>
          <div>
            <div className="text-2xl font-black text-white">{totalMiles > 0 ? totalMiles.toFixed(1) : '0'}</div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Miles Logged</div>
          </div>
        </div>
        <div className="col-span-1 bg-gradient-to-br from-pink-900/20 to-neutral-900 rounded-2xl p-4 border border-pink-500/20 flex flex-col justify-between">
          <div className="text-pink-400 mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest flex items-center"><CalendarDays className="w-4 h-4 mr-1.5" /> E24 Countdown</span>
          </div>
          <div className="flex space-x-3 text-white mt-2">
            <div><span className="text-3xl font-black">{timeLeft.days}</span><span className="text-[10px] text-pink-300 ml-1 uppercase">d</span></div>
            <div><span className="text-3xl font-black">{timeLeft.hours}</span><span className="text-[10px] text-pink-300 ml-1 uppercase">h</span></div>
          </div>
        </div>
        <div className="col-span-2 bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${profile?.stravaConnected ? 'bg-[#FC4C02]/20 text-[#FC4C02]' : 'bg-neutral-800 text-neutral-400'}`}>
              <StravaIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Strava Sync</h4>
              <p className="text-[10px] text-neutral-400">Connect to auto-pull stats</p>
            </div>
          </div>
          <button 
            onClick={toggleStrava}
            className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${profile?.stravaConnected ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-[#FC4C02] text-white hover:bg-[#E34402]'}`}
          >
            {profile?.stravaConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Past Unlogged Alerts */}
      {pastUnlogged.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-2xl p-5 flex items-start space-x-4">
          <div className="bg-amber-500/20 text-amber-500 p-2 rounded-xl mt-1">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-amber-500 font-bold text-sm tracking-wide">Backfill Your Training!</h4>
            <p className="text-neutral-400 text-xs mt-1 leading-relaxed">
              You have <strong className="text-amber-400">{pastUnlogged.length} past workouts</strong> from earlier weeks that aren't logged yet. Tap the plan tab to log them and catch up your stats!
            </p>
          </div>
        </div>
      )}

      {/* Up Next Card */}
      <div>
        <h3 className="text-sm uppercase tracking-widest text-pink-500 font-bold mb-4 flex items-center">
          <Flame className="w-4 h-4 mr-2" /> {todayWorkout && nextWorkoutDay?.id === todayWorkout.day.id ? "Today's Target" : "Up Next"}
        </h3>
        
        {nextWorkoutDay ? (
          <div 
            onClick={() => openLogModal(nextWorkoutDay, nextWorkoutWeek)}
            className="group cursor-pointer bg-neutral-900 border border-pink-500/30 hover:border-pink-500/60 rounded-2xl p-5 transition-all shadow-[0_0_15px_rgba(236,72,153,0.05)] hover:shadow-[0_0_25px_rgba(236,72,153,0.15)] relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div>
                <span className="text-xs font-bold bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full uppercase tracking-wider">
                  Week {nextWorkoutWeek.week} • {nextWorkoutDay.day}
                </span>
              </div>
              <ChevronRight className="text-pink-500 opacity-50 group-hover:opacity-100 transition-opacity group-hover:translate-x-1" />
            </div>
            <p className="text-lg font-medium text-white leading-relaxed relative z-10">
              {nextWorkoutDay.workout}
            </p>
            <div className="mt-4 flex items-center justify-between text-sm text-neutral-400 font-medium relative z-10">
              <span className="flex items-center"><Activity className="w-4 h-4 mr-1.5" /> Tap to log this run</span>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-1 rounded-md uppercase tracking-wider font-bold">Flexible schedule</span>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-teal-500/30 rounded-2xl p-6 text-center">
            <Trophy className="w-12 h-12 text-teal-400 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold text-white">Bootcamp Complete!</h3>
            <p className="text-neutral-400 mt-2">You've finished all your runs. Time to smash Endure 24!</p>
          </div>
        )}
      </div>

      {/* Event Info */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center mb-4">
          <MapPin className="w-4 h-4 mr-2" /> Race Day Logistics
        </h3>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <p className="font-bold text-white text-lg">Wasing Park, Reading</p>
            <p className="text-sm text-neutral-400 mt-1">Aldermaston, Berkshire RG7 4NG</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <a href="https://goo.gl/maps/search/?api=1&query=Wasing+Park+Reading+RG7+4NG" target="_blank" rel="noreferrer" className="flex-1 md:flex-none flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
              <Map className="w-4 h-4 mr-2 text-blue-400" /> Maps
            </a>
            <a href="https://waze.com/ul?q=Wasing+Park+Reading" target="_blank" rel="noreferrer" className="flex-1 md:flex-none flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
              <Navigation className="w-4 h-4 mr-2 text-teal-400" /> Waze
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanView({ logs, completedLogIds, openLogModal, getLogForDay, currentWeekNum }) {
  const [expandedWeek, setExpandedWeek] = useState(currentWeekNum > 0 && currentWeekNum <= 15 ? currentWeekNum : 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">Bootcamp Plan</h2>
        <span className="text-xs font-bold bg-neutral-800 text-neutral-400 px-3 py-1 rounded-full uppercase tracking-wider">15 Weeks</span>
      </div>

      <div className="space-y-4">
        {TRAINING_PLAN.map((week) => (
          <div key={week.week} className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden transition-all">
            {/* Week Header */}
            <button 
              onClick={() => setExpandedWeek(expandedWeek === week.week ? null : week.week)}
              className="w-full flex items-center justify-between p-5 bg-neutral-900 hover:bg-neutral-800/50 transition-colors text-left"
            >
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-bold">Week {week.week}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    week.stage.includes('peak') ? 'bg-teal-500/20 text-teal-400' : 
                    week.stage.includes('taper') ? 'bg-purple-500/20 text-purple-400' : 
                    'bg-neutral-800 text-neutral-400'
                  }`}>
                    {week.stage}
                  </span>
                </div>
                <p className="text-xs text-pink-500 font-medium tracking-wide mt-1">Starts {week.dateStr}</p>
              </div>
              <ChevronRight className={`transform transition-transform ${expandedWeek === week.week ? 'rotate-90 text-pink-500' : 'text-neutral-500'}`} />
            </button>

            {/* Days List */}
            {expandedWeek === week.week && (
              <div className="divide-y divide-neutral-800/50 border-t border-neutral-800 bg-neutral-950/50">
                {week.days.map((day) => {
                  const isRest = day.workout === "REST";
                  const isCompleted = completedLogIds.includes(day.id);
                  const logData = getLogForDay(day.id);

                  return (
                    <div 
                      key={day.id} 
                      onClick={() => !isRest && openLogModal(day, week)}
                      className={`p-4 flex gap-4 transition-colors ${
                        isRest ? 'opacity-50' : 'cursor-pointer hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex-shrink-0 flex flex-col items-center pt-1 w-10">
                        <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{day.day.substring(0,3)}</span>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-teal-400 mt-1 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                        ) : isRest ? (
                          <div className="w-2 h-2 rounded-full bg-neutral-700 mt-2"></div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-pink-500 mt-1"></div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <p className={`text-sm md:text-base leading-snug ${isRest ? 'text-neutral-500' : 'text-neutral-200'}`}>
                          {day.workout}
                        </p>
                        
                        {isCompleted && logData && (
                          <div className="mt-3 p-3 bg-neutral-900 border border-teal-500/20 rounded-xl">
                            <div className="flex flex-wrap gap-y-2 items-center space-x-4 text-xs font-medium text-teal-400 mb-1.5">
                              {logData.distance > 0 && <span>{logData.distance} mi</span>}
                              {logData.duration > 0 && <span>{logData.duration} min</span>}
                              {logData.elevation > 0 && <span>{logData.elevation} ft</span>}
                              {logData.effort > 0 && <span className="flex items-center"><Heart className="w-3 h-3 mr-1" /> {logData.effort}/10</span>}
                              {logData.vibe && <span className="text-base leading-none">{logData.vibe}</span>}
                            </div>
                            {logData.notes && (
                              <p className="text-xs text-neutral-400 italic mt-2">"{logData.notes}"</p>
                            )}
                            {logData.actualDate && (
                              <p className="text-[10px] text-neutral-600 mt-2 font-bold uppercase tracking-wider">
                                Logged: {new Date(logData.actualDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
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

function StatsView({ totalMiles, totalDuration, totalElevation, totalRuns, logs, completedLogIds, totalWorkouts, completionPct }) {
  // Calculate Pace by Type
  const paceStats = useMemo(() => {
    const stats = {
      'recovery': { dist: 0, dur: 0, label: 'Easy / Recovery', icon: <Wind className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      'interval': { dist: 0, dur: 0, label: 'Speed / Intervals', icon: <Zap className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
      'hills': { dist: 0, dur: 0, label: 'Hill Repeats', icon: <Mountain className="w-4 h-4" />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
      'run': { dist: 0, dur: 0, label: 'Long / Base Runs', icon: <MapPin className="w-4 h-4" />, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    };

    logs.forEach(log => {
      let dayType = 'run';
      // Find type in TRAINING_PLAN
      for (const w of TRAINING_PLAN) {
        const d = w.days.find(day => day.id === log.dayId);
        if (d) {
          dayType = d.type;
          break;
        }
      }
      
      if (stats[dayType] && log.distance > 0 && log.duration > 0) {
        stats[dayType].dist += Number(log.distance);
        stats[dayType].dur += Number(log.duration);
      } else if (log.distance > 0 && log.duration > 0) { // Fallback
        stats['run'].dist += Number(log.distance);
        stats['run'].dur += Number(log.duration);
      }
    });

    return stats;
  }, [logs]);

  const formatPace = (dur, dist) => {
    if (!dist || !dur) return '--:--';
    const pace = dur / dist;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black tracking-tight">Your Progress</h2>
      
      {/* Top Level Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-pink-900/40 to-neutral-900 border border-pink-500/30 rounded-3xl p-5 relative overflow-hidden">
          <div className="text-pink-400 mb-2"><Activity className="w-6 h-6" /></div>
          <div className="text-4xl font-black text-white relative z-10">{totalMiles > 0 ? totalMiles.toFixed(1) : '0'}</div>
          <div className="text-[10px] text-pink-200 font-bold uppercase tracking-wider mt-1 relative z-10">Total Miles</div>
        </div>

        <div className="bg-gradient-to-br from-teal-900/30 to-neutral-900 border border-teal-500/30 rounded-3xl p-5 relative overflow-hidden">
          <div className="text-teal-400 mb-2"><Watch className="w-6 h-6" /></div>
          <div className="text-4xl font-black text-white relative z-10">
            {totalDuration > 60 ? `${Math.floor(totalDuration/60)}h` : `${totalDuration}m`}
          </div>
          <div className="text-[10px] text-teal-200 font-bold uppercase tracking-wider mt-1 relative z-10">Time on Feet</div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-900/30 to-neutral-900 border border-indigo-500/30 rounded-3xl p-5 relative overflow-hidden">
          <div className="text-indigo-400 mb-2"><Mountain className="w-6 h-6" /></div>
          <div className="text-4xl font-black text-white relative z-10">{totalElevation} <span className="text-sm font-bold">ft</span></div>
          <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mt-1 relative z-10">Elevation Gain</div>
        </div>
      </div>

      {/* Pace Breakdown */}
      <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden">
        <div className="p-6 border-b border-neutral-800 bg-neutral-950/30">
          <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center">
            <Activity className="w-4 h-4 mr-2" /> Average Pace by Run Type
          </h3>
        </div>
        <div className="divide-y divide-neutral-800/50">
          {Object.entries(paceStats).map(([key, data]) => (
            <div key={key} className="p-4 px-6 flex items-center justify-between hover:bg-neutral-800/20 transition-colors">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.bg} ${data.color}`}>
                  {data.icon}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{data.label}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{data.dist.toFixed(1)} miles tracked</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-white">
                  {formatPace(data.dur, data.dist)} <span className="text-xs text-neutral-500 font-medium">/mi</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- TEAM VIEW & RELAY PLANNER ---
function TeamView({ profiles, relayLaps, user, db, appId, currentProfile }) {
  const [activeTab, setActiveTab] = useState('leaderboard'); // leaderboard, relay
  
  // Sort leaderboard by miles
  const sortedProfiles = [...profiles].sort((a, b) => (b.totalMiles || 0) - (a.totalMiles || 0));

  const claimLap = async (lapId) => {
    if (!user || !currentProfile) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'laps', lapId), {
        runnerId: user.uid,
        runnerName: currentProfile.displayName || "Unknown Sister",
        status: 'claimed'
      }, { merge: true });
    } catch(e) { console.error(e); }
  };

  const updateLapStatus = async (lapId, newStatus) => {
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'laps', lapId), {
        status: newStatus
      }, { merge: true });
    } catch(e) { console.error(e); }
  };

  const createLap = async () => {
    const nextLapNumber = relayLaps.length + 1;
    const lapId = `lap_${Date.now()}`;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'laps', lapId), {
        lapNumber: nextLapNumber,
        runnerId: null,
        runnerName: null,
        status: 'open',
        createdAt: Date.now()
      });
    } catch(e) { console.error(e); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight flex items-center"><Users className="w-6 h-6 mr-3 text-pink-500" /> Sisterhood HQ</h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-neutral-900 p-1.5 rounded-xl border border-neutral-800">
        <button 
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'leaderboard' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Leaderboard
        </button>
        <button 
          onClick={() => setActiveTab('relay')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'relay' ? 'bg-pink-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Endure 24 Relay
        </button>
      </div>

      {activeTab === 'leaderboard' && (
        <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden">
          <div className="p-5 border-b border-neutral-800 bg-neutral-950/30 flex justify-between items-center">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Team Distance</h3>
            <span className="text-xs bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full font-bold">Total: {sortedProfiles.reduce((sum, p) => sum + (p.totalMiles || 0), 0).toFixed(0)} mi</span>
          </div>
          <div className="divide-y divide-neutral-800/50">
            {sortedProfiles.map((p, index) => (
              <div key={p.id} className={`p-4 px-6 flex items-center justify-between ${p.id === user?.uid ? 'bg-neutral-800/40' : ''}`}>
                <div className="flex items-center space-x-4">
                  <div className="w-8 font-black text-neutral-600 text-lg">#{index + 1}</div>
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.avatarBg || 'from-pink-500 to-teal-400'} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {p.avatarEmoji || (p.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center">
                      {p.displayName || 'Anonymous Runner'} {p.id === user?.uid && <span className="ml-2 text-[10px] bg-neutral-700 px-2 py-0.5 rounded-full text-neutral-300">YOU</span>}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">{p.totalRuns || 0} runs logged</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-pink-400">
                    {(p.totalMiles || 0).toFixed(1)} <span className="text-xs text-neutral-500">mi</span>
                  </div>
                </div>
              </div>
            ))}
            {sortedProfiles.length === 0 && (
              <div className="p-8 text-center text-neutral-500 text-sm">No runners have logged miles yet!</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'relay' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-teal-900/30 to-neutral-900 border border-teal-500/30 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white mb-2">The Digital Baton</h3>
            <p className="text-sm text-neutral-400 leading-relaxed mb-4">
              Track who is out on the 5-mile loop, who is next, and claim your laps for the big day!
            </p>
            <button 
              onClick={createLap}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-colors"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Add Next Lap
            </button>
          </div>

          <div className="space-y-3">
            {relayLaps.map((lap) => (
              <div key={lap.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-neutral-950 border border-neutral-800 w-12 h-12 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Lap</span>
                    <span className="text-lg font-black text-white leading-none">{lap.lapNumber}</span>
                  </div>
                  <div>
                    {lap.runnerId ? (
                      <div>
                        <div className="font-bold text-white flex items-center">
                          {lap.runnerName} 
                          {lap.runnerId === user?.uid && <span className="ml-2 text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md">YOU</span>}
                        </div>
                        <div className="text-xs font-medium uppercase tracking-widest mt-1 flex items-center">
                          {lap.status === 'claimed' && <span className="text-neutral-500">On Deck</span>}
                          {lap.status === 'running' && <span className="text-pink-500 flex items-center"><PlayCircle className="w-3 h-3 mr-1 animate-pulse" /> Out on Course</span>}
                          {lap.status === 'complete' && <span className="text-teal-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> Finished</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="font-medium text-neutral-500 italic">Unclaimed Lap</div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!lap.runnerId && (
                    <button 
                      onClick={() => claimLap(lap.id)}
                      className="flex-1 md:flex-none bg-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Claim
                    </button>
                  )}
                  {lap.runnerId === user?.uid && lap.status === 'claimed' && (
                    <button 
                      onClick={() => updateLapStatus(lap.id, 'running')}
                      className="flex-1 md:flex-none bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Start Lap
                    </button>
                  )}
                  {lap.runnerId === user?.uid && lap.status === 'running' && (
                    <button 
                      onClick={() => updateLapStatus(lap.id, 'complete')}
                      className="flex-1 md:flex-none bg-teal-500 text-white hover:bg-teal-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Finish Lap
                    </button>
                  )}
                </div>
              </div>
            ))}
            {relayLaps.length === 0 && (
              <div className="text-center p-8 border border-neutral-800 border-dashed rounded-2xl text-neutral-500 text-sm">
                No laps added yet. Tap "Add Next Lap" to build the board!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- LOG MODAL ---
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
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      const logRef = doc(db, 'artifacts', appId, 'users', user.uid, 'run_logs', day.id);
      await setDoc(logRef, {
        dayId: day.id,
        weekId: day.week,
        distance: Number(distance) || 0,
        duration: Number(duration) || 0,
        elevation: Number(elevation) || 0,
        heartRate: Number(heartRate) || 0,
        effort: Number(effort) || 0,
        notes: notes,
        vibe: vibe,
        actualDate: actualDate,
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error("Error saving log:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !existingLog) return;
    setSaving(true);
    try {
      const logRef = doc(db, 'artifacts', appId, 'users', user.uid, 'run_logs', day.id);
      await deleteDoc(logRef);
      onClose();
    } catch (err) {
      console.error("Error deleting log:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStravaSync = () => {
    // Simulated UI logic for pulling from Strava
    setDistance('3.2');
    setDuration('31');
    setElevation('120');
    setHeartRate('148');
    setNotes('Imported from Strava: "Morning Run"');
    setVibe('🚀');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-neutral-900 rounded-t-3xl md:rounded-3xl border border-neutral-800 shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-neutral-800">
          <div>
            <h3 className="text-xl font-black text-white">Log Your Run</h3>
            <p className="text-xs text-pink-500 font-bold tracking-widest uppercase mt-1">Week {day.week} • {day.day}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-neutral-800 text-neutral-400 rounded-full hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          
          {/* Strava Sync Button */}
          {profile?.stravaConnected && !existingLog && (
            <button 
              type="button" 
              onClick={handleStravaSync}
              className="w-full mb-5 bg-[#FC4C02]/10 border border-[#FC4C02]/30 text-[#FC4C02] hover:bg-[#FC4C02]/20 py-3 rounded-xl flex items-center justify-center text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <StravaIcon className="w-4 h-4 mr-2" /> Pull Latest Run from Strava
            </button>
          )}

          <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-4 mb-6">
            <h4 className="text-xs font-bold text-pink-400 uppercase mb-2 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" /> The Plan
            </h4>
            <p className="text-sm text-neutral-200 leading-relaxed">{day.workout}</p>
          </div>

          <form id="log-form" onSubmit={handleSave} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex justify-between">
                <span>Date Completed</span>
              </label>
              <input 
                type="date"
                value={actualDate} onChange={(e) => setActualDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium [color-scheme:dark]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Distance (mi)</label>
                <input 
                  type="number" step="0.01" 
                  value={distance} onChange={(e) => setDistance(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Time (min)</label>
                <input 
                  type="number" 
                  value={duration} onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Elevation (ft)</label>
                <input 
                  type="number" 
                  value={elevation} onChange={(e) => setElevation(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Avg HR (bpm)</label>
                <input 
                  type="number" 
                  value={heartRate} onChange={(e) => setHeartRate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Perceived Effort</label>
                <span className="text-lg font-black text-pink-500">{effort}<span className="text-sm text-neutral-500">/10</span></span>
              </div>
              <input 
                type="range" min="1" max="10" 
                value={effort} onChange={(e) => setEffort(e.target.value)}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                <span>Easy</span>
                <span>All Out</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Run Vibe</label>
              <div className="flex justify-between bg-neutral-950 border border-neutral-800 rounded-xl p-2">
                {['🥵', '🥶', '🌧️', '😎', '🤩', '🚀'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setVibe(emoji)}
                    className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg transition-all ${vibe === emoji ? 'bg-pink-500/20 border border-pink-500/50 scale-110' : 'hover:bg-neutral-800 opacity-50 hover:opacity-100'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Notes & Details</label>
              <textarea 
                rows="3"
                value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all text-sm resize-none"
                placeholder="Shoe worn? Blister status? Highs/Lows?"
              ></textarea>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-800 flex gap-3 pb-safe">
          {existingLog && (
            <button 
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-3 bg-neutral-800 text-neutral-400 font-bold rounded-xl hover:bg-neutral-700 hover:text-white transition-colors text-sm uppercase tracking-wider"
            >
              Delete
            </button>
          )}
          <button 
            type="submit" form="log-form"
            disabled={saving}
            className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-black text-sm uppercase tracking-widest rounded-xl py-3 shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_25px_rgba(219,39,119,0.5)] transition-all flex justify-center items-center"
          >
            {saving ? 'Saving...' : existingLog ? 'Update Log' : 'Save Run'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- AUTH SCREEN (LOGIN / SIGNUP) ---
function AuthScreen({ auth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        // SECURITY CHECK 1: Team Invite Code
        if (inviteCode !== TEAM_INVITE_CODE) {
          throw new Error("Whoops! Incorrect Team Invite Code.");
        }
        // SECURITY CHECK 2! Reject if email is not on the list.
        if (!ALLOWED_EMAILS.includes(email.toLowerCase().trim())) {
          throw new Error("Whoops! That email isn't on the approved Blister Sisters list.");
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background graphic */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&w=1200&q=80')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-neutral-900/80 backdrop-blur-md border border-pink-500/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)] mb-4">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">Blister Sisters</h1>
          <p className="text-xs text-pink-400 font-medium tracking-widest mt-1">Secure HQ Login</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold p-3 rounded-xl mb-6 flex items-start text-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 mb-1 block">Team Invite Code</label>
              <input 
                type="text" 
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
                placeholder="Enter the secret team code"
                required
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 mb-1 block">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 mb-1 block">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-medium"
              placeholder={isLogin ? "••••••••" : "Create a personal password"}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_25px_rgba(219,39,119,0.5)] transition-all mt-4"
          >
            {loading ? 'Authenticating...' : (isLogin ? 'Login to HQ' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            {isLogin ? "Not on the team yet? Sign up here." : "Already registered? Login here."}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- PROFILE SETUP MODAL ---
function ProfileSetupModal({ user, db, appId, existingProfile, onClose }) {
  const [name, setName] = useState(existingProfile?.displayName || '');
  const [avatarEmoji, setAvatarEmoji] = useState(existingProfile?.avatarEmoji || AVATAR_EMOJIS[0]);
  const [avatarBg, setAvatarBg] = useState(existingProfile?.avatarBg || AVATAR_BGS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), {
        displayName: name,
        avatarEmoji: avatarEmoji,
        avatarBg: avatarBg,
        createdAt: existingProfile ? existingProfile.createdAt : new Date().toISOString()
      }, { merge: true });
      onClose();
    } catch(err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-neutral-900 border border-pink-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
        {existingProfile && (
          <button onClick={onClose} className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white z-20 bg-neutral-800 rounded-full">
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
        <div className="relative z-10">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-3xl shadow-lg mx-auto mb-4`}>
            {avatarEmoji}
          </div>
          <h2 className="text-2xl font-black text-white mb-2 text-center">{existingProfile ? 'Edit Profile' : 'Welcome, Sister.'}</h2>
          <p className="text-sm text-neutral-400 mb-6 text-center">
            {existingProfile ? 'Update your runner flair.' : 'Enter your runner name and pick your flair to join the team.'}
          </p>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Runner Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Speedy Sarah"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Avatar Icon</label>
              <div className="flex flex-wrap gap-2 justify-between">
                {AVATAR_EMOJIS.map(emoji => (
                  <button type="button" key={emoji} onClick={() => setAvatarEmoji(emoji)} className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg transition-all ${avatarEmoji === emoji ? 'bg-neutral-800 border border-pink-500 scale-110' : 'bg-neutral-950 border border-neutral-800 hover:bg-neutral-800'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">Avatar Color</label>
              <div className="flex flex-wrap gap-2 justify-between">
                {AVATAR_BGS.map(bg => (
                  <button type="button" key={bg} onClick={() => setAvatarBg(bg)} className={`w-10 h-10 rounded-full bg-gradient-to-br ${bg} transition-all ${avatarBg === bg ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`} />
                ))}
              </div>
            </div>

            <button 
              type="submit"
              disabled={saving}
              className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center transition-all"
            >
              {saving ? 'Saving...' : (existingProfile ? 'Update Profile' : 'Join the Team')} <ArrowUpRight className="w-5 h-5 ml-2" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// UI Helpers
function NavButton({ icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-2 text-sm font-bold uppercase tracking-wider transition-colors ${
        isActive ? 'text-pink-500' : 'text-neutral-500 hover:text-neutral-300'
      }`}
    >
      {React.cloneElement(icon, { className: "w-4 h-4" })}
      <span>{label}</span>
    </button>
  );
}

function MobileNavButton({ icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${
        isActive ? 'text-pink-500' : 'text-neutral-500'
      }`}
    >
      {React.cloneElement(icon, { className: `w-5 h-5 mb-1 ${isActive ? 'drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]' : ''}` })}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}
