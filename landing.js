/* ============================================================================
   Landing page logic:
   1) 3D hero — rotating "H" mark made of pixel cubes + particle field,
      themed to match the Hekpixle palette (bone + slate-black).
   2) Fetch latest agent release and populate the download CTA + info card.
   3) Mouse parallax for the 3D scene.
   ============================================================================ */
(function () {
  'use strict';

  // -------- Read theme colors from CSS variables so the 3D scene matches ----
  function readThemeColors() {
    const cs = getComputedStyle(document.body);
    return {
      bg:      cs.getPropertyValue('--bg').trim()       || '#ece7dc',
      text:    cs.getPropertyValue('--text').trim()     || '#25282c',
      accent:  cs.getPropertyValue('--accent').trim()   || '#25282c',
      glow1:   cs.getPropertyValue('--glow-1').trim()    || '#2b2f33',
      glow2:   cs.getPropertyValue('--glow-2').trim()    || '#8a8f94',
      glow3:   cs.getPropertyValue('--glow-3').trim()    || '#b7ab92',
    };
  }

  // -------- 3D hero scene --------
  function initHero3D() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9);

    // Lights — three-point setup with the theme colors as tints
    let colors = readThemeColors();
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(5, 6, 8);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xb58aff, 0.8, 30);
    rimLight.position.set(-6, -2, -4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x4f8cff, 0.6, 30);
    fillLight.position.set(6, -3, -2);
    scene.add(fillLight);

    // -------- Build the "H" mark out of stacked cubes (pixel-art style) ----
    // The H is 4 wide × 6 tall, with a crossbar in the middle row.
    // We treat each pixel as a cube, slightly extruded.
    //   #
    //   #
    //   #
    //   ###
    //   #
    //   #
    //   #
    // Each cube is a small BoxGeometry with rounded edges (use simple box for now).
    const H_PATTERN = [
      // [row, col] — 0,0 = top-left. H is 6 rows × 4 cols (with crossbar at row 3)
      [0, 0], [0, 3],
      [1, 0], [1, 3],
      [2, 0], [2, 3],
      [3, 0], [3, 1], [3, 2], [3, 3],   // crossbar
      [4, 0], [4, 3],
      [5, 0], [5, 3],
      [6, 0], [6, 3],
    ];

    const cubeSize = 0.7;
    const cubeGap  = 0.08;
    const cols = 4, rows = 7;
    const totalW = cols * cubeSize + (cols - 1) * cubeGap;
    const totalH = rows * cubeSize + (rows - 1) * cubeGap;

    const hGroup = new THREE.Group();
    const cubeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors.text),
      roughness: 0.35,
      metalness: 0.2,
      flatShading: false,
    });

    H_PATTERN.forEach(([r, c]) => {
      const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize * 0.6);
      // Slight per-cube depth variation for a "pixel" look
      const mesh = new THREE.Mesh(geo, cubeMat.clone());
      const x = (c * (cubeSize + cubeGap)) - totalW / 2 + cubeSize / 2;
      const y = totalH / 2 - (r * (cubeSize + cubeGap)) - cubeSize / 2;
      mesh.position.set(x, y, 0);
      mesh.userData.baseZ = 0;
      // Subtle initial z variation
      mesh.position.z = (Math.random() - 0.5) * 0.2;
      mesh.userData.baseZ = mesh.position.z;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      hGroup.add(mesh);
    });

    // Small "live" indicator cube (green dot in upper-right of the H — like the SVG logo)
    const liveGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const liveMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    });
    const liveDot = new THREE.Mesh(liveGeo, liveMat);
    liveDot.position.set(totalW / 2 + 0.2, totalH / 2 - 0.1, 0.4);
    hGroup.add(liveDot);

    scene.add(hGroup);

    // -------- Particle field around the H --------
    const PARTICLE_COUNT = 220;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes      = new Float32Array(PARTICLE_COUNT);
    const phases     = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spherical distribution around the H
      const r = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 2;  // bias toward back
      sizes[i]  = 0.03 + Math.random() * 0.08;
      phases[i] = Math.random() * Math.PI * 2;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      color: new THREE.Color(colors.glow3),
      size: 0.1,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // -------- Mouse parallax --------
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    function onMouseMove(e) {
      // Normalize to [-1, 1]
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // Touch parallax (mobile)
    function onTouchMove(e) {
      if (!e.touches[0]) return;
      mouse.tx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.touches[0].clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // -------- Resize --------
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // -------- Re-read theme colors when the user toggles theme --------
    function refreshColors() {
      colors = readThemeColors();
      cubeMat.color.set(colors.text);
      particleMat.color.set(colors.glow3);
      // Adjust lights' intensities based on theme
      const isDark = document.body.dataset.theme === 'dark';
      ambient.intensity = isDark ? 0.35 : 0.55;
      keyLight.intensity = isDark ? 0.7 : 1.0;
    }
    window.addEventListener('themechange', refreshColors);

    // -------- Animation loop --------
    const clock = new THREE.Clock();
    function animate() {
      const t = clock.getElapsedTime();

      // Smooth mouse follow
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // Rotate the H group slowly + parallax tilt
      hGroup.rotation.y = mouse.x * 0.5 + t * 0.18;
      hGroup.rotation.x = -mouse.y * 0.3;
      // Subtle floating motion
      hGroup.position.y = Math.sin(t * 0.6) * 0.15;

      // Per-cube breathing in Z
      hGroup.children.forEach((child) => {
        if (child.userData.phase !== undefined) {
          child.position.z = child.userData.baseZ + Math.sin(t * 1.4 + child.userData.phase) * 0.12;
        }
      });

      // Pulsate the live dot
      const pulse = 1 + Math.sin(t * 2.5) * 0.15;
      liveDot.scale.set(pulse, pulse, pulse);
      liveMat.emissiveIntensity = 0.5 + Math.sin(t * 2.5) * 0.3;

      // Slowly rotate the particle field
      particles.rotation.y = t * 0.04;
      particles.rotation.x = Math.sin(t * 0.07) * 0.15;

      // Camera subtle dolly
      camera.position.z = 9 + Math.sin(t * 0.3) * 0.3;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();
  }

  // -------- Agent release info + download CTA --------
  function formatBytes(bytes) {
    if (!bytes) return '—';
    const u = ['B', 'KB', 'MB', 'GB'];
    let v = bytes, i = 0;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return v.toFixed(v < 10 ? 1 : 0) + ' ' + u[i];
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso + 'Z');  // SQLite stores UTC; add Z so JS parses as UTC
      return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return iso; }
  }

  async function loadAgentInfo() {
    const dl = document.getElementById('downloadArea');
    const meta = document.getElementById('downloadMeta');
    const info = document.getElementById('agentInfoWrap');
    if (!dl) return;

    const r = await window.api.getAgent();
    if (!r.ok || !r.data || !r.data.available) {
      dl.innerHTML = `
        <a href="/register" class="btn lg">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
          ثبت‌نام کنید تا اطلاع داده شود
        </a>
      `;
      meta.textContent = 'نسخه‌ی فعلی هنوز آپلود نشده است.';
      return;
    }

    const a = r.data;
    dl.innerHTML = `
      <a href="${a.download_url}" class="btn lg" download>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
        دانلود نسخه‌ی ${a.version}
      </a>
    `;
    meta.innerHTML = `حجم: <strong>${formatBytes(a.size)}</strong> · منتشرشده در ${formatDate(a.created_at)}`;

    // Show the info card with description
    if (info) {
      info.classList.remove('hidden');
      document.getElementById('agentVersion').textContent = 'v' + a.version;
      document.getElementById('agentMeta').innerHTML = `
        <span>📦 ${a.filename}</span>
        <span>📏 ${formatBytes(a.size)}</span>
        <span>📅 ${formatDate(a.created_at)}</span>
      `;
      document.getElementById('agentDesc').textContent = a.description || '(بدون توضیحات)';
    }
  }

  // -------- Init --------
  function init() {
    initHero3D();
    loadAgentInfo().catch((e) => console.warn('Failed to load agent info:', e));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
