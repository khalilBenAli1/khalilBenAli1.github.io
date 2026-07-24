/**
 * Fixed Three.js background: a particle shell + wireframe icosahedron that
 * rotate with page scroll, shift color violet→sky, and parallax with the
 * mouse. Static single frame under reduced motion or on small screens.
 */
import * as THREE from "three";

const VIOLET = new THREE.Color(0x7c5cff);
const SKY = new THREE.Color(0x38bdf8);

export function initSpace(canvas: HTMLCanvasElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.innerWidth < 560;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.z = 16;

  // particle shell
  const COUNT = 1400;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const mix = new Float32Array(COUNT);
  const color = new THREE.Color();
  for (let i = 0; i < COUNT; i += 1) {
    const r = 9 + (Math.random() - 0.5) * 3.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.72;
    positions[i * 3 + 2] = r * Math.cos(phi);
    mix[i] = Math.random();
    color.copy(VIOLET).lerp(SKY, mix[i]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(points);

  const ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(4.4, 1),
    new THREE.MeshBasicMaterial({
      color: VIOLET,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    }),
  );
  ico.position.set(5.6, 0.6, -2);
  scene.add(ico);

  if (reduced || small) {
    points.rotation.y = 0.6;
    ico.rotation.set(0.4, 0.8, 0);
    canvas.style.opacity = "0.5";
    renderer.render(scene, camera);
    return;
  }

  let scrollP = 0;
  let mouseX = 0;
  let mouseY = 0;
  let running = true;

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = max > 0 ? window.scrollY / max : 0;
    canvas.style.opacity = String(0.9 - Math.min(scrollP * 3, 1) * 0.55);
  };
  const onMouse = (e: MouseEvent) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("mousemove", onMouse, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) tick();
  });

  const colorAttr = geo.getAttribute("color") as THREE.BufferAttribute;
  let lastColorP = -1;

  function tick(): void {
    if (!running) return;
    const t = performance.now() * 0.0001;

    points.rotation.y += (scrollP * 2.2 + t * 0.4 - points.rotation.y) * 0.05;
    points.rotation.x += (scrollP * 0.5 - points.rotation.x) * 0.05;
    ico.rotation.x += (scrollP * 3 - ico.rotation.x) * 0.05;
    ico.rotation.y += 0.0012;

    camera.position.x += (mouseX * 0.45 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.35 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    // shift particle colors toward sky as the page scrolls
    if (Math.abs(scrollP - lastColorP) > 0.02) {
      lastColorP = scrollP;
      for (let i = 0; i < COUNT; i += 1) {
        color
          .copy(VIOLET)
          .lerp(SKY, Math.min(1, mix[i] * 0.6 + scrollP * 0.7));
        colorAttr.setXYZ(i, color.r, color.g, color.b);
      }
      colorAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  onScroll();
  tick();
}
