import { useEffect, useRef, useState } from "react";
import { Bell, Video, X } from "lucide-react";

// On-screen reminders for the user's M365 calendar: 30 and 15 minutes before each meeting.
// Polls /api/teams/calendar every 5 min, checks every 30 s. Also raises a browser
// notification when the user has granted permission (works when the tab is in background).

const THRESHOLDS = [30, 15]; // minutes before start
const FETCH_EVERY_MS = 5 * 60_000;
const CHECK_EVERY_MS = 30_000;

interface CalEvent {
  id: string;
  subject: string;
  start: { dateTime: string };
  isCancelled?: boolean;
  onlineMeeting?: { joinUrl: string };
}
interface Reminder { key: string; subject: string; startsAt: Date; minutes: number; joinUrl?: string }

// Graph returns UTC datetimes without a 'Z'
const parseUTC = (s: string) => new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
const fmtIST = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

const SHOWN_KEY = "niytri_meeting_reminders_shown";
const loadShown = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]")); } catch { return new Set(); }
};
const saveShown = (s: Set<string>) => {
  try { localStorage.setItem(SHOWN_KEY, JSON.stringify([...s].slice(-200))); } catch { /* ignore */ }
};

export default function MeetingReminders({ email, apiBase = "" }: { email?: string; apiBase?: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const events = useRef<CalEvent[]>([]);
  const shown = useRef<Set<string>>(loadShown());

  // Ask once for browser-notification permission
  useEffect(() => {
    try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch { /* ignore */ }
  }, []);

  // Fetch upcoming events (next ~40 min)
  useEffect(() => {
    if (!email) return;
    let alive = true;
    const load = async () => {
      const from = new Date(Date.now() - 60_000), to = new Date(Date.now() + 40 * 60_000);
      try {
        const r = await fetch(`${apiBase}/api/teams/calendar?email=${encodeURIComponent(email)}&from=${from.toISOString()}&to=${to.toISOString()}`);
        if (!r.ok) return;
        const d = await r.json();
        if (alive) events.current = (d.events || []).filter((e: CalEvent) => !e.isCancelled);
      } catch { /* calendar not available — stay silent */ }
    };
    load();
    const id = setInterval(load, FETCH_EVERY_MS);
    return () => { alive = false; clearInterval(id); };
  }, [email, apiBase]);

  // Check thresholds
  useEffect(() => {
    if (!email) return;
    const check = () => {
      const now = Date.now();
      const fresh: Reminder[] = [];
      for (const ev of events.current) {
        const startsAt = parseUTC(ev.start.dateTime);
        const mins = (startsAt.getTime() - now) / 60_000;
        if (mins <= 0) continue;
        // Smallest threshold already reached (e.g. logging in 10 min before → one "15 min" reminder, not two)
        const due = THRESHOLDS.filter(th => mins <= th);
        if (!due.length) continue;
        const th = Math.min(...due);
        const key = `${ev.id}:${th}`;
        if (shown.current.has(key)) continue;
        due.forEach(d => shown.current.add(`${ev.id}:${d}`));
        fresh.push({ key, subject: ev.subject || "Meeting", startsAt, minutes: Math.max(1, Math.round(mins)), joinUrl: ev.onlineMeeting?.joinUrl });
      }
      if (!fresh.length) return;
      saveShown(shown.current);
      setReminders(r => [...r, ...fresh]);
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          fresh.forEach(f => new Notification(`Meeting in ${f.minutes} min`, { body: `${f.subject} · ${fmtIST(f.startsAt)} IST`, tag: f.key }));
        }
      } catch { /* ignore */ }
    };
    check();
    const id = setInterval(check, CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, [email]);

  if (!reminders.length) return null;
  const dismiss = (key: string) => setReminders(r => r.filter(x => x.key !== key));

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-80">
      {reminders.map(r => (
        <div key={r.key} role="alert" className="rounded-xl border border-blue-500/40 bg-slate-900 text-white shadow-2xl p-3 flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0"><Bell className="w-4 h-4" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-blue-300 font-medium">Meeting in {r.minutes} min · {fmtIST(r.startsAt)} IST</div>
            <div className="text-sm font-semibold truncate">{r.subject}</div>
            {r.joinUrl && (
              <a href={r.joinUrl} target="_blank" rel="noreferrer" onClick={() => dismiss(r.key)}
                className="mt-2 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500">
                <Video className="w-3 h-3" /> Join Teams
              </a>
            )}
          </div>
          <button onClick={() => dismiss(r.key)} className="text-slate-400 hover:text-white self-start" title="Dismiss"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}
