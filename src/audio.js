export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function context() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function play(fn) {
    if (muted) return;
    let ac;
    try {
      ac = context();
    } catch {
      return;
    }
    if (!ac || !master) return;
    try {
      fn(ac);
    } catch {
      /* A missing audio device should never stop the game. */
    }
  }

  function tone(ac, freq, dur, type, gainValue, delay = 0, slideTo = null) {
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(gainValue, t + Math.min(0.02, dur / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function noise(ac, dur, gainValue, delay = 0) {
    const t = ac.currentTime + delay;
    const length = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const env = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, t);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return {
    unlock() {
      if (muted) return;
      try {
        context();
      } catch {
        /* ignore */
      }
    },
    setMuted(value) {
      muted = Boolean(value);
    },
    isMuted() {
      return muted;
    },
    tap() {
      play((ac) => tone(ac, 740, 0.06, "sine", 0.05));
    },
    reward(points) {
      play((ac) => {
        const jitter = (Math.random() - 0.5) * 18;
        const base = 460 + Math.min(points, 40) * 8 + jitter;
        tone(ac, base, 0.11, "sine", 0.09);
        tone(ac, base * 1.25, 0.13, "triangle", 0.06, 0.06);
        tone(ac, base * 1.5, 0.16, "sine", 0.045, 0.12);
      });
    },
    boom() {
      play((ac) => {
        tone(ac, 280, 0.34, "triangle", 0.1, 0, 70);
        tone(ac, 180, 0.22, "sine", 0.06, 0.04, 110);
        noise(ac, 0.2, 0.045, 0.02);
        tone(ac, 520, 0.12, "sine", 0.05, 0.16, 760);
      });
    },
    win() {
      play((ac) => {
        [523, 659, 784, 1047].forEach((freq, index) => {
          tone(ac, freq, 0.22, "triangle", 0.08, index * 0.11);
          tone(ac, freq * 2, 0.16, "sine", 0.03, index * 0.11 + 0.03);
        });
      });
    },
  };
}
