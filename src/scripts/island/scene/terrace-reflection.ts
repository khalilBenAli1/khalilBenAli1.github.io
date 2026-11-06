import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { SceneResources } from "./resources";

// The upper slab has a 3.05 base, .055 depth and .035 bevel.
const FLOOR_Y = 3.14;

/** Project the mirrored world into the authored slab so its grain and edges survive. */
export function createTerraceReflection(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.OrthographicCamera,
  world: THREE.Group,
  resources: SceneResources,
) {
  let floor: THREE.MeshPhysicalMaterial | undefined;
  world.traverse((mesh) => {
    if (
      !(mesh instanceof THREE.Mesh) ||
      mesh.userData.destination ||
      !(mesh.material instanceof THREE.MeshPhysicalMaterial) ||
      !mesh.userData.bakedSurface?.clearcoat
    )
      return;
    const bounds = new THREE.Box3().setFromObject(mesh);
    if (bounds.min.x < -7 && bounds.min.y < FLOOR_Y && bounds.max.y > FLOOR_Y)
      floor = mesh.material;
  });
  if (!floor) return null;

  // Detached from the scene: only update() can submit a reflection render.
  const mirror = resources.own(
    new Reflector(resources.own(new THREE.BufferGeometry()), {
      textureWidth: 512,
      textureHeight: 512,
      multisample: 0,
    }),
  );
  mirror.position.y = FLOOR_Y + 0.005;
  mirror.rotation.x = -Math.PI / 2;
  mirror.updateMatrixWorld();
  mirror.getReflectionCamera(camera).layers.enableAll();
  const mirrorMaterial = mirror.material as THREE.ShaderMaterial;
  const mirrorToWorld = mirror.matrixWorld.clone().invert();
  const projection = { value: new THREE.Matrix4() };
  const texture = { value: null as THREE.Texture | null };
  const material: THREE.MeshPhysicalMaterial = floor;
  const originalCompile = material.onBeforeCompile;
  const originalCacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.terraceProjection = projection;
    shader.uniforms.terraceReflection = texture;
    shader.vertexShader =
      `
      uniform mat4 terraceProjection;
      varying vec4 terraceCoord;
      varying float terraceHeight;
    ` +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        `
      #include <project_vertex>
      vec4 terraceWorldPosition = modelMatrix * vec4(transformed, 1.);
      terraceCoord = terraceProjection * terraceWorldPosition;
      terraceHeight = terraceWorldPosition.y;
    `,
      );
    shader.fragmentShader =
      `
      uniform sampler2D terraceReflection;
      varying vec4 terraceCoord;
      varying float terraceHeight;
    ` +
      shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
      if (abs(terraceHeight - ${FLOOR_Y}) < .012) {
        vec2 uv = terraceCoord.xy / terraceCoord.w;
        if (all(greaterThan(uv, vec2(.003))) && all(lessThan(uv, vec2(.997)))) {
          // A few adjacent samples soften the local reflection on the honed stone.
          const vec2 spread = vec2(.0023, .0035);
          vec4 reflected = .40 * texture2D(terraceReflection, uv)
            + .15 * texture2D(terraceReflection, uv + spread)
            + .15 * texture2D(terraceReflection, uv - spread)
            + .15 * texture2D(terraceReflection, uv + vec2(spread.x, -spread.y))
            + .15 * texture2D(terraceReflection, uv + vec2(-spread.x, spread.y));
          outgoingLight = mix(outgoingLight, min(reflected.rgb, vec3(1.6)), .37 * reflected.a);
        }
      }
      #include <opaque_fragment>
    `,
      );
  };
  material.customProgramCacheKey = () => "baked-polished-terrace-v1";
  material.needsUpdate = true;
  let captures = 0;
  let lastExhibit: unknown;
  let failed = false;
  const lastView = new THREE.Matrix4();
  const lastProjection = new THREE.Matrix4();

  return {
    get captures() {
      return captures;
    },
    update(moving: boolean) {
      // Keep the reflection anchored to the stone during the short flight.
      // Capture the new view once on arrival so navigation has the GPU to itself.
      if (failed || moving) return;
      const exhibit = world.userData.exhibitId;
      if (
        captures &&
        lastExhibit === exhibit &&
        lastView.equals(camera.matrixWorld) &&
        lastProjection.equals(camera.projectionMatrix)
      )
        return;
      // Unbind our own target while rendering into it, even for clipped surfaces.
      texture.value = null;
      const target = renderer.getRenderTarget();
      const xr = renderer.xr.enabled;
      const shadowUpdates = renderer.shadowMap.autoUpdate;
      try {
        mirror.onBeforeRender(
          renderer,
          scene,
          camera,
          mirror.geometry,
          mirrorMaterial,
          world,
        );
      } catch {
        // Keep the baked floor and normal rendering usable if the offscreen pass fails.
        failed = true;
        renderer.xr.enabled = xr;
        renderer.shadowMap.autoUpdate = shadowUpdates;
        renderer.setRenderTarget(target);
        material.onBeforeCompile = originalCompile;
        material.customProgramCacheKey = originalCacheKey;
        material.needsUpdate = true;
        resources.release(mirror);
        return;
      }
      projection.value
        .copy(mirrorMaterial.uniforms.textureMatrix.value)
        .multiply(mirrorToWorld);
      texture.value = mirror.getRenderTarget().texture;
      lastExhibit = exhibit;
      lastView.copy(camera.matrixWorld);
      lastProjection.copy(camera.projectionMatrix);
      captures++;
    },
  };
}
