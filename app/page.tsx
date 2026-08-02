"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Heart, Calendar, MapPin, Phone, MessageSquare, Copy, 
  ChevronDown, ChevronUp, Image as ImageIcon, Video, 
  Trash2, Plus, Save, Play, Pause, Music, Settings, X, Lock,
  ArrowUp, ArrowDown, Eye, EyeOff, Palette, FileText, Share2, Layers
} from 'lucide-react';

interface SectionConfig {
  id: string;
  name: string;
  visible: boolean;
}

interface PersonDetail {
  name: string;
  phone: string;
  relation: string;
  nickname: string;        // ← 추가
  nicknameColor: string;   // ← 추가
  father: string;
  fatherPhone: string;
  fatherBank: string;
  fatherAccount: string;
  fatherAccountHolder: string;
  mother: string;
  motherPhone: string;
  motherBank: string;
  motherAccount: string;
  motherAccountHolder: string;
  bank: string;
  account: string;
  accountHolder: string;
}

interface WeddingTheme {
  primaryColor: string; // hex or tailwind class hint
  fontFamily: 'serif' | 'sans';
  fallingEffect: '🌸' | '🍃' | '❄️' | '✨' | '❤️' | 'none';
  backgroundPreset: 'ivory' | 'rose' | 'sage' | 'classic';
}

interface WeddingData {
  
  theme: WeddingTheme;
  sections: SectionConfig[];
  groom: PersonDetail;
  bride: PersonDetail;
  date: string;
  adminPassword: string;

  location: {
    venue: string;
    address: string;
    phone: string;
    guide: string;
  };
  message: {
    title: string;
    subtitle: string;
    content: string;
  };
  images: {
    main: string;
    ending: string;
    groomProfile: string;
    brideProfile: string;
    gallery: string[];
    countdown: string;
  };
  video: {
    youtubeUrl: string;
  };
  audio: {
    bgmUrl: string;
  };
}

interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
}

const WEDDING_DOC_ID = "main"; // Firestore weddingInvites 컬렉션의 문서 ID


const DEFAULT_WEDDING_DATA: WeddingData = {
  theme: {
    primaryColor: '#C5A059', // Classic Gold
    fontFamily: 'serif',
    fallingEffect: '🌸',
    backgroundPreset: 'ivory'
  },
  adminPassword: "1234",
  sections: [
    { id: 'hero', name: '메인 히어로', visible: true },
    { id: 'message', name: '초대 메시지', visible: true },
    { id: 'intro', name: '신랑 신부 소개', visible: true },
    { id: 'calendar', name: '웨딩 달력', visible: true },
    { id: 'location', name: '오시는 길', visible: true },
    { id: 'gallery', name: '세로 감성 갤러리', visible: true },
    { id: 'video', name: '스페셜 무비', visible: true },
    { id: 'accounts', name: '마음 전하실 곳', visible: true },
    { id: 'guestbook', name: '방명록', visible: true },
    { id: 'ending', name: '엔딩 감사글', visible: true }
  ],
  groom: {
    name: "한민우",
    phone: "010-1234-5678",
    relation: "장남",
    nickname: "결아바라기",
    nicknameColor: "#6C7BC4",   // 블루 계열
    father: "한정식",
    fatherPhone: "010-9876-5432",
    fatherBank: "신한은행",
    fatherAccount: "110-987-654321",
    fatherAccountHolder: "한정식",
    mother: "이영희",
    motherPhone: "010-8765-4321",
    motherBank: "국민은행",
    motherAccount: "110-876-543210",
    motherAccountHolder: "이영희",
    bank: "신한은행",
    account: "110-123-456789",
    accountHolder: "한민우"
  },
  bride: {
    name: "서예진",
    phone: "010-5678-1234",
    relation: "장녀",
    nickname: "결아바라기",
    nicknameColor: "#E67E80",   // 핑크 계열
    father: "서태웅",
    fatherPhone: "010-1111-2222",
    fatherBank: "우리은행",
    fatherAccount: "1002-123-456789",
    fatherAccountHolder: "서태웅",
    mother: "김미숙",
    motherPhone: "010-3333-4444",
    motherBank: "하나은행",
    motherAccount: "301-1234-5678-90",
    motherAccountHolder: "김미숙",
    bank: "국민은행",
    account: "301-9876-5432-10",
    accountHolder: "서예진"
  },
  date: "2026-10-18T12:30:00",
  location: {
    venue: "라포레 드 가든 (그랜드볼룸홀)",
    address: "서울 강남구 테헤란로 123",
    phone: "02-123-4567",
    guide: "지하철: 2호선 역삼역 3번 출구 도보 5분\n버스: 역삼역 사거리 정류장 하차 (도보 3분)\n주차: 웨딩홀 건물 내 무료 주차 2시간 지원"
  },
  message: {
    title: "서로의 따스함으로 깊어질 계절",
    subtitle: "저희 두 사람이 사랑과 신뢰로\n하나의 소중한 가정을 이루고자 합니다.",
    content: "서로 다른 길을 걸어왔던 저희가\n이제 같은 곳을 바라보며 나란히 걷고자 합니다.\n\n바쁘시더라도 부디 참석하시어\n저희의 첫 발걸음을 축복해 주시면\n더할 나위 없는 기쁨이겠습니다."
  },
  images: {
    main: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
    ending: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800",
    groomProfile: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300",
    brideProfile: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300",
    countdown: "",
    gallery: [
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1519225495810-7512c696505a?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1507504038482-76210f5c24b8?auto=format&fit=crop&q=80&w=600",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=600"
    ]
  },
  video: {
  youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
  },
  audio: {
    bgmUrl: ""
  },
 
};

function formatKoreanDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function formatKoreanTime(dateStr: string) {
  const d = new Date(dateStr);
  let hour = d.getHours();
  const minute = d.getMinutes().toString().padStart(2, '0');
  const period = hour < 12 ? '오전' : '오후';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${period} ${hour}:${minute}`;
}

function getCalendarDateStrings(dateStr: string) {
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 예식 2시간 소요로 가정

  // UTC 기준 YYYYMMDDTHHMMSSZ 포맷 (한국시간 -9시간)
  const toUTCString = (d: Date) => {
    const utc = new Date(d.getTime() - 9 * 60 * 60 * 1000);
    return utc.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return {
    startUTC: toUTCString(start),
    endUTC: toUTCString(end),
    startLocal: `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}${String(start.getDate()).padStart(2, '0')}T${String(start.getHours()).padStart(2, '0')}${String(start.getMinutes()).padStart(2, '0')}00`,
    endLocal: `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}T${String(end.getHours()).padStart(2, '0')}${String(end.getMinutes()).padStart(2, '0')}00`,
  };
}

function getGoogleCalendarUrl(data: WeddingData) {
  const { startUTC, endUTC } = getCalendarDateStrings(data.date);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${data.groom.name} ♥ ${data.bride.name} 결혼식`,
    dates: `${startUTC}/${endUTC}`,
    location: data.location.address,
    details: `${data.location.venue}에서 열리는 결혼식입니다.`,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function getNaverCalendarUrl(data: WeddingData) {
  const { startLocal, endLocal } = getCalendarDateStrings(data.date);
  const params = new URLSearchParams({
    title: `${data.groom.name} ♥ ${data.bride.name} 결혼식`,
    startTime: startLocal,
    endTime: endLocal,
    location: data.location.address,
  });
  return `https://calendar.naver.com/quick/new?${params.toString()}`;
}

function downloadICSFile(data: WeddingData) {
  const { startUTC, endUTC } = getCalendarDateStrings(data.date);
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${data.groom.name} ♥ ${data.bride.name} 결혼식`,
    `DTSTART:${startUTC}`,
    `DTEND:${endUTC}`,
    `LOCATION:${data.location.address}`,
    `DESCRIPTION:${data.location.venue}에서 열리는 결혼식입니다.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wedding-invite.ics';
  link.click();
  URL.revokeObjectURL(url);
}

