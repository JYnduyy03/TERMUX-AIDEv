/* ═══════════════════════════════════════════════════════════════
   AI Dev Studio — particles.js
   Particle background animation
   Chỉnh COUNT, COLORS, CONNECT_DIST để tuỳ biến
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COUNT       = 55;
  const COLORS      = ['#4d9eff','#3ddc97','#b78bfa','#ffd166'];
  const CONNECT_DIST = 110;
  const REPEL_DIST   = 90;
  const REPEL_FORCE  = 0.6;

  let W, H;
  let particles = [];
  let mouse = {x: -999, y: -999};

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function mkParticle() {
    return {
      x: rand(0, W), y: rand(0, H),
      r:  rand(0.8, 2.2),
      vx: rand(-0.18, 0.18),
      vy: rand(-0.22, -0.06),
      col:   COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: rand(0.15, 0.55),
      pulse: rand(0, Math.PI * 2),
      speed: rand(0.008, 0.022),
    };
  }

  function drawLine(a, b, dist) {
    const alpha = (1 - dist / CONNECT_DIST) * 0.18;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(77,158,255,${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    particles.forEach(p => {
      p.pulse += p.speed;
      p.x += p.vx;
      p.y += p.vy;

      // Mouse repel
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const md = Math.sqrt(dx*dx + dy*dy);
      if (md < REPEL_DIST && md > 0) {
        p.x += (dx / md) * REPEL_FORCE;
        p.y += (dy / md) * REPEL_FORCE;
      }

      // Wrap
      if (p.x < -10) p.x = W + 10;
      if (p.x > W+10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H+10) p.y = -10;

      // Draw
      const pr = p.r + Math.sin(p.pulse) * 0.6;
      const pa = p.alpha * (0.7 + Math.sin(p.pulse) * 0.3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
      ctx.fillStyle = p.col + Math.round(pa * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });

    // Connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < CONNECT_DIST) drawLine(particles[i], particles[j], d);
      }
    }

    requestAnimationFrame(frame);
  }

  function init() {
    resize();
    particles = Array.from({length: COUNT}, mkParticle);
    frame();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('touchmove', e => {
    mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY;
  }, {passive: true});

  init();
})();
