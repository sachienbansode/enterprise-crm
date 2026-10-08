import { motion, AnimatePresence } from "framer-motion";
import { useVideoPlayer } from "@/lib/video";
import { AudioPlayer } from "./AudioPlayer";
import { Scene1 } from "./video_scenes/Scene1";
import { Scene2 } from "./video_scenes/Scene2";
import { Scene3 } from "./video_scenes/Scene3";
import { Scene4 } from "./video_scenes/Scene4";
import { Scene5 } from "./video_scenes/Scene5";
import { Scene6 } from "./video_scenes/Scene6";
import { Scene7 } from "./video_scenes/Scene7";
import { Scene8 } from "./video_scenes/Scene8";
import { Scene9 } from "./video_scenes/Scene9";
import { Scene10 } from "./video_scenes/Scene10";
import { Scene11 } from "./video_scenes/Scene11";

// Total: 194 seconds (~3 min 14 sec)
// AI scenes 6+7+8 = 48 seconds
const SCENE_DURATIONS = {
  opening: 15000,       // Scene 1 — NIYTRI CRM opening
  problem: 16000,       // Scene 2 — The problem
  verticals: 18000,     // Scene 3 — Customizable verticals
  client360: 22000,     // Scene 4 — 360 client registry
  pipeline: 20000,      // Scene 5 — Leads & deals pipeline
  aiIntro: 18000,       // Scene 6 — AI intro + English query
  aiMultilingual: 16000, // Scene 7 — Multi-lingual AI
  aiAnalytics: 14000,   // Scene 8 — AI analytics & insights
  workflows: 22000,     // Scene 9 — Custom workflows
  admin: 18000,         // Scene 10 — Audit + service requests
  closing: 15000,       // Scene 11 — Closing lockup
};

// Orb positions per scene [left%, top%]
const ORB_RED = [
  { l: "38%", t: "15%", s: 2.2 }, // opening
  { l: "8%", t: "45%", s: 1.6 },  // problem
  { l: "68%", t: "12%", s: 1.9 }, // verticals
  { l: "12%", t: "28%", s: 1.5 }, // client360
  { l: "62%", t: "55%", s: 2.0 }, // pipeline
  { l: "28%", t: "65%", s: 1.7 }, // aiIntro
  { l: "72%", t: "20%", s: 1.8 }, // aiMultilingual
  { l: "42%", t: "8%", s: 2.1 },  // aiAnalytics
  { l: "18%", t: "72%", s: 1.6 }, // workflows
  { l: "78%", t: "42%", s: 1.9 }, // admin
  { l: "45%", t: "35%", s: 2.4 }, // closing
];
const ORB_BLUE = [
  { l: "72%", t: "68%", s: 1.8 }, // opening
  { l: "62%", t: "22%", s: 1.5 }, // problem
  { l: "18%", t: "78%", s: 2.0 }, // verticals
  { l: "78%", t: "48%", s: 1.6 }, // client360
  { l: "18%", t: "22%", s: 1.4 }, // pipeline
  { l: "68%", t: "28%", s: 1.9 }, // aiIntro
  { l: "22%", t: "52%", s: 1.6 }, // aiMultilingual
  { l: "78%", t: "65%", s: 1.7 }, // aiAnalytics
  { l: "55%", t: "18%", s: 2.0 }, // workflows
  { l: "25%", t: "62%", s: 1.5 }, // admin
  { l: "22%", t: "62%", s: 1.8 }, // closing
];

const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7, Scene8, Scene9, Scene10, Scene11];
const SCENE_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11"];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  const oR = ORB_RED[currentScene] || ORB_RED[0];
  const oB = ORB_BLUE[currentScene] || ORB_BLUE[0];

  const SceneComponent = SCENES[currentScene];

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ background: "#0B0F1A" }}>
      {/* Audio */}
      <AudioPlayer />

      {/* Persistent: grid */}
      <div className="absolute inset-0 niytri-grid" />

      {/* Persistent: red ambient orb */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "50vw", height: "50vh",
          background: "radial-gradient(circle, #EF444430, transparent 68%)",
          filter: "blur(60px)",
        }}
        animate={{ left: oR.l, top: oR.t, scale: oR.s }}
        transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Persistent: blue ambient orb */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "44vw", height: "44vh",
          background: "radial-gradient(circle, #3B82F628, transparent 68%)",
          filter: "blur(70px)",
        }}
        animate={{ left: oB.l, top: oB.t, scale: oB.s }}
        transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Persistent: violet center glow (subtle) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[30vw] h-[30vh] rounded-full blur-[90px]"
          style={{ background: "radial-gradient(circle, #8B5CF615, transparent 70%)" }} />
      </div>

      {/* Persistent: floating accent particles */}
      {[
        { x: 9, y: 16, r: 2.5, color: "#EF4444", dur: 8 },
        { x: 91, y: 22, r: 2, color: "#3B82F6", dur: 10 },
        { x: 18, y: 82, r: 1.5, color: "#EF4444", dur: 7 },
        { x: 78, y: 75, r: 2.5, color: "#3B82F6", dur: 12 },
        { x: 52, y: 8, r: 1.5, color: "#8B5CF6", dur: 9 },
        { x: 62, y: 91, r: 2, color: "#EF4444", dur: 11 },
        { x: 4, y: 52, r: 1.5, color: "#3B82F6", dur: 14 },
        { x: 96, y: 48, r: 2, color: "#8B5CF6", dur: 8 },
      ].map((p, i) => (
        <motion.div key={i}
          className="absolute rounded-full pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.r * 2}px`, height: `${p.r * 2}px`, background: p.color, opacity: 0.5 }}
          animate={{ y: [0, -14, 0, 10, 0], x: [0, 6, -4, 0], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.9 }}
        />
      ))}

      {/* Scene progress dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20 pointer-events-none">
        {SCENES.map((_, i) => (
          <motion.div key={i}
            className="rounded-full"
            style={{ background: i === currentScene ? (i % 2 === 0 ? "#EF4444" : "#3B82F6") : "#374151" }}
            animate={{ width: i === currentScene ? "20px" : "6px", height: "6px", opacity: i === currentScene ? 1 : 0.4 }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>

      {/* Scene counter */}
      <div className="absolute top-5 right-6 z-20 pointer-events-none">
        <p style={{ fontFamily: "var(--font-mono)" }} className="text-[0.65vw] text-slate-600">
          {currentScene + 1} / {SCENES.length}
        </p>
      </div>

      {/* Scene content */}
      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={SCENE_KEYS[currentScene]} />}
      </AnimatePresence>
    </div>
  );
}
