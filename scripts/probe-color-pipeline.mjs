/** Reproducible WebGL pixel probe; no production page or asset mutation. */
import * as THREE from "three";

export async function probeColorPipeline(antialias = true) {
  const [{ createRendering }, { SceneResources }] = await Promise.all([
    import("../src/scripts/island/scene/rendering.ts"),
    import("../src/scripts/island/scene/resources.ts"),
  ]);
  const width = 320;
  const height = 240;
  const run = (high) => {
    const resources = new SceneResources();
    const canvas = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x273139);
    const camera = new THREE.OrthographicCamera(-2, 2, 1.5, -1.5, 0.1, 100);
    camera.position.z = 28;
    camera.updateMatrixWorld();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(-2, 3, 5);
    scene.add(sun);
    const geometry = resources.own(new THREE.PlaneGeometry(0.8, 0.8));
    const materials = [];
    const material = (value) => {
      materials.push(value);
      return resources.own(value);
    };
    const texture = (rgba) => {
      const value = resources.own(
        new THREE.DataTexture(new Uint8Array(rgba), 1, 1, THREE.RGBAFormat),
      );
      value.colorSpace = THREE.SRGBColorSpace;
      value.magFilter = THREE.NearestFilter;
      value.minFilter = THREE.NearestFilter;
      value.needsUpdate = true;
      return value;
    };
    const basic = (rgba, transparent = false) =>
      material(
        new THREE.MeshBasicMaterial({
          map: texture(rgba),
          toneMapped: false,
          transparent,
          depthWrite: !transparent,
        }),
      );
    const plane = (mat, x, y, z = 0, scale = 1) => {
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      scene.add(mesh);
      return mesh;
    };

    plane(basic([32, 102, 183, 255]), -1.1, 0.55);
    plane(basic([210, 40, 170, 255]), 0, 0.55);
    plane(
      material(
        new THREE.MeshStandardMaterial({ color: 0x23834c, roughness: 1 }),
      ),
      0,
      0.55,
      0.4,
      0.55,
    );
    plane(
      material(
        new THREE.MeshPhysicalMaterial({
          color: 0x000000,
          emissive: 0xffffff,
          emissiveMap: texture([148, 107, 63, 255]),
          roughness: 0.35,
          clearcoat: 0.6,
          toneMapped: false,
        }),
      ),
      1.1,
      0.55,
    );

    plane(basic([20, 70, 180, 255]), -1.1, -0.55);
    plane(basic([255, 255, 0, 128], true), -1.1, -0.55, 0.2);
    plane(basic([130, 90, 40, 255]), 0, -0.55);
    plane(
      material(
        new THREE.MeshPhysicalMaterial({
          color: 0x69a0b0,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          roughness: 0.8,
        }),
      ),
      0,
      -0.55,
      0.2,
    );
    plane(basic([255, 200, 20, 128], true), 0, -0.55, 0.4);
    plane(basic([24, 150, 75, 255]), 1.1, -0.55, 0.3);
    plane(basic([240, 30, 210, 180], true), 1.1, -0.55, 0);

    // A material-array mesh exercises both render phases on the same Object3D.
    const mixedGeometry = resources.own(
      new THREE.PlaneGeometry(0.8, 0.2, 2, 1),
    );
    mixedGeometry.clearGroups();
    mixedGeometry.addGroup(0, 6, 0);
    mixedGeometry.addGroup(6, 6, 1);
    const mixed = new THREE.Mesh(mixedGeometry, [
      material(new THREE.MeshStandardMaterial({ color: 0x888888 })),
      basic([190, 50, 25, 255]),
    ]);
    mixed.position.set(0, 1.25, 0);
    scene.add(mixed);

    const backing = plane(
      material(new THREE.MeshBasicMaterial({ color: 0x080808 })),
      1.25,
      1.25,
      0,
      0.45,
    );
    backing.rotation.set(-0.22, 0.37, 0);
    const oblique = plane(basic([246, 237, 228, 255]), 1.25, 1.25, 0.015, 0.4);
    oblique.rotation.copy(backing.rotation);
    const originalState = materials.map((mat) => [
      mat,
      mat.visible,
      mat.colorWrite,
    ]);
    const pipeline = createRendering(renderer, scene, camera, resources, high);
    pipeline.resize(width, height, 1);
    pipeline.render();
    const gl = renderer.getContext();
    const read = (x, y) => {
      const bytes = new Uint8Array(4);
      gl.readPixels(
        Math.floor(((x + 2) / 4) * width),
        Math.floor(((y + 1.5) / 3) * height),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        bytes,
      );
      return [...bytes];
    };
    const pixels = {
      screen: read(-1.1, 0.55),
      occludedScreen: read(0, 0.55),
      reflectiveBake: read(1.1, 0.55),
      transparentText: read(-1.1, -0.55),
      textOverGlass: read(0, -0.55),
      hiddenTransparent: read(1.1, -0.55),
      mixedLiteral: read(0.2, 1.25),
    };
    const patch = new Uint8Array(7 * 7 * 4);
    gl.readPixels(257, 217, 7, 7, gl.RGBA, gl.UNSIGNED_BYTE, patch);
    const obliquePatch = [...patch];
    const late = plane(basic([45, 180, 90, 255]), -1.1, 0.55, 0.2);
    pipeline.render();
    pixels.lateLiteral = read(-1.1, 0.55);
    const stateRestored = originalState.every(
      ([mat, visible, colorWrite]) =>
        mat.visible === visible && mat.colorWrite === colorWrite,
    );
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const result = {
      pixels,
      obliquePatch,
      stateRestored,
      cameraMask: camera.layers.mask,
      lateObjectMask: late.layers.mask,
      autoClear: renderer.autoClear,
      renderer: gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
      draws: renderer.info.render.calls,
    };
    resources.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return result;
  };
  return { antialias, low: run(false), high: run(true) };
}

