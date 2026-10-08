import { useEffect, useRef } from "react";

export function AudioPlayer() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let ctx: AudioContext;

    const buildTrack = () => {
      ctx = new AudioContext();
      ctxRef.current = ctx;

      const now = ctx.currentTime;

      // Master chain: gain → compressor → destination
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.18, now + 5);

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master.connect(comp);
      comp.connect(ctx.destination);

      // Warm lowpass filter
      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 2400;
      lpf.Q.value = 0.7;
      lpf.connect(master);

      // Reverb simulation via convolver (DIY impulse)
      const convolver = ctx.createConvolver();
      const irLength = ctx.sampleRate * 2.5;
      const irBuffer = ctx.createBuffer(2, irLength, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = irBuffer.getChannelData(ch);
        for (let i = 0; i < irLength; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLength, 2.5);
        }
      }
      convolver.buffer = irBuffer;
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.28;
      convolver.connect(reverbGain);
      reverbGain.connect(lpf);

      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.72;
      dryGain.connect(lpf);

      // Pad chord — A minor: A2(110), E3(165), A3(220), C4(262), E4(330)
      const padFreqs = [110, 165, 220, 262, 330];
      const padOscs = padFreqs.map((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;

        // Slight detune for richness
        const detune = (i - 2) * 3;
        osc.detune.value = detune;

        const g = ctx.createGain();
        g.gain.value = 0.12 - i * 0.015;
        osc.connect(g);
        g.connect(dryGain);
        g.connect(convolver);
        osc.start(now);
        return osc;
      });

      // LFO for pad movement
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.18;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 5;
      lfo.connect(lfoGain);
      padOscs.forEach(osc => lfoGain.connect(osc.frequency));
      lfo.start(now);

      // High shimmer — C6(1047Hz) with vibrato
      const shimmer = ctx.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.value = 1047;
      const shimmerLfo = ctx.createOscillator();
      shimmerLfo.frequency.value = 5.5;
      const shimmerLfoG = ctx.createGain();
      shimmerLfoG.gain.value = 6;
      shimmerLfo.connect(shimmerLfoG);
      shimmerLfoG.connect(shimmer.frequency);
      shimmerLfo.start(now);
      const shimmerG = ctx.createGain();
      shimmerG.gain.setValueAtTime(0, now);
      shimmerG.gain.linearRampToValueAtTime(0.022, now + 8);
      shimmer.connect(shimmerG);
      shimmerG.connect(convolver);
      shimmer.start(now);

      // Subtle bass pulse — kicks on beat (120 BPM = 0.5s interval)
      const bpm = 80;
      const beat = 60 / bpm;
      const totalBeats = Math.ceil(240 / beat);

      for (let b = 0; b < totalBeats; b++) {
        const t = now + b * beat + 2;
        const isDownbeat = b % 4 === 0;
        const isBeat = b % 2 === 0;

        if (isDownbeat) {
          // Low kick
          const kick = ctx.createOscillator();
          kick.type = "sine";
          kick.frequency.setValueAtTime(80, t);
          kick.frequency.exponentialRampToValueAtTime(40, t + 0.12);
          const kickG = ctx.createGain();
          kickG.gain.setValueAtTime(0.22, t);
          kickG.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          kick.connect(kickG);
          kickG.connect(master);
          kick.start(t);
          kick.stop(t + 0.18);
        } else if (isBeat) {
          // Soft mid tick
          const tick = ctx.createOscillator();
          tick.type = "triangle";
          tick.frequency.value = 220;
          const tickG = ctx.createGain();
          tickG.gain.setValueAtTime(0.04, t);
          tickG.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          tick.connect(tickG);
          tickG.connect(master);
          tick.start(t);
          tick.stop(t + 0.08);
        }
      }

      // Arpeggio notes every 4 beats — A minor pentatonic
      const arpeggioNotes = [220, 262, 330, 392, 440, 330, 262];
      const arpeggioInterval = beat * 4;
      for (let i = 0; i < 60; i++) {
        const t = now + i * (beat * 0.75) + 10;
        const freq = arpeggioNotes[i % arpeggioNotes.length];
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.035, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(g);
        g.connect(convolver);
        osc.start(t);
        osc.stop(t + 0.4);
      }
    };

    // Try autoplay immediately, then on click
    const tryStart = async () => {
      try {
        buildTrack();
        if (ctxRef.current?.state === "suspended") {
          await ctxRef.current.resume();
        }
      } catch {
        const handler = async () => {
          buildTrack();
          await ctxRef.current?.resume();
          window.removeEventListener("pointerdown", handler);
        };
        window.addEventListener("pointerdown", handler, { once: true });
      }
    };

    const timer = setTimeout(tryStart, 300);

    return () => {
      clearTimeout(timer);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return null;
}
