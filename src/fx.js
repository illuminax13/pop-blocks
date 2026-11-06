const SPARK_LIFE_MS = 900;

function removeLater(el, ms) {
  const remove = () => el.remove();
  el.addEventListener("animationend", remove, { once: true });
  setTimeout(remove, ms);
}

export function burst(layer, x, y, count, emojis) {
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement("span");
    el.className = "spark";
    el.textContent = emojis[i % emojis.length];
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
    const dist = 42 + Math.random() * 86;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    el.style.setProperty("--dy", `${Math.sin(angle) * dist - 18}px`);
    layer.appendChild(el);
    removeLater(el, SPARK_LIFE_MS);
  }
}

export function floatScore(layer, rect, points) {
  const el = document.createElement("span");
  el.className = points >= 30 ? "floater floater-big" : "floater";
  el.textContent = `+${points}`;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + 2}px`;
  layer.appendChild(el);
  removeLater(el, SPARK_LIFE_MS);
}

export function flash(el) {
  el.classList.remove("on");
  void el.offsetWidth;
  el.classList.add("on");
}

export function startConfetti(canvas) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ctx = canvas.getContext("2d");
  const colors = ["#ff5d8f", "#ffd23f", "#3dd6a5", "#4aa8ff", "#b388ff", "#ff8a4c", "#fff4a8", "#7c5ce8"];
  const emojis = ["⭐", "💛", "💖", "✨", "🌸", "🎉"];
  let particles = [];
  let running = true;
  let last = 0;
  let emitAcc = 0;
  let raf = 0;

  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }

  function emit(count, fromTop) {
    for (let i = 0; i < count; i += 1) {
      const emoji = Math.random() < 0.22;
      particles.push({
        x: Math.random() * canvas.width,
        y: fromTop ? -20 * dpr : Math.random() * canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 2.4 * dpr,
        vy: (Math.random() * 2.4 + 1.1) * dpr,
        w: (Math.random() * 7 + 5) * dpr,
        h: (Math.random() * 10 + 6) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.22,
        color: colors[Math.floor(Math.random() * colors.length)],
        circle: Math.random() < 0.3,
        emoji: emoji ? emojis[Math.floor(Math.random() * emojis.length)] : "",
      });
    }
  }

  function drawParticle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.emoji) {
      ctx.font = `${Math.round(p.w * 2.2)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.emoji, 0, 0);
    } else if (p.circle) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.restore();
  }

  resize();
  emit(reduce ? 70 : 90, false);
  if (reduce) {
    particles.forEach((p) => {
      p.y = Math.random() * canvas.height;
      drawParticle(p);
    });
    return () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  function frame(t) {
    if (!running) return;
    const dt = last ? Math.min(34, t - last) : 16;
    last = t;
    emitAcc += dt;
    if (emitAcc > 260 && particles.length < 180) {
      emitAcc = 0;
      emit(10, true);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const next = [];
    for (const p of particles) {
      p.vy += 0.035 * dpr * (dt / 16);
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.rot += p.vr * (dt / 16);
      if (p.y < canvas.height + 30 * dpr) next.push(p);
      drawParticle(p);
    }
    particles = next;
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}