if (typeof window === "undefined") {
  const { chromium } = await import("playwright");
  const { createServer } = await import("vite");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const assert = (await import("node:assert/strict")).default;
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    cacheDir: join(tmpdir(), "portfolio-color-pipeline-vite"),
    server: { host: "127.0.0.1", port: 4203, strictPort: true },
    optimizeDeps: {
      noDiscovery: true,
      include: [
        "three",
        "three/addons/postprocessing/EffectComposer.js",
        "three/addons/postprocessing/RenderPass.js",
        "three/addons/postprocessing/GTAOPass.js",
        "three/addons/postprocessing/OutputPass.js",
        "three/addons/postprocessing/Pass.js",
      ],
    },
  });
  await server.listen();
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("http://127.0.0.1:4203/__color-probe", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Color pipeline probe</title>",
      }),
    );
    await page.goto("http://127.0.0.1:4203/__color-probe");
    const results = await page.evaluate(async () => {
      const { probeColorPipeline } =
        await import("/scripts/probe-color-pipeline.mjs");
      return [await probeColorPipeline(true), await probeColorPipeline(false)];
    });
    assert.deepEqual(errors, [], "No shader, page or browser errors");
    for (const result of results) {
      for (const key of [
        "screen",
        "occludedScreen",
        "reflectiveBake",
        "transparentText",
        "textOverGlass",
        "hiddenTransparent",
        "mixedLiteral",
        "lateLiteral",
      ]) {
        const delta = result.high.pixels[key].map((channel, index) =>
          Math.abs(channel - result.low.pixels[key][index]),
        );
        assert.ok(
          Math.max(...delta) <= 2,
          `${key}: high/low differ by ${delta}`,
        );
      }
      assert.deepEqual(
        result.high.obliquePatch,
        result.low.obliquePatch,
        "Oblique literal plane remains visible across the copied depth buffer",
      );
      for (const mode of [result.low, result.high]) {
        assert.deepEqual(mode.pixels.screen, [32, 102, 183, 255]);
        assert.deepEqual(mode.pixels.hiddenTransparent, [24, 150, 75, 255]);
        assert.deepEqual(mode.pixels.mixedLiteral, [190, 50, 25, 255]);
        assert.deepEqual(mode.pixels.lateLiteral, [45, 180, 90, 255]);
        assert.ok(
          mode.pixels.occludedScreen[1] > mode.pixels.occludedScreen[0],
          "Physical geometry occludes the magenta screen behind it",
        );
        assert.equal(mode.stateRestored, true);
        assert.equal(mode.cameraMask, 15);
        assert.equal(mode.lateObjectMask, 4);
        assert.equal(mode.autoClear, true);
      }
    }
    console.log(
      JSON.stringify(
        {
          passed: true,
          results: results.map(({ antialias, low, high }) => ({
            antialias,
            low: {
              ...low,
              obliquePatch: {
                pixels: low.obliquePatch.length / 4,
                color: low.obliquePatch.slice(0, 4),
              },
            },
            high: {
              ...high,
              obliquePatch: {
                pixels: high.obliquePatch.length / 4,
                color: high.obliquePatch.slice(0, 4),
              },
            },
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    await server.close();
  }
}
