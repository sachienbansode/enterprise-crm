import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, RefreshCw, Video, Calendar,
  Clock, Users, Edit2, Trash2, X, Check, AlertCircle, CheckCircle2,
  Copy, ExternalLink, Loader2,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/crm", "") || "";

// ─── IST helpers ──────────────────────────────────────────────────────────────
// Graph returns datetime strings without 'Z' even when UTC (e.g. "2026-03-23T10:00:00.0000000")
// We always store/send UTC and display in IST (+5:30).

/** Parse a Graph datetime string to a proper Date (always treat as UTC). */
function parseDT(iso: string | undefined): Date | null {
  if (!iso) return null;
  // Ensure it has Z so JS treats it as UTC regardless of browser timezone
  const s = iso.replace(/\.?\d{7}$/, "").replace(/\.0+$/, "");
  return new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
}

/** Format UTC ISO for display in IST. */
function fmt(iso: string | undefined) {
  const d = parseDT(iso);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}
function fmtTime(iso: string | undefined) {
  const d = parseDT(iso);
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
function fmtDate(iso: string | undefined) {
  const d = parseDT(iso);
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
}

/** Convert UTC ISO → IST datetime-local string ("YYYY-MM-DDTHH:MM") */
function toISTInput(iso: string): string {
  const d = parseDT(iso);
  if (!d || isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + (5 * 60 + 30) * 60000);
  return ist.toISOString().slice(0, 16);
}

/** Treat a datetime-local string as IST and return UTC ISO */
function fromISTInput(val: string): string {
  // Appending +05:30 makes JS parse as IST, then .toISOString() gives UTC
  return new Date(`${val}:00+05:30`).toISOString();
}

function isSameDayIST(isoA: string, b: Date): boolean {
  const a = parseDT(isoA);
  if (!a) return false;
  const opts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
  return a.toLocaleDateString("en-CA", opts) === b.toLocaleDateString("en-CA", opts);
}

interface Event {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  organizer?: { emailAddress: { address: string; name: string } };
  attendees?: { emailAddress: { address: string; name?: string }; type: string }[];
  isOnlineMeeting?: boolean;
  onlineMeeting?: { joinUrl: string };
  isCancelled?: boolean;
  body?: { content: string };
}

interface EventDetailProps {
  event: Event;
  userEmail: string;
  isDark: boolean;
  t: any;
  onClose: () => void;
  onRefresh: () => void;
}

function EventDetail({ event, userEmail, isDark, t, onClose, onRefresh }: EventDetailProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialise edit fields from UTC → IST
  const [subject, setSubject] = useState(event.subject);
  const [startTime, setStartTime] = useState(toISTInput(event.start.dateTime));
  const [endTime,   setEndTime]   = useState(toISTInput(event.end.dateTime));
  const [attendeeInput, setAttendeeInput] = useState("");
  const [attendees, setAttendees] = useState<string[]>(
    (event.attendees || []).map(a => a.emailAddress.address),
  );

  const copyLink = () => {
    const url = event.onlineMeeting?.joinUrl;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const save = async () => {
    setSaving(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/teams/calendar/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          subject,
          startTime: fromISTInput(startTime),
          endTime:   fromISTInput(endTime),
          attendees,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setResult({ ok: false, msg: d.error || "Failed to update" }); return; }
      setResult({ ok: true, msg: "Meeting updated — attendees will receive updated invites." });
      setEditing(false);
      setTimeout(() => { onRefresh(); }, 1500);
    } catch (e: any) { setResult({ ok: false, msg: e.message }); }
    setSaving(false);
  };

  const cancel = async () => {
    if (!confirm("Cancel this meeting? All attendees will receive a cancellation notice.")) return;
    setDeleting(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/teams/calendar/${event.id}?email=${encodeURIComponent(userEmail)}`, {
        method: "DELETE",
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setResult({ ok: false, msg: d.error || "Failed to cancel" }); return; }
      setResult({ ok: true, msg: "Meeting cancelled — attendees notified." });
      setTimeout(() => { onRefresh(); onClose(); }, 1800);
    } catch (e: any) { setResult({ ok: false, msg: e.message }); }
    setDeleting(false);
  };

  const addAttendee = () => {
    const em = attendeeInput.trim();
    if (em && em.includes("@") && !attendees.includes(em)) {
      setAttendees(prev => [...prev, em]);
      setAttendeeInput("");
    }
  };

  const inp = `w-full text-xs rounded-xl border px-3 py-2 ${t.inputBg} outline-none`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${t.bgCard} border ${t.border} rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-5 py-4 border-b ${t.border} flex items-start justify-between gap-3`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {event.isOnlineMeeting && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-700/40">Teams Meeting</span>}
              {event.isCancelled   && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-700/40">Cancelled</span>}
            </div>
            <div className={`text-sm font-semibold ${t.text} leading-tight`}>{event.subject}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!event.isCancelled && !editing && (
              <button onClick={() => setEditing(true)} className={`text-[11px] px-2.5 py-1.5 rounded-lg border ${t.border} ${t.textMuted} flex items-center gap-1 hover:opacity-70`}>
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
            <button onClick={onClose} className={`p-1.5 rounded-lg ${t.textMuted} hover:opacity-70`}><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {result && (
            <div className={`flex items-start gap-2 rounded-xl p-3 border text-xs ${result.ok ? "bg-emerald-900/30 border-emerald-700/40 text-emerald-400" : "bg-red-900/30 border-red-700/40 text-red-400"}`}>
              {result.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <p>{result.msg}</p>
            </div>
          )}

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Start (IST)</label>
                  <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>End (IST)</label>
                  <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${t.textMuted} block mb-1`}>Attendees</label>
                <div className="flex gap-2 mb-1.5">
                  <input value={attendeeInput} onChange={e => setAttendeeInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addAttendee()}
                    placeholder="email@example.com" className={`flex-1 ${inp}`} />
                  <button onClick={addAttendee} className="text-xs px-3 py-2 rounded-xl bg-blue-600 text-white">Add</button>
                </div>
                <div className="space-y-1">
                  {attendees.map(a => (
                    <div key={a} className={`flex items-center gap-2 text-[10px] px-2.5 py-1.5 rounded-lg ${t.bgCard} border ${t.border}`}>
                      <Users className="w-3 h-3 text-blue-400" />
                      <span className={`flex-1 ${t.text}`}>{a}</span>
                      <button onClick={() => setAttendees(prev => prev.filter(x => x !== a))} className="text-red-400 hover:text-red-300">×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} className={`flex-1 text-xs py-2.5 rounded-xl border ${t.border} ${t.textMuted}`}>Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 text-xs py-2.5 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className={`${isDark ? "bg-gray-800/60" : "bg-gray-50"} rounded-xl p-3`}>
                  <div className={`text-[10px] uppercase font-bold ${t.textMuted} mb-0.5`}>Start (IST)</div>
                  <div className={`text-xs font-medium ${t.text}`}>{fmt(event.start.dateTime)}</div>
                </div>
                <div className={`${isDark ? "bg-gray-800/60" : "bg-gray-50"} rounded-xl p-3`}>
                  <div className={`text-[10px] uppercase font-bold ${t.textMuted} mb-0.5`}>End (IST)</div>
                  <div className={`text-xs font-medium ${t.text}`}>{fmt(event.end.dateTime)}</div>
                </div>
              </div>

              {event.organizer && (
                <div>
                  <div className={`text-[10px] uppercase font-bold ${t.textMuted} mb-1`}>Organizer</div>
                  <div className={`text-xs ${t.text}`}>{event.organizer.emailAddress.name || event.organizer.emailAddress.address}</div>
                </div>
              )}

              {(event.attendees || []).length > 0 && (
                <div>
                  <div className={`text-[10px] uppercase font-bold ${t.textMuted} mb-1.5`}>Attendees ({event.attendees!.length})</div>
                  <div className="space-y-1">
                    {event.attendees!.map(a => (
                      <div key={a.emailAddress.address} className={`flex items-center gap-2 text-[10px] px-2.5 py-1.5 rounded-lg ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                        <Users className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span className={`flex-1 ${t.text}`}>{a.emailAddress.name || a.emailAddress.address}</span>
                        <span className={`${t.textMuted} capitalize`}>{a.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {event.isOnlineMeeting && event.onlineMeeting?.joinUrl && (
                <div className={`rounded-xl p-3 border ${isDark ? "border-blue-800/50 bg-blue-950/20" : "border-blue-200 bg-blue-50"}`}>
                  <div className={`text-[10px] uppercase font-bold mb-1.5 ${isDark ? "text-blue-400" : "text-blue-600"}`}>Teams Meeting Link</div>
                  <div className="flex gap-2">
                    <button onClick={copyLink} className={`flex-1 text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 ${isDark ? "bg-blue-900/40 text-blue-300 hover:bg-blue-900/60" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <a href={event.onlineMeeting.joinUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                      <ExternalLink className="w-3.5 h-3.5" /> Join Meeting
                    </a>
                  </div>
                </div>
              )}

              {!event.isCancelled && (
                <div className={`pt-2 border-t ${t.border}`}>
                  <button onClick={cancel} disabled={deleting} className="w-full text-xs py-2.5 rounded-xl border border-red-600/50 text-red-400 hover:bg-red-600/10 flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    {deleting ? "Cancelling…" : "Cancel Meeting"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage({ t, isDark, loggedUser }: { t: any; isDark: boolean; loggedUser?: any }) {
  const userEmail = loggedUser?.email || "";
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const getRange = useCallback(() => {
    if (view === "week") {
      const d = new Date(currentDate);
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: mon, to: sun };
    } else {
      const from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const to   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      return { from, to };
    }
  }, [currentDate, view]);

  const load = useCallback(async () => {
    if (!userEmail) { setError("No user email — please log in."); return; }
    setLoading(true); setError("");
    const { from, to } = getRange();
    try {
      const r = await fetch(
        `${API_BASE}/api/teams/calendar?email=${encodeURIComponent(userEmail)}&from=${from.toISOString()}&to=${to.toISOString()}`,
      );
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Failed to load calendar"); setEvents([]); }
      else setEvents(d.events || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [userEmail, getRange]);

  useEffect(() => { load(); }, [load]);

  const prev = () => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() - 7); else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const next = () => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  const { from: rangeFrom, to: rangeTo } = getRange();
  const rangeLabel = view === "week"
    ? `${rangeFrom.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })} – ${rangeTo.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`
    : currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

  const weekDays: Date[] = [];
  if (view === "week") {
    for (let i = 0; i < 7; i++) {
      const d = new Date(rangeFrom); d.setDate(rangeFrom.getDate() + i);
      weekDays.push(d);
    }
  }

  const monthDays: Date[] = [];
  if (view === "month") {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const last  = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
    for (let i = startDay; i > 0; i--) {
      const d = new Date(first); d.setDate(d.getDate() - i); monthDays.push(d);
    }
    for (let i = 1; i <= last.getDate(); i++) {
      monthDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    while (monthDays.length % 7 !== 0) {
      const d = new Date(monthDays[monthDays.length - 1]); d.setDate(d.getDate() + 1); monthDays.push(d);
    }
  }

  const todayDate = new Date();
  const eventsForDay = (day: Date) => events.filter(e => isSameDayIST(e.start.dateTime, day));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-5 py-4 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-sm font-bold ${t.text}`}>My Calendar</h2>
          <p className={`text-[10px] ${t.textMuted}`}>M365 calendar for {userEmail || "—"} · All times in IST (UTC+5:30)</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`flex rounded-xl border ${t.border} overflow-hidden text-xs`}>
            <button onClick={() => setView("week")} className={`px-3 py-1.5 ${view === "week" ? "bg-blue-600 text-white" : `${t.textMuted} hover:opacity-70`}`}>Week</button>
            <button onClick={() => setView("month")} className={`px-3 py-1.5 ${view === "month" ? "bg-blue-600 text-white" : `${t.textMuted} hover:opacity-70`}`}>Month</button>
          </div>
          <button onClick={load} disabled={loading} className={`p-2 rounded-xl border ${t.border} ${t.textMuted} hover:opacity-70 disabled:opacity-40`}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Nav bar */}
      <div className={`px-5 py-2.5 border-b ${t.border} flex items-center gap-3 flex-shrink-0`}>
        <button onClick={goToday} className={`text-xs px-3 py-1.5 rounded-xl border ${t.border} ${t.textMuted} hover:opacity-70`}>Today</button>
        <button onClick={prev} className={`p-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:opacity-70`}><ChevronLeft className="w-3.5 h-3.5" /></button>
        <button onClick={next} className={`p-1.5 rounded-lg border ${t.border} ${t.textMuted} hover:opacity-70`}><ChevronRight className="w-3.5 h-3.5" /></button>
        <span className={`text-sm font-semibold ${t.text} flex-1`}>{rangeLabel}</span>
        <div className={`flex items-center gap-1.5 text-[10px] ${t.textMuted}`}>
          <div className="w-2 h-2 rounded-full bg-blue-500" /> Teams
          <div className="w-2 h-2 rounded-full bg-violet-500 ml-2" /> Other
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-3 flex items-start gap-2 rounded-xl p-3 border text-xs bg-red-900/30 border-red-700/40 text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Could not load calendar:</strong> {error}
            {error.includes("Calendars") && (
              <p className="mt-1 text-[10px] opacity-80">Ensure the Azure AD app has <code className="bg-red-900/40 px-1 rounded">Calendars.Read</code> or <code className="bg-red-900/40 px-1 rounded">Calendars.ReadWrite</code> application permission with admin consent.</p>
            )}
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading && events.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className={`w-5 h-5 animate-spin ${t.textMuted}`} />
          </div>
        ) : view === "week" ? (
          <div className="space-y-2">
            {weekDays.map(day => {
              const dayEvents = eventsForDay(day);
              const isToday = isSameDayIST(todayDate.toISOString(), day);
              return (
                <div key={day.toISOString()} className={`rounded-xl border ${isToday ? (isDark ? "border-blue-700/60 bg-blue-950/10" : "border-blue-200 bg-blue-50/50") : t.border}`}>
                  <div className={`px-4 py-2 border-b ${isToday ? (isDark ? "border-blue-700/40" : "border-blue-200") : t.border} flex items-center gap-3`}>
                    <div className={`text-xs font-bold ${isToday ? "text-blue-400" : t.text}`}>
                      {day.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })}
                    </div>
                    {isToday && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold">TODAY</span>}
                    <span className={`ml-auto text-[10px] ${t.textMuted}`}>{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {dayEvents.length === 0 ? (
                      <div className={`text-[10px] text-center py-2 ${t.textMuted}`}>No events</div>
                    ) : dayEvents.map(ev => (
                      <EventCard key={ev.id} event={ev} t={t} isDark={isDark} onClick={() => setSelectedEvent(ev)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Month view */
          <div>
            <div className="grid grid-cols-7 mb-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <div key={d} className={`text-[10px] text-center font-bold ${t.textMuted} py-1`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map(day => {
                const dayEvents = eventsForDay(day);
                const isToday = isSameDayIST(todayDate.toISOString(), day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                return (
                  <div key={day.toISOString()} className={`min-h-[80px] rounded-xl p-1.5 border ${isToday ? (isDark ? "border-blue-600/60 bg-blue-950/20" : "border-blue-300 bg-blue-50") : isCurrentMonth ? t.border : `${t.border} opacity-40`}`}>
                    <div className={`text-[10px] font-bold mb-1 ${isToday ? "text-blue-400" : isCurrentMonth ? t.text : t.textMuted}`}>{day.getDate()}</div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                          className={`w-full text-left text-[9px] px-1.5 py-0.5 rounded-md truncate ${ev.isCancelled ? "opacity-40 line-through" : ""} ${ev.isOnlineMeeting ? (isDark ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-700") : (isDark ? "bg-violet-900/50 text-violet-300" : "bg-violet-100 text-violet-700")}`}>
                          {fmtTime(ev.start.dateTime)} {ev.subject}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className={`text-[9px] ${t.textMuted} px-1`}>+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All events list */}
        {!loading && events.length > 0 && (
          <div className="mt-5">
            <div className={`text-xs font-bold ${t.text} mb-2`}>All Events in Period ({events.length})</div>
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${ev.isCancelled ? "opacity-50" : ""} ${isDark ? "hover:bg-gray-800/60" : "hover:bg-gray-50"} ${t.border}`}>
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${ev.isOnlineMeeting ? "bg-blue-500" : "bg-violet-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${t.text} truncate ${ev.isCancelled ? "line-through" : ""}`}>{ev.subject}</div>
                    <div className={`text-[10px] ${t.textMuted} mt-0.5`}>
                      {fmtDate(ev.start.dateTime)} · {fmtTime(ev.start.dateTime)} – {fmtTime(ev.end.dateTime)} IST
                    </div>
                    {(ev.attendees || []).length > 0 && (
                      <div className={`text-[10px] ${t.textMuted} flex items-center gap-1 mt-0.5`}>
                        <Users className="w-3 h-3" />
                        {ev.attendees!.slice(0, 3).map(a => a.emailAddress.address).join(", ")}
                        {ev.attendees!.length > 3 && ` +${ev.attendees!.length - 3}`}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    {ev.isOnlineMeeting && <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-700/30">Teams</span>}
                    {ev.isCancelled    && <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-700/30">Cancelled</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && events.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Calendar className={`w-10 h-10 ${t.textMuted} opacity-30`} />
            <p className={`text-sm ${t.textMuted}`}>No events in this period</p>
            <p className={`text-xs ${t.textMuted} opacity-60`}>Use the Teams Meeting button in any Client view to schedule meetings</p>
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventDetail event={selectedEvent} userEmail={userEmail} isDark={isDark} t={t}
          onClose={() => setSelectedEvent(null)} onRefresh={load} />
      )}
    </div>
  );
}

function EventCard({ event, t, isDark, onClick }: { event: Event; t: any; isDark: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${event.isCancelled ? "opacity-50" : ""} ${isDark ? "hover:bg-gray-800/60" : "hover:bg-gray-100"}`}>
      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${event.isOnlineMeeting ? "bg-blue-500" : "bg-violet-500"}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${t.text} truncate ${event.isCancelled ? "line-through" : ""}`}>{event.subject}</div>
        <div className={`text-[10px] ${t.textMuted} flex items-center gap-1.5 mt-0.5`}>
          <Clock className="w-3 h-3" />
          {fmtTime(event.start.dateTime)} – {fmtTime(event.end.dateTime)} IST
          {event.isOnlineMeeting && <><Video className="w-3 h-3 text-blue-400 ml-1" /><span className="text-blue-400">Teams</span></>}
        </div>
      </div>
      {event.isCancelled && <span className="text-[9px] text-red-400 flex-shrink-0">Cancelled</span>}
    </button>
  );
}