function FallingParticles({ type }: { type: WeddingTheme['fallingEffect'] }) {
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; duration: number; size: number }[]>([]);

  useEffect(() => {
    if (type === 'none') {
      setParticles([]);
      return;
    }
    const list = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 9,
      size: 10 + Math.random() * 14
    }));
    setParticles(list);
  }, [type]);

  if (type === 'none') return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute text-pink-300/40 animate-fall select-none"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}px`,
            top: '-30px',
            textShadow: '0 0 4px rgba(255,255,255,0.6)'
          }}
        >
          {type}
        </span>
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg) translateX(0); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.9; }
          100% { transform: translateY(110vh) rotate(360deg) translateX(70px); opacity: 0; }
        }
        .animate-fall {
          animation-name: fall;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
}

function MiniCalendar({ targetDateStr }: { targetDateStr: string }) {
  const dateObj = new Date(targetDateStr);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth(); // 0-indexed
  const weddingDay = dateObj.getDate();

  // Generate calendar days for current month/year
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-xs max-w-sm mx-auto text-stone-700">
      <div className="text-center font-serif text-lg font-bold text-[#4A3E3D] mb-4">
        {year}년 {month + 1}월
      </div>
      
      <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
        {weekdays.map((w, idx) => (
          <span key={w} className={`font-medium pb-2 ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-stone-400'}`}>
            {w}
          </span>
        ))}
        {daysArray.map((day, idx) => {
          const isWedding = day === weddingDay;
          const isSunday = idx % 7 === 0;
          return (
            <div key={idx} className="relative flex items-center justify-center h-8">
              {day !== null && (
                <span 
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs transition-all duration-300 ${
                    isWedding 
                      ? 'bg-[#C5A059] text-white font-bold scale-110 shadow-sm shadow-[#C5A059]/40 animate-pulse' 
                      : isSunday 
                        ? 'text-red-400' 
                        : 'text-stone-600'
                  }`}
                >
                  {day}
                </span>
              )}
              {isWedding && (
                <Heart size={8} className="absolute -bottom-1 text-red-400 fill-red-400 animate-bounce" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<WeddingData>(DEFAULT_WEDDING_DATA);
  const [editMode, setEditMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState(''); 
  const [toast, setToast] = useState<string | null>(null);
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [guestbookName, setGuestbookName] = useState('');
  const [guestbookMessage, setGuestbookMessage] = useState('');
  const [guestbookSubmitting, setGuestbookSubmitting] = useState(false);
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);

  // Custom styling controls
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [reorderPanelOpen, setReorderPanelOpen] = useState(false);

  // Accordion active states
  const [groomAccountOpen, setGroomAccountOpen] = useState(false);
  const [brideAccountOpen, setBrideAccountOpen] = useState(false);
  
  // Fullscreen gallery lightbox
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  
  // D-day timer variables
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Synthesized Romantic Background Music
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlayTriggered, setAutoPlayTriggered] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmIntervalRef = useRef<number | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const docRef = doc(db, "weddingInvites", WEDDING_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const remote = docSnap.data();
          // 중첩 객체까지 안전하게 병합 (theme, groom, bride, location, message, images, video)
          const merged: WeddingData = {
            ...DEFAULT_WEDDING_DATA,
            ...remote,
            theme: { ...DEFAULT_WEDDING_DATA.theme, ...(remote.theme || {}) },
            groom: { ...DEFAULT_WEDDING_DATA.groom, ...(remote.groom || {}) },
            bride: { ...DEFAULT_WEDDING_DATA.bride, ...(remote.bride || {}) },
            location: { ...DEFAULT_WEDDING_DATA.location, ...(remote.location || {}) },
            message: { ...DEFAULT_WEDDING_DATA.message, ...(remote.message || {}) },
            images: { ...DEFAULT_WEDDING_DATA.images, ...(remote.images || {}) },
            video: { ...DEFAULT_WEDDING_DATA.video, ...(remote.video || {}) },
            audio: { ...DEFAULT_WEDDING_DATA.audio, ...(remote.audio || {}) },
            adminPassword: remote.adminPassword || DEFAULT_WEDDING_DATA.adminPassword,
            sections: (() => {
              const savedSections = remote.sections?.length ? remote.sections : DEFAULT_WEDDING_DATA.sections;
              const savedIds = new Set(savedSections.map((s: SectionConfig) => s.id));
              const missingSections = DEFAULT_WEDDING_DATA.sections.filter(s => !savedIds.has(s.id));
              return [...savedSections, ...missingSections];
            })(),
          };
          setData(merged);
        }
        // 문서가 없으면 그냥 기본값(DEFAULT_WEDDING_DATA) 그대로 사용
      } catch (e) {
        console.error("Firestore 로딩 에러, 기본 데이터로 표시합니다.", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

 useEffect(() => {
   const q = query(collection(db, "weddingInvites", WEDDING_DOC_ID, "guestbook"), orderBy("createdAt", "desc"));
   const unsubscribe = onSnapshot(q, (snapshot) => {
     const entries = snapshot.docs.map(d => ({
       id: d.id,
       name: d.data().name || '',
       message: d.data().message || '',
     }));
     setGuestbookEntries(entries);
   }, (err) => {
     console.error("방명록 구독 에러", err);
   });
   return () => unsubscribe();
 }, []);


  // Time Countdown Logic
  useEffect(() => {
    const calc = () => {
      const diff = +new Date(data.date) - +new Date();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [data.date]);

 // BGM 관련 리소스 정리 (페이지 이동/언마운트 시)
 useEffect(() => {
   return () => {
     if (bgmIntervalRef.current) clearInterval(bgmIntervalRef.current);
     if (audioElRef.current) audioElRef.current.pause();
   };
 }, []);
 
 // 첫 터치/클릭 시 BGM 자동 시작
 useEffect(() => {
   if (isLoading || autoPlayTriggered) return;

   const handleFirstInteraction = () => {
     setAutoPlayTriggered(true);
 
     if (data.audio?.bgmUrl) {
       const audio = new Audio(data.audio.bgmUrl);
       audio.loop = true;
       audio.play().catch(() => {});
       audioElRef.current = audio;
       setIsPlaying(true);
       return;
     }

     const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
     audioCtxRef.current = ctx;

     const melody = [
       293.66, 370.01, 440.00, 587.33,
       220.00, 277.18, 329.63, 440.00,
       246.94, 293.66, 392.00, 493.88,
       164.81, 196.00, 246.94, 329.63,
       174.61, 220.00, 261.63, 349.23,
       196.00, 246.94, 293.66, 392.00,
       220.00, 261.63, 329.63, 440.00,
       293.66, 349.23, 440.00, 587.33
     ];

     let noteIdx = 0;
     const intervalId = window.setInterval(() => {
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(melody[noteIdx], ctx.currentTime);
       gain.gain.setValueAtTime(0.09, ctx.currentTime);
       gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
       osc.connect(gain);
       gain.connect(ctx.destination);
       osc.start();
       osc.stop(ctx.currentTime + 1.6);
       noteIdx = (noteIdx + 1) % melody.length;
     }, 400);

     bgmIntervalRef.current = intervalId;
     setIsPlaying(true);

     document.removeEventListener('click', handleFirstInteraction);
     document.removeEventListener('touchstart', handleFirstInteraction);
   };

   document.addEventListener('click', handleFirstInteraction);
   document.addEventListener('touchstart', handleFirstInteraction);

   return () => {
     document.removeEventListener('click', handleFirstInteraction);
     document.removeEventListener('touchstart', handleFirstInteraction);
   };
 }, [isLoading, autoPlayTriggered, data.audio?.bgmUrl]);

 const toggleMusic = () => {
   if (isPlaying) {
     if (audioElRef.current) audioElRef.current.pause();
     if (bgmIntervalRef.current) clearInterval(bgmIntervalRef.current);
     setIsPlaying(false);
     return;
   }

   if (data.audio?.bgmUrl) {
     if (!audioElRef.current) {
       audioElRef.current = new Audio(data.audio.bgmUrl);
       audioElRef.current.loop = true;
     } else {
       audioElRef.current.src = data.audio.bgmUrl;
     }
     audioElRef.current.play();
     setIsPlaying(true);
     showToast("업로드하신 배경음악이 재생됩니다 🎵");
     return;
   }

   if (!audioCtxRef.current) {
     audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
   }
   const ctx = audioCtxRef.current;
   if (ctx.state === 'suspended') ctx.resume();

   const melody = [
     293.66, 370.01, 440.00, 587.33,
     220.00, 277.18, 329.63, 440.00,
     246.94, 293.66, 392.00, 493.88,
     164.81, 196.00, 246.94, 329.63,
     174.61, 220.00, 261.63, 349.23,
     196.00, 246.94, 293.66, 392.00,
     220.00, 261.63, 329.63, 440.00,
     293.66, 349.23, 440.00, 587.33
   ];

   let noteIdx = 0;
   const intervalId = window.setInterval(() => {
     const osc = ctx.createOscillator();
     const gain = ctx.createGain();
     osc.type = 'triangle';
     osc.frequency.setValueAtTime(melody[noteIdx], ctx.currentTime);
     gain.gain.setValueAtTime(0.09, ctx.currentTime);
     gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
     osc.connect(gain);
     gain.connect(ctx.destination);
     osc.start();
     osc.stop(ctx.currentTime + 1.6);
     noteIdx = (noteIdx + 1) % melody.length;
   }, 400);

   bgmIntervalRef.current = intervalId;
   setIsPlaying(true);
   showToast("감미로운 어쿠스틱 오케스트라 연주가 시작되었습니다 🎻");
 };
 
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${title}가 클립보드에 복사되었습니다.`);
  };

  const handleDataChange = (path: string, val: any) => {
    const keys = path.split('.');
    setData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      let temp = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        temp = temp[keys[i]];
      }
      temp[keys[keys.length - 1]] = val;
      return copy;
    });
  };

  const uploadImageAndGetURL = async (file: File, folder: string): Promise<string> => {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `weddingInvites/${WEDDING_DOC_ID}/${folder}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const triggerImageUpload = async (path: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast("사진을 업로드하는 중입니다...");
    try {
      const url = await uploadImageAndGetURL(file, path.replace(/\./g, '_'));
      handleDataChange(path, url);
      showToast("감성 사진을 성공적으로 교체했습니다! 📸");
    } catch (err) {
      console.error("이미지 업로드 에러", err);
      showToast("사진 업로드에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= data.sections.length) return;
    
    const reordered = [...data.sections];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;
    
    handleDataChange('sections', reordered);
    showToast(`${temp.name} 섹션의 순서가 변경되었습니다!`);
  };

  const toggleSectionVisibility = (index: number) => {
    const copy = [...data.sections];
    copy[index].visible = !copy[index].visible;
    handleDataChange('sections', copy);
    showToast(`${copy[index].name} 노출 설정을 변경했습니다.`);
  };

  // Lock and password validator
  const unlockEditor = () => {
    if (passwordInput === data.adminPassword) {
      setEditMode(true);
      setAuthModalOpen(false);
      setPasswordInput('');
      showToast("관리자 모드가 승인되었습니다! 🛠️");
    } else {
      showToast("비밀번호가 올바르지 않습니다.");
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const saveAllToFirestore = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "weddingInvites", WEDDING_DOC_ID);
      await setDoc(docRef, data);
      setEditMode(false);
      showToast("전체 수정 사항이 저장되어 모든 하객에게 반영됩니다! 💾");
    } catch (e) {
      console.error("Firestore 저장 에러", e);
      showToast("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };
 const submitGuestbookEntry = async () => {
   if (!guestbookName.trim() || !guestbookMessage.trim()) {
     showToast("이름과 메시지를 모두 입력해주세요.");
     return;
   }
   setGuestbookSubmitting(true);
   try {
     await addDoc(collection(db, "weddingInvites", WEDDING_DOC_ID, "guestbook"), {
       name: guestbookName.trim(),
       message: guestbookMessage.trim(),
       createdAt: serverTimestamp(),
     });
     setGuestbookName('');
     setGuestbookMessage('');
     showToast("따뜻한 축하 메시지가 등록되었습니다 💌");
   } catch (err) {
     console.error("방명록 작성 에러", err);
     showToast("등록에 실패했습니다. 다시 시도해주세요.");
   } finally {
     setGuestbookSubmitting(false);
   }
 };

 const deleteGuestbookEntry = async (id: string) => {
   try {
     await deleteDoc(doc(db, "weddingInvites", WEDDING_DOC_ID, "guestbook", id));
     showToast("메시지를 삭제했습니다.");
   } catch (err) {
     console.error("방명록 삭제 에러", err);
     showToast("삭제에 실패했습니다.");
   }
 };

  // Add/Remove dynamic gallery items
  const removeGalleryImage = (idx: number) => {
    const filtered = data.images.gallery.filter((_, i) => i !== idx);
    handleDataChange('images.gallery', filtered);
  };

  const addGalleryImage = (url: string) => {
    if (!url) return;
    const updated = [...data.images.gallery, url];
    handleDataChange('images.gallery', updated);
    showToast("새 갤러리 사진을 추가했습니다.");
  };

  // Background style helper
  const getBackgroundClass = () => {
    switch (data.theme.backgroundPreset) {
      case 'rose': return 'bg-[#FCF6F5]';
      case 'sage': return 'bg-[#F4F6F4]';
      case 'classic': return 'bg-[#F9F9F9]';
      default: return 'bg-[#FDFBF9]'; // ivory
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundClass()} text-stone-700 ${data.theme.fontFamily === 'serif' ? 'font-serif' : 'font-sans'} flex justify-center selection:bg-pink-100 selection:text-pink-600`}>
      
      {/* Dynamic Style Link Imports for Fonts */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel..." />

      {isLoading ? (
        <div className="w-full max-w-md flex flex-col items-center justify-center min-h-screen bg-white gap-4">
          <div className="text-3xl animate-pulse">💍</div>
          <p className="text-xs text-stone-400 font-sans tracking-widest">잠시만 기다려 주세요</p>
        </div>
      ) : (
      <main className="w-full max-w-md bg-white shadow-2xl relative flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Floating Administrative Global Top Control Bar */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-100/60 px-4 py-3 flex justify-between items-center text-xs">
          <button 
            onClick={toggleMusic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 font-sans font-medium ${
              isPlaying 
                ? 'bg-pink-100 text-pink-600 shadow-sm shadow-pink-100' 
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            {isPlaying ? <Music size={12} className="animate-spin" /> : <Play size={12} />}
            <span>BGM {isPlaying ? "OFF" : "ON"}</span>
          </button>

          <div className="flex gap-1.5">
            {editMode ? (
              <>
                <button 
                  onClick={() => setThemePanelOpen(!themePanelOpen)}
                  className={`p-1.5 rounded-full border transition ${themePanelOpen ? 'bg-[#C5A059] text-white border-transparent' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                  title="테마 및 비주얼 제어"
                >
                  <Palette size={14} />
                </button>
                <button 
                  onClick={() => setReorderPanelOpen(!reorderPanelOpen)}
                  className={`p-1.5 rounded-full border transition ${reorderPanelOpen ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                  title="레이아웃 순서 편집기"
                >
                  <Layers size={14} />
                </button>
                <button 
                  onClick={saveAllToFirestore}
                  disabled={isSaving}
                  className="bg-[#C5A059] text-white flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-sans font-medium shadow-md shadow-amber-100 hover:bg-[#B38F48] transition"
                >
                  <Save size={12} />
                  <span>수정 완료</span>
                </button>
              </>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition font-sans"
              >
                <Settings size={12} />
                <span>관리자 모드</span>
              </button>
            )}
          </div>
        </div>

        {}
        {editMode && themePanelOpen && (
          <div className="bg-[#FAF6F2] border-b border-[#ECE5DD] p-4 text-xs space-y-3 animate-slideDown font-sans">
            <div className="flex justify-between items-center border-b pb-1">
              <span className="font-bold text-[#4A3E3D] flex items-center gap-1.5">
                <Palette size={13} className="text-[#C5A059]" />
                <span>글로벌 비주얼 테마 설정</span>
              </span>
              <button onClick={() => setThemePanelOpen(false)}><X size={14} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Point Color Choice */}
              <div className="space-y-1">
                <label className="text-[10px] text-stone-500 font-bold">포인트 골드 컬러</label>
                <input 
                  type="color" 
                  value={data.theme.primaryColor} 
                  onChange={(e) => handleDataChange('theme.primaryColor', e.target.value)}
                  className="w-full h-8 rounded border p-0.5 cursor-pointer"
                />
              </div>

              {/* Particle Type Custom Choice */}
              <div className="space-y-1">
                <label className="text-[10px] text-stone-500 font-bold">배경 흩날림 테마</label>
                <select 
                  value={data.theme.fallingEffect}
                  onChange={(e) => handleDataChange('theme.fallingEffect', e.target.value)}
                  className="w-full h-8 rounded border bg-white px-2"
                >
                  <option value="🌸">🌸 벚꽃 잎</option>
                  <option value="🍃">🍃 초록 이파리</option>
                  <option value="❄️">❄️ 클래식 하얀 눈꽃</option>
                  <option value="✨">✨ 은은한 골드 스파클</option>
                  <option value="❤️">❤️ 러블리 핑크하트</option>
                  <option value="none">사용 안 함</option>
                </select>
              </div>

              {/* Font Choice */}
              <div className="space-y-1">
                <label className="text-[10px] text-stone-500 font-bold">타이포 서체 종류</label>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleDataChange('theme.fontFamily', 'serif')}
                    className={`flex-1 py-1 border rounded text-center ${data.theme.fontFamily === 'serif' ? 'bg-[#C5A059] text-white' : 'bg-white'}`}
                  >
                    세리프 (우아함)
                  </button>
                  <button 
                    onClick={() => handleDataChange('theme.fontFamily', 'sans')}
                    className={`flex-1 py-1 border rounded text-center ${data.theme.fontFamily === 'sans' ? 'bg-[#C5A059] text-white' : 'bg-white'}`}
                  >
                    산세리프 (심플)
                  </button>
                </div>
              </div>

              {/* Theme Preset Choice */}
              <div className="space-y-1">
                <label className="text-[10px] text-stone-500 font-bold">전체 배경 프리셋</label>
                <select 
                  value={data.theme.backgroundPreset}
                  onChange={(e) => handleDataChange('theme.backgroundPreset', e.target.value)}
                  className="w-full h-8 rounded border bg-white px-2"
                >
                  <option value="ivory">아이보리 베이지</option>
                  <option value="rose">소프트 연로즈</option>
                  <option value="sage">내추럴 연세이지</option>
                  <option value="classic">깔끔하고 맑은 화이트</option>
                </select>
              </div>
              {/* ↓↓↓ 여기에 새로 추가 ↓↓↓ */}
              <div className="col-span-2 space-y-1 border-t pt-3 mt-1">
                <label className="text-[10px] text-stone-500 font-bold">배경음악(BGM) 파일 업로드</label>
                <input 
                  type="file" 
                  accept="audio/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    showToast("배경음악을 업로드하는 중입니다...");
                    try {
                      const url = await uploadImageAndGetURL(file, 'bgm');
                      handleDataChange('audio.bgmUrl', url);
                      showToast("배경음악이 교체되었습니다! 🎵");
                    } catch (err) {
                      console.error("BGM 업로드 에러", err);
                      showToast("업로드에 실패했습니다. 다시 시도해주세요.");
                    }
                  }}
                  className="w-full h-8 text-[10px]"
                />
                {data.audio.bgmUrl && (
                  <button 
                    onClick={() => { handleDataChange('audio.bgmUrl', ''); showToast("기본 연주곡으로 되돌렸습니다."); }}
                    className="text-[9px] text-red-500 underline"
                  >
                    기본 연주로 되돌리기
                  </button>
                )}
              </div>
                            {/* ↓↓↓ 비밀번호 변경 블록 (새로 추가) ↓↓↓ */}
              <div className="col-span-2 space-y-1 border-t pt-3 mt-1">
                <label className="text-[10px] text-stone-500 font-bold">관리자 비밀번호 변경</label>
                <div className="flex gap-1">
                  <input 
                    type="text" 
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="새 비밀번호 (4자 이상)"
                    className="flex-1 h-8 border rounded px-2 text-xs"
                  />
                  <button
                    onClick={() => {
                      if (newPasswordInput.trim().length < 4) {
                        showToast("비밀번호는 4자 이상 입력해주세요.");
                        return;
                      }
                      handleDataChange('adminPassword', newPasswordInput.trim());
                      setNewPasswordInput('');
                      showToast("비밀번호가 변경되었습니다. '수정 완료'를 눌러야 저장돼요!");
                    }}
                    className="px-3 py-1 bg-[#C5A059] text-white rounded text-xs whitespace-nowrap"
                  >
                    변경
                  </button>
                </div>
              </div>
              {/* ↑↑↑ 여기까지 ↑↑↑ */}


            </div>
          </div>
        )}

        {editMode && reorderPanelOpen && (
          <div className="bg-[#FAF6F2] border-b border-[#ECE5DD] p-4 text-xs space-y-3 animate-slideDown font-sans">
            <div className="flex justify-between items-center border-b pb-1">
              <span className="font-bold text-[#4A3E3D] flex items-center gap-1.5">
                <Layers size={13} className="text-[#C5A059]" />
                <span>청첩장 섹션 위치 & 노출 순서 편집기</span>
              </span>
              <button onClick={() => setReorderPanelOpen(false)}><X size={14} /></button>
            </div>
            <p className="text-[10px] text-stone-400">화살표(▲▼)를 눌러 섹션 노출 순서를 완전히 뒤바꾸거나 눈(👁️) 아이콘으로 끌 수 있습니다.</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {data.sections.map((sect, idx) => (
                <div key={sect.id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-stone-200">
                  <span className="font-medium text-stone-700">{idx + 1}. {sect.name}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleSectionVisibility(idx)}
                      className={`p-1.5 rounded-lg ${sect.visible ? 'bg-green-50 text-green-600' : 'bg-stone-100 text-stone-400'}`}
                      title={sect.visible ? "노출 중" : "비노출"}
                    >
                      {sect.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button 
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, 'up')}
                      className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-600 disabled:opacity-30"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button 
                      disabled={idx === data.sections.length - 1}
                      onClick={() => moveSection(idx, 'down')}
                      className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-600 disabled:opacity-30"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        {data.sections.filter(s => s.visible).map((sect, index) => {
          
          /* =========================================================================
             1. HERO SECTION
             ========================================================================= */
          if (sect.id === 'hero') {
            return (
              <section key={sect.id} className="relative aspect-[3/4] overflow-hidden bg-[#FAF6F2] flex flex-col justify-end p-8 text-center border-b border-stone-100/40">
                <FallingParticles type={data.theme.fallingEffect} />
                <div className="absolute inset-0 z-0">
                  <img 
                    src={data.images.main} 
                    alt="Wedding Main Hero" 
                    className="w-full h-full object-cover transition-transform duration-1000 transform hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/5 to-transparent"></div>
                </div>

                <div className="relative z-10 space-y-3.5">
                  <span className="font-sans tracking-widest text-[10px] text-stone-500 block uppercase font-semibold">
                    The Marriage Of
                  </span>
                  <h1 className="font-serif text-3xl font-semibold text-[#4A3E3D] flex justify-center items-center gap-3">
                    {editMode ? (
                      <div className="flex gap-1 text-xs">
                        <input 
                          type="text" 
                          value={data.groom.name} 
                          onChange={(e) => handleDataChange('groom.name', e.target.value)}
                          className="border p-1 w-20 text-center rounded bg-white"
                          placeholder="신랑 이름"
                        />
                        <span className="text-pink-300">♥</span>
                        <input 
                          type="text" 
                          value={data.bride.name} 
                          onChange={(e) => handleDataChange('bride.name', e.target.value)}
                          className="border p-1 w-20 text-center rounded bg-white"
                          placeholder="신부 이름"
                        />
                      </div>
                    ) : (
                      <>
                        {data.groom.name} 
                        <span className="text-pink-400 text-lg animate-pulse">♥</span> 
                        {data.bride.name}
                      </>
                    )}
                  </h1>
                  
                  <div className="text-stone-500 text-xs tracking-wide">
                    {editMode ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#C5A059] block">예식 날짜 시간 지정</label>
                        <input 
                          type="datetime-local" 
                          value={data.date.substring(0, 16)} 
                          onChange={(e) => handleDataChange('date', e.target.value)}
                          className="border p-1.5 text-xs rounded bg-white font-sans"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold">
                         {formatKoreanDate(data.date)}
                       </p>
                       <p className="mt-0.5">
                         {formatKoreanTime(data.date)}
                       </p>
                      </>
                    )}
                  </div>

                  <p className="font-serif font-semibold text-xs tracking-wider" style={{ color: data.theme.primaryColor }}>
                    {editMode ? (
                      <input 
                        type="text" 
                        value={data.location.venue} 
                        onChange={(e) => handleDataChange('location.venue', e.target.value)}
                        className="border p-1 w-full text-center rounded bg-white max-w-xs mx-auto"
                        placeholder="웨딩홀 이름"
                      />
                    ) : (
                      data.location.venue
                    )}
                  </p>

                  {editMode && (
                    <div className="bg-white/95 p-3 rounded-xl border border-pink-100 space-y-2 mt-2 text-left font-sans">
                      <p className="font-bold text-pink-600 text-[10px]">📷 메인 히어로 이미지 변경</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => triggerImageUpload('images.main', e)} 
                        className="w-full text-[10px]"
                      />
                      <input 
                        type="text" 
                        placeholder="또는 이미지 URL 입력" 
                        value={data.images.main} 
                        onChange={(e) => handleDataChange('images.main', e.target.value)}
                        className="w-full border rounded p-1 text-[10px] bg-stone-50"
                      />
                    </div>
                  )}
                </div>
              </section>
            );
          }

          /* =========================================================================
             2. MESSAGE SECTION
             ========================================================================= */
          if (sect.id === 'message') {
            return (
              <section key={sect.id} className="px-6 py-16 bg-white space-y-8 text-center relative border-b border-stone-100/40">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-12 bg-gradient-to-b from-stone-200 to-transparent"></div>
                <div className="flex justify-center">
                  <Heart size={20} className="text-pink-300 animate-pulse fill-pink-50" />
                </div>

                <div className="space-y-4">
                  <h2 className="font-serif text-lg font-semibold tracking-widest leading-relaxed text-[#9A7D6F]">
                    {editMode ? (
                      <input 
                        type="text" 
                        value={data.message.title} 
                        onChange={(e) => handleDataChange('message.title', e.target.value)}
                        className="w-full border rounded text-center text-xs p-1"
                        placeholder="감성 제목을 입력해 주세요"
                      />
                    ) : (
                      data.message.title
                    )}
                  </h2>

                  <div className="h-0.5 w-12 bg-pink-100/70 mx-auto"></div>

                  <p className="text-xs leading-relaxed text-stone-500 whitespace-pre-line text-center">
                    {editMode ? (
                      <textarea 
                        value={data.message.content} 
                        onChange={(e) => handleDataChange('message.content', e.target.value)}
                        className="w-full h-32 border rounded text-xs p-2 text-center"
                        placeholder="따뜻한 초대 글을 기재해 주세요"
                      />
                    ) : (
                      data.message.content
                    )}
                  </p>
                </div>

                {/* Real-time Countdown with Photo Overlay */}
                <div className="max-w-sm mx-auto">
                  <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[#ECE5DD] aspect-[4/5] bg-[#FAF6F2]">
                    {data.images.countdown ? (
                      <img 
                        src={data.images.countdown} 
                        alt="Countdown Photo" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C5A059]/50 text-xs font-sans">
                        사진을 업로드해 주세요
                      </div>
                    )}
                
                    {/* 하단 그라데이션 + 텍스트 오버레이 */}
                    <div className="absolute inset-x-0 bottom-0 pt-16 pb-6 px-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-center">
                      <p className="font-serif text-4xl font-bold text-white drop-shadow-sm">
                        D-{timeLeft.days}
                      </p>
                      <p className="text-xs text-white/90 font-sans mt-1 tracking-wide">
                        {new Date(data.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                
                    {editMode && (
                      <label className="absolute top-3 right-3 bg-white/90 hover:bg-white text-pink-600 text-[10px] px-2.5 py-1.5 rounded-full font-sans font-semibold cursor-pointer shadow-md">
                        📷 사진 변경
                       <input 
                          type="file" 
                          accept="image/*" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            showToast("사진을 업로드하는 중입니다...");
                            try {
                              const url = await uploadImageAndGetURL(file, 'countdown');
                              handleDataChange('images.countdown', url);
                              showToast("카운트다운 사진이 교체되었습니다! 📸");
                            } catch (err) {
                              console.error("업로드 에러", err);
                              showToast("업로드에 실패했습니다. 다시 시도해주세요.");
                            }
                          }} 
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                
                  <p className="text-center text-xs text-stone-500 font-sans mt-3">
                    행복한 예식날까지 <strong className="text-pink-400">{timeLeft.days}일 {timeLeft.hours}시간</strong> 남았습니다.
                  </p>
                </div>
              </section>
            );
          }

          /* =========================================================================
             3. INTRO SECTION (GROOM & BRIDE)
             ========================================================================= */
          if (sect.id === 'intro') {
            return (
              <section key={sect.id} className="px-6 py-16 bg-[#FAF6F2]/50 space-y-12 border-b border-stone-100/40">
                <div className="text-center space-y-2">
                  <h3 className="font-serif font-semibold text-lg text-[#9A7D6F] tracking-widest">
                    신랑 · 신부 소개
                  </h3>
                  <p className="text-[10px] text-stone-400 tracking-wider">가장 아름다운 약속을 맺은 사람들을 소개합니다</p>
                </div>

                <div className="grid grid-cols-2 gap-3 px-1">
                  {/* Groom Card */}
                  <div className="space-y-3 text-center">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm border border-stone-100">
                      <img 
                        src={data.images.groomProfile} 
                        alt="Groom Profile" 
                        className="w-full h-full object-cover"
                      />
                      {editMode && (
                        <label className="absolute top-2 right-2 bg-white/90 hover:bg-white text-pink-600 text-[9px] px-2 py-1 rounded-full font-sans font-semibold cursor-pointer shadow-md">
                          📷 변경
                          <input type="file" accept="image/*" onChange={(e) => triggerImageUpload('images.groomProfile', e)} className="hidden" />
                        </label>
                      )}
                    </div>
                
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-stone-800 flex items-center justify-center gap-1.5">
                        신랑 {editMode ? (
                          <input type="text" value={data.groom.name} onChange={(e) => handleDataChange('groom.name', e.target.value)} className="w-16 border rounded text-xs p-0.5 text-center" />
                        ) : data.groom.name}
                        <a href={`tel:${data.groom.phone}`} className="text-[#9A7D6F]"><Phone size={11} /></a>
                      </p>
                
                      {editMode ? (
                        <div className="flex items-center justify-center gap-1">
                          <input type="text" value={data.groom.nickname ?? ''} onChange={(e) => handleDataChange('groom.nickname', e.target.value)} placeholder="별명 입력" className="w-20 border rounded text-xs p-0.5 text-center" />
                          <input type="color" value={data.groom.nicknameColor || '#6C7BC4'} onChange={(e) => handleDataChange('groom.nicknameColor', e.target.value)} className="w-6 h-6 rounded border cursor-pointer p-0" />
                        </div>
                      ) : (
                        data.groom.nickname && <p className="text-sm font-semibold" style={{ color: data.groom.nicknameColor || '#6C7BC4' }}>{data.groom.nickname}</p>
                      )}
                
                      <div className="text-[10px] text-stone-400">
                        {editMode ? (
                          <div className="space-y-1 font-sans mt-1">
                            <input type="text" value={data.groom.father} onChange={(e) => handleDataChange('groom.father', e.target.value)} className="w-full border rounded text-[9px] p-0.5 text-center" placeholder="부친 이름" />
                            <input type="text" value={data.groom.mother} onChange={(e) => handleDataChange('groom.mother', e.target.value)} className="w-full border rounded text-[9px] p-0.5 text-center" placeholder="모친 이름" />
                          </div>
                        ) : (
                          <p>{data.groom.father} · {data.groom.mother}의 아들</p>
                        )}
                      </div>
                    </div>
                  </div>
                
                  {/* Bride Card */}
                  <div className="space-y-3 text-center">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm border border-stone-100">
                      <img 
                        src={data.images.brideProfile} 
                        alt="Bride Profile" 
                        className="w-full h-full object-cover"
                      />
                      {editMode && (
                        <label className="absolute top-2 right-2 bg-white/90 hover:bg-white text-pink-600 text-[9px] px-2 py-1 rounded-full font-sans font-semibold cursor-pointer shadow-md">
                          📷 변경
                          <input type="file" accept="image/*" onChange={(e) => triggerImageUpload('images.brideProfile', e)} className="hidden" />
                        </label>
                      )}
                    </div>
                
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-stone-800 flex items-center justify-center gap-1.5">
                        신부 {editMode ? (
                          <input type="text" value={data.bride.name} onChange={(e) => handleDataChange('bride.name', e.target.value)} className="w-16 border rounded text-xs p-0.5 text-center" />
                        ) : data.bride.name}
                        <a href={`tel:${data.bride.phone}`} className="text-[#9A7D6F]"><Phone size={11} /></a>
                      </p>
                
                      {editMode ? (
                        <div className="flex items-center justify-center gap-1">
                          <input type="text" value={data.bride.nickname ?? ''} onChange={(e) => handleDataChange('bride.nickname', e.target.value)} placeholder="별명 입력" className="w-20 border rounded text-xs p-0.5 text-center" />
                          <input type="color" value={data.bride.nicknameColor || '#C9A063'} onChange={(e) => handleDataChange('bride.nicknameColor', e.target.value)} className="w-6 h-6 rounded border cursor-pointer p-0" />
                        </div>
                      ) : (
                        data.bride.nickname && <p className="text-sm font-semibold" style={{ color: data.bride.nicknameColor || '#C9A063' }}>{data.bride.nickname}</p>
                      )}
                
                      <div className="text-[10px] text-stone-400">
                        {editMode ? (
                          <div className="space-y-1 font-sans mt-1">
                            <input type="text" value={data.bride.father} onChange={(e) => handleDataChange('bride.father', e.target.value)} className="w-full border rounded text-[9px] p-0.5 text-center" placeholder="부친 이름" />
                            <input type="text" value={data.bride.mother} onChange={(e) => handleDataChange('bride.mother', e.target.value)} className="w-full border rounded text-[9px] p-0.5 text-center" placeholder="모친 이름" />
                          </div>
                        ) : (
                          <p>{data.bride.father} · {data.bride.mother}의 딸</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Phone Numbers editing panel */}
                {editMode && (
                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-3 text-xs font-sans">
                    <p className="font-bold text-pink-600 border-b pb-1">📞 신랑 · 신부 연락처 정보 기재</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 block">🤵 신랑 본인 연락처</label>
                        <input type="text" value={data.groom.phone} onChange={(e) => handleDataChange('groom.phone', e.target.value)} className="w-full border rounded p-1 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-stone-500 block">👰 신부 본인 연락처</label>
                        <input type="text" value={data.bride.phone} onChange={(e) => handleDataChange('bride.phone', e.target.value)} className="w-full border rounded p-1 text-xs" />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          }

          /* =========================================================================
             4. CALENDAR SECTION
             ========================================================================= */
          if (sect.id === 'calendar') {
            return (
              <section key={sect.id} className="px-6 py-16 bg-white space-y-6 text-center border-b border-stone-100/40">
                <div className="text-center space-y-2 mb-4">
                  <h3 className="font-serif font-semibold text-lg text-[#9A7D6F] tracking-widest">
                    웨딩 달력
                  </h3>
                  <p className="text-[10px] text-stone-400">잊지 못할 단 한 번의 기념일</p>
                </div>
                
                <MiniCalendar targetDateStr={data.date} />
              </section>
            );
          }

          /* =========================================================================
             5. LOCATION SECTION
             ========================================================================= */
          if (sect.id === 'location') {
            return (
              <section key={sect.id} className="px-6 py-16 bg-[#FAF6F2]/30 space-y-8 border-b border-stone-100/40">
                <div className="text-center space-y-2">
                  <h3 className="font-serif font-semibold text-lg text-[#9A7D6F] tracking-widest">
                    오시는 길
                  </h3>
                  {editMode ? (
                   <input 
                      type="text" 
                      value={data.location.venue} 
                      onChange={(e) => handleDataChange('location.venue', e.target.value)}
                      className="text-xs font-semibold text-[#C5A059] border rounded p-1 text-center w-full max-w-xs mx-auto"
                      placeholder="웨딩홀 이름"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-[#C5A059]">{data.location.venue}</p>
                  )}
                </div>
                
                <style>{`
                  @keyframes glowPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0.5); }
                    50% { box-shadow: 0 0 0 8px rgba(197, 160, 89, 0); }
                  }
                  .animate-glow {
                    animation: glowPulse 1.8s ease-out infinite;
                  }
                  @keyframes pointBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                  }
                  .animate-point {
                    animation: pointBounce 1.2s ease-in-out infinite;
                  }
                `}</style>

                
                <div className="relative flex justify-center pt-2">
                  <span className="absolute -top-1 text-lg animate-point">👆</span>
                  
                  <button 
                    onClick={() => setCalendarMenuOpen(!calendarMenuOpen)}
                    className="animate-glow flex items-center gap-1.5 px-5 py-2.5 bg-white border border-[#C5A059] rounded-full text-xs font-semibold text-[#9A7D6F] shadow-sm hover:bg-[#FAF6F2] transition font-sans"
                  >
                    <Calendar size={13} />
                    <span>캘린더에 추가</span>
                  </button>
                
                  {calendarMenuOpen && (
                    <div className="absolute top-11 z-20 bg-white rounded-2xl border border-stone-200 shadow-lg overflow-hidden text-xs font-sans min-w-[180px]">
                      <a 
                        href={getGoogleCalendarUrl(data)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => setCalendarMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-[#FAF6F2] text-stone-600 border-b border-stone-100"
                      >
                        Google 캘린더
                      </a>
                      <a 
                        href={getNaverCalendarUrl(data)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={() => setCalendarMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-[#FAF6F2] text-stone-600 border-b border-stone-100"
                      >
                        네이버 캘린더
                      </a>
                      <button 
                        onClick={() => { downloadICSFile(data); setCalendarMenuOpen(false); }}
                        className="block w-full text-left px-4 py-3 hover:bg-[#FAF6F2] text-stone-600"
                      >
                        iPhone / Outlook (파일 다운로드)
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Google Map Embedded iframe using dynamic address mapping */}
                <div className="rounded-3xl overflow-hidden shadow-sm border border-[#EBE3DA] h-52 relative bg-stone-100">
                  <iframe 
                    title="Location Dynamic Wedding Map"
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }}
                    loading="lazy" 
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(data.location.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                </div>

                <div className="bg-white p-5 rounded-3xl space-y-4 shadow-xs border border-[#ECE5DD] text-xs font-sans">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-[#4A3E3D]">식장 상세 주소</p>
                      <p className="text-stone-500 mt-1 leading-relaxed">
                        {editMode ? (
                          <input type="text" value={data.location.address} onChange={(e) => handleDataChange('location.address', e.target.value)} className="w-full border rounded p-1 text-xs" />
                        ) : (
                          data.location.address
                        )}
                      </p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(data.location.address, "식장 주소")}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF6F2] border border-[#E6DDD4] hover:bg-[#F0E8DD] rounded-xl text-[10px] font-semibold text-stone-600 transition"
                    >
                      <Copy size={11} />
                      <span>복사</span>
                    </button>
                  </div>

                  <div className="border-t border-stone-100 pt-3">
                    <p className="font-semibold text-[#4A3E3D]">식장 전화번호</p>
                    <p className="text-stone-500 mt-1">
                      {editMode ? (
                        <input type="text" value={data.location.phone} onChange={(e) => handleDataChange('location.phone', e.target.value)} className="w-full border rounded p-1 text-xs" />
                      ) : (
                        data.location.phone
                      )}
                    </p>
                  </div>

                  <div className="border-t border-stone-100 pt-3">
                    <p className="font-semibold text-[#4A3E3D] mb-1">상세 대중교통 / 주차 가이드</p>
                    <p className="text-stone-500 leading-relaxed whitespace-pre-line text-stone-500">
                      {editMode ? (
                        <textarea value={data.location.guide} onChange={(e) => handleDataChange('location.guide', e.target.value)} className="w-full h-24 border rounded p-1 text-xs" />
                      ) : (
                        data.location.guide
                      )}
                    </p>
                  </div>
                </div>
              </section>
            );
          }

          /* =========================================================================
             6. GALLERY SECTION
             ========================================================================= */
          if (sect.id === 'gallery') {
            return (
              <section key={sect.id} className="py-16 bg-white space-y-6 border-b border-stone-100/40">
                <div className="text-center space-y-2">
                  <h3 className="font-serif font-semibold text-lg text-[#9A7D6F] tracking-widest">
                    웨딩 포토 갤러리
                  </h3>
                  <p className="text-[10px] text-stone-400">저희의 눈부신 아름다운 순간들</p>
                </div>

                {/* Grid Vertical flow with image thumbnail links */}
                <div className="px-6">
                  <div className="grid grid-cols-2 gap-3 auto-rows-fr">
                    {data.images.gallery.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setActivePhotoIndex(idx)}
                        className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm border-2 border-stone-100/30 cursor-pointer group hover:opacity-95 transition"
                      >
                        <img 
                          src={img} 
                          alt={`Wedding Gallery ${idx}`} 
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105" 
                          loading="lazy"
                        />
                        {editMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeGalleryImage(idx);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 shadow-md transition z-10"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Image adder card for edit Mode */}
                    {editMode && (
                      <div className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-pink-300 flex flex-col items-center justify-center p-3 bg-pink-50/20 font-sans">
                        <Plus size={18} className="text-pink-400 mb-1 animate-bounce" />
                        <span className="text-[10px] text-pink-600 mb-2 font-medium">사진 추가</span>
                        <label className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-2 py-1 rounded-md text-[9px] cursor-pointer transition">
                          파일 선택
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              showToast("갤러리 사진을 업로드하는 중입니다...");
                              try {
                                const url = await uploadImageAndGetURL(file, 'gallery');
                                addGalleryImage(url);
                              } catch (err) {
                                console.error("갤러리 업로드 에러", err);
                                showToast("사진 업로드에 실패했습니다. 다시 시도해주세요.");
                              }
                            }} 
                            className="hidden" 
                          />
                        </label>
                        <input 
                          type="text" 
                          placeholder="또는 URL 입력 후 Enter" 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addGalleryImage((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                          className="text-[9px] w-full mt-2 px-1.5 py-1 border rounded text-center bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          /* =========================================================================
             7. VIDEO SECTION
             ========================================================================= */
          if (sect.id === 'video') {
            return (
              <section key={sect.id} className="px-6 py-16 bg-[#FAF6F2]/30 space-y-6 border-b border-stone-100/40">
                <div className="text-center space-y-2">
                  <h3 className="font-serif font-semibold text-lg text-[#9A7D6F] tracking-widest">
                    스페셜 무비
                  </h3>
                  <p className="text-[10px] text-stone-400">행복한 연애 발자취 스토리</p>
                </div>

                <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-md border border-[#EBE3DA]">
                  <iframe
                    width="100%"
                    height="100%"
                    src={data.video.youtubeUrl}
                    title="Wedding Special Frame Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="border-0"
                  ></iframe>
                </div>

                {editMode && (
                  <div className="p-3 bg-pink-50/30 rounded-xl border border-pink-100 space-y-1.5 text-xs font-sans">
                    <label className="font-semibold text-pink-600 block">🎥 유튜브 Embed 비디오 주소 교체</label>
                    <input 
                      type="text" 
                      value={data.video.youtubeUrl}
                      onChange={(e) => handleDataChange('video.youtubeUrl', e.target.value)}
                      className="w-full border rounded p-1 text-xs bg-white"
                      placeholder="https://www.youtube.com/embed/..."
                    />
                    <p className="text-[9px] text-stone-400">유튜브 동영상 퍼가기용 URL 형태여야 안전하게 청전장에 임베드됩니다.</p>
                  </div>
                )}
              </section>
            );
          }

          /* =========================================================================
             8. ACCOUNTS SECTION
             ========================================================================= */
          if (sect.id === 'accounts') {
            return (
              <section key={sect.id} className="px-6 py-16 bg-white space-y-8 border-b border-stone-100/40">
                <div className="text-center space-y-2">
                  <h3 className="font-serif font-semibold text-lg text-[#9A7D6F] tracking-widest">
                    마음 전하실 곳
                  </h3>
                  <p className="text-[10px] text-stone-400">감사의 뜻을 실을 소중한 계좌번호 안내</p>
                </div>

                <div className="space-y-4 font-sans">
                  {/* Groom Party Accordion */}
                  <div className="bg-white rounded-2xl border border-stone-200/50 shadow-xs overflow-hidden">
                    <button 
                      onClick={() => setGroomAccountOpen(!groomAccountOpen)}
                      className="w-full px-5 py-4 flex justify-between items-center text-sm font-semibold text-stone-700 bg-[#FAF8F5]/30 hover:bg-[#FAF8F5]/80 transition"
                    >
                      <span>🤵 신랑측 계좌번호 확인</span>
                      {groomAccountOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {groomAccountOpen && (
                      <div className="px-5 pb-5 pt-2 space-y-3.5 border-t border-stone-100 text-xs text-stone-600 animate-slideDown">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-stone-800">{data.groom.bank} {data.groom.account}</p>
                            <p className="text-stone-400 text-[10px]">예금주: {data.groom.accountHolder}</p>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(data.groom.account, "신랑측 계좌")}
                            className="px-2.5 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-600 rounded transition"
                          >
                            복사
                          </button>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Bride Party Accordion */}
                  <div className="bg-white rounded-2xl border border-stone-200/50 shadow-xs overflow-hidden">
                    <button 
                      onClick={() => setBrideAccountOpen(!brideAccountOpen)}
                      className="w-full px-5 py-4 flex justify-between items-center text-sm font-semibold text-stone-700 bg-[#FAF8F5]/30 hover:bg-[#FAF8F5]/80 transition"
                    >
                      <span>👰 신부측 계좌번호 확인</span>
                      {brideAccountOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {brideAccountOpen && (
                      <div className="px-5 pb-5 pt-2 space-y-3.5 border-t border-stone-100 text-xs text-stone-600 animate-slideDown">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-stone-800">{data.bride.bank} {data.bride.account}</p>
                            <p className="text-stone-400 text-[10px]">예금주: {data.bride.accountHolder}</p>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(data.bride.account, "신부측 계좌")}
                            className="px-2.5 py-1 text-[11px] bg-stone-100 hover:bg-stone-200 text-stone-600 rounded transition"
                          >
                            복사
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Account Info Form */}
                {editMode && (
                  <div className="bg-white p-4 rounded-2xl border border-pink-100 space-y-4 text-xs font-sans">
                    <p className="font-bold text-pink-600 border-b pb-1">💳 축의금 전송 계좌번호 일괄 수정</p>
                    
                    {/* Groom side editing */}
                    <div className="space-y-2">
                      <p className="font-semibold text-[#C5A059]">🤵 신랑측 계좌</p>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="text" placeholder="신랑 은행" value={data.groom.bank} onChange={(e) => handleDataChange('groom.bank', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="신랑 계좌" value={data.groom.account} onChange={(e) => handleDataChange('groom.account', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="예금주" value={data.groom.accountHolder} onChange={(e) => handleDataChange('groom.accountHolder', e.target.value)} className="border rounded p-1 text-[10px]" />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="text" placeholder="부친 은행" value={data.groom.fatherBank} onChange={(e) => handleDataChange('groom.fatherBank', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="부친 계좌" value={data.groom.fatherAccount} onChange={(e) => handleDataChange('groom.fatherAccount', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="예금주" value={data.groom.fatherAccountHolder} onChange={(e) => handleDataChange('groom.fatherAccountHolder', e.target.value)} className="border rounded p-1 text-[10px]" />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="text" placeholder="모친 은행" value={data.groom.motherBank} onChange={(e) => handleDataChange('groom.motherBank', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="모친 계좌" value={data.groom.motherAccount} onChange={(e) => handleDataChange('groom.motherAccount', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="예금주" value={data.groom.motherAccountHolder} onChange={(e) => handleDataChange('groom.motherAccountHolder', e.target.value)} className="border rounded p-1 text-[10px]" />
                      </div>
                    </div>

                    {/* Bride side editing */}
                    <div className="space-y-2">
                      <p className="font-semibold text-pink-500">👰 신부측 계좌</p>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="text" placeholder="신부 은행" value={data.bride.bank} onChange={(e) => handleDataChange('bride.bank', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="신부 계좌" value={data.bride.account} onChange={(e) => handleDataChange('bride.account', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="예금주" value={data.bride.accountHolder} onChange={(e) => handleDataChange('bride.accountHolder', e.target.value)} className="border rounded p-1 text-[10px]" />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="text" placeholder="부친 은행" value={data.bride.fatherBank} onChange={(e) => handleDataChange('bride.fatherBank', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="부친 계좌" value={data.bride.fatherAccount} onChange={(e) => handleDataChange('bride.fatherAccount', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="예금주" value={data.bride.fatherAccountHolder} onChange={(e) => handleDataChange('bride.fatherAccountHolder', e.target.value)} className="border rounded p-1 text-[10px]" />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="text" placeholder="모친 은행" value={data.bride.motherBank} onChange={(e) => handleDataChange('bride.motherBank', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="모친 계좌" value={data.bride.motherAccount} onChange={(e) => handleDataChange('bride.motherAccount', e.target.value)} className="border rounded p-1 text-[10px]" />
                        <input type="text" placeholder="예금주" value={data.bride.motherAccountHolder} onChange={(e) => handleDataChange('bride.motherAccountHolder', e.target.value)} className="border rounded p-1 text-[10px]" />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          }
          
          /* =========================================================================
             GUESTBOOK SECTION
             ========================================================================= */
          if (sect.id === 'guestbook') {
            return (
              <section key={sect.id} className="px-6 py-16 bg-[#FAF6F2]/30 space-y-8 border-b border-stone-100/40">
                <div className="text-center space-y-2">
                  <h3 className="font-serif font-semibold text-lg text-[#9A7D6F] tracking-widest">
                    방명록
                  </h3>
                  <p className="text-[10px] text-stone-400">따뜻한 축하의 한마디를 남겨주세요</p>
                </div>

                {/* 작성 폼 - 모든 방문자에게 열려있음 */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-xs space-y-2.5 font-sans">
                  <input 
                    type="text" 
                    value={guestbookName}
                    onChange={(e) => setGuestbookName(e.target.value)}
                    placeholder="성함을 입력해주세요"
                    maxLength={20}
                    className="w-full border border-stone-200 rounded-xl p-2.5 text-xs"
                  />
                  <textarea 
                    value={guestbookMessage}
                    onChange={(e) => setGuestbookMessage(e.target.value)}
                    placeholder="축하 메시지를 남겨주세요"
                    maxLength={200}
                    className="w-full h-20 border border-stone-200 rounded-xl p-2.5 text-xs resize-none"
                  />
                  <button 
                    onClick={submitGuestbookEntry}
                    disabled={guestbookSubmitting}
                    className="w-full py-2.5 bg-[#C5A059] hover:bg-[#B38F48] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
                  >
                    {guestbookSubmitting ? "등록 중..." : "메시지 남기기"}
                  </button>
                </div>

                {/* 방명록 목록 */}
                <div className="space-y-3">
                  {guestbookEntries.length === 0 ? (
                    <p className="text-center text-xs text-stone-400 py-6">아직 남겨진 메시지가 없어요. 첫 번째 메시지를 남겨보세요!</p>
                  ) : (
                    guestbookEntries.map(entry => (
                      <div key={entry.id} className="bg-white p-3.5 rounded-2xl border border-stone-100 shadow-xs relative">
                        <p className="text-xs font-semibold text-[#9A7D6F] mb-1">{entry.name}</p>
                        <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">{entry.message}</p>
                        {editMode && (
                          <button 
                            onClick={() => deleteGuestbookEntry(entry.id)}
                            className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                            title="삭제"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          }

          /* =========================================================================
             9. ENDING SECTION
             ========================================================================= */
          if (sect.id === 'ending') {
            return (
              <section key={sect.id} className="relative aspect-[3/4] overflow-hidden bg-white flex flex-col justify-end p-8 text-center">
                <div className="absolute inset-0 z-0">
                  <img 
                    src={data.images.ending} 
                    alt="Wedding Beautiful Ending" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#FAF6F2] via-transparent to-transparent"></div>
                </div>

                <div className="relative z-10 space-y-3 bg-white/40 p-6 rounded-3xl backdrop-blur-md border border-white/40 shadow-xs mb-4">
                  <h4 className="font-serif text-[#9A7D6F] text-base font-bold tracking-widest">감사합니다</h4>
                  
                  <div className="text-stone-600 text-[11px] leading-relaxed font-medium">
                    {editMode ? (
                      <textarea 
                        value={data.message.subtitle} 
                        onChange={(e) => handleDataChange('message.subtitle', e.target.value)}
                        className="w-full h-16 border rounded text-[10px] p-1 text-center bg-white"
                        placeholder="감사글 엔딩 메시지"
                      />
                    ) : (
                      <p className="whitespace-pre-line">{data.message.subtitle}</p>
                    )}
                  </div>
                </div>

                {editMode && (
                  <div className="relative z-20 bg-white/95 p-3 rounded-xl border border-pink-100 space-y-1.5 text-left text-xs font-sans mt-2">
                    <p className="font-bold text-pink-600 text-[10px]">📷 엔딩 하단 이미지 변경</p>
                    <input type="file" accept="image/*" onChange={(e) => triggerImageUpload('images.ending', e)} className="w-full text-[10px]" />
                  </div>
                )}
              </section>
            );
          }

          return null;
        })}

        {/* Footer info brand mark */}
        <footer className="py-10 bg-[#FAF6F2] border-t border-[#ECE5DD] text-center text-[10px] text-stone-400 font-sans tracking-wide">
          <p>© 2026 {data.groom.name} & {data.bride.name} Wedding Invitation</p>
          <p className="mt-1">All rights reserved. Designed with customizable visual systems.</p>
        </footer>

        {/* Dynamic Photo view lightbox */}
        {activePhotoIndex !== null && (
          <div 
            className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-center items-center font-sans"
            onClick={() => setActivePhotoIndex(null)}
          >
            <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setActivePhotoIndex(null)}>
              <X size={24} />
            </button>
            <div className="max-w-full max-h-[75vh] px-4 flex items-center justify-center">
              <img 
                src={data.images.gallery[activePhotoIndex]} 
                alt={`Wedding detailed view ${activePhotoIndex}`} 
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
            <div className="mt-4 text-stone-300 text-xs flex gap-6">
              <span>{activePhotoIndex + 1} / {data.images.gallery.length}</span>
              <span>터치하여 라이트박스 닫기</span>
            </div>
          </div>
        )}

        {/* Admin confirmation portal login */}
        {authModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 font-sans">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-stone-100 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-serif font-bold text-base text-[#4A3E3D] flex items-center gap-2">
                  <Lock size={16} className="text-[#C5A059]" />
                  <span>관리자 융합 편집 모드 진입</span>
                </h3>
                <button onClick={() => setAuthModalOpen(false)}>
                  <X size={18} className="text-stone-400 hover:text-stone-600" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-stone-500 leading-relaxed">
                  청첩장의 모든 미디어 주소, 위치 순서, 입자 형태, 텍스트 글귀 한 단어까지 완벽히 조작할 수 있는 권한을 부여합니다.
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-bold">비밀번호</label>
                  <input 
                    type="password" 
                    placeholder="비밀번호를 입력하세요" 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') unlockEditor(); }}
                    className="w-full border rounded-xl p-2.5 text-sm focus:outline-[#C5A059] bg-stone-50"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setAuthModalOpen(false)}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold rounded-xl"
                >
                  취소
                </button>
                <button 
                  onClick={unlockEditor}
                  className="flex-1 py-2 bg-[#C5A059] hover:bg-[#B38F48] text-white text-xs font-semibold rounded-xl"
                >
                  기기 인증
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Action float notification toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#4A3E3D]/95 text-white text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap animate-slideUp font-sans">
            <Heart size={11} className="fill-pink-300 text-pink-300" />
            <span>{toast}</span>
          </div>
        )}

      </main>
      )}{/* isLoading 삼항연산자 닫기 */}
    </div>
  );
}