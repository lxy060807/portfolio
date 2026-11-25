const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createReelParticles(art) {
  const canvas = document.createElement("canvas");
  canvas.className = "reel-particles";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return { resize() {}, emit() {}, draw() { return false; }, clear() {} };
  art.append(canvas);

  const particles = [];
  let width = 0;
  let height = 0;
  let limit = 84;
  const tones = ["#463b32", "#856e57", "#fcf0d9", "#a29179"];

  function resize(nextWidth, nextHeight) {
    const density = Math.min(devicePixelRatio || 1, 1.5);
    width = nextWidth;
    height = nextHeight;
    limit = width <= 640 ? 48 : 84;
    canvas.width = Math.ceil(width * density);
    canvas.height = Math.ceil(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
  }

  function emit(x, y, radius, quantity, push, aspect) {
    for (let i = 0; i < quantity; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * (.83 + Math.random() * .36);
      const speed = 13 + Math.random() * 36;
      const life = .32 + Math.random() * .48;
      const rimX = Math.cos(angle) * distance * aspect;
      const rimY = Math.sin(angle) * distance;
      if (particles.length === limit) particles.shift();
      particles.push({
        x: x + rimX - rimY * .21,
        y: y + rimY + rimX * .21,
        vx: Math.cos(angle) * speed + push * (.38 + Math.random() * .47),
        vy: Math.sin(angle) * speed - 9,
        size: .75 + Math.random() * 1.65,
        life, remaining: life, color: tones[i % tones.length],
      });
    }
  }

  function draw(dt) {
    context.clearRect(0, 0, width, height);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.remaining -= dt;
      if (particle.remaining <= 0) {
        particles.splice(i, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const friction = Math.exp(-dt * 1.8);
      particle.vx *= friction;
      particle.vy = particle.vy * friction + 8 * dt;
      context.globalAlpha = clamp(particle.remaining / particle.life, 0, 1) ** .85 * .65;
      context.fillStyle = particle.color;
      context.fillRect(particle.x, particle.y, particle.size + Math.min(3, Math.abs(particle.vx) * .018), particle.size);
    }
    return particles.length > 0;
  }

  function clear() {
    particles.length = 0;
    context.clearRect(0, 0, width, height);
  }

  return { resize, emit, draw, clear };
}
