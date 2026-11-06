import * as THREE from "three";

/** Blend three world-space projections so curved limestone has no stretched UV seams. */
export function configureCoastalStone(
  material: THREE.MeshStandardMaterial,
): void {
  if (!material.map || material.userData.coastalTriplanar) return;
  material.userData.coastalTriplanar = true;
  material.bumpMap = material.bumpMap ?? material.map;
  material.bumpScale = 0.018;
  material.map.wrapS = material.map.wrapT = THREE.RepeatWrapping;
  material.bumpMap.wrapS = material.bumpMap.wrapT = THREE.RepeatWrapping;
  material.onBeforeCompile = (shader) => {
    const varying = `varying vec3 vCoastalPosition; varying vec3 vCoastalNormal;`;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + varying)
      .replace(
        "#include <project_vertex>",
        `vCoastalPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vCoastalNormal = inverseTransformDirection(transformedNormal, viewMatrix);
        #include <project_vertex>`,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      ${varying}
      vec4 coastalSample(sampler2D surface, vec3 p) {
        vec3 blend = pow(abs(normalize(vCoastalNormal)), vec3(4.0));
        blend /= max(dot(blend, vec3(1.0)), .0001);
        return texture2D(surface, p.yz) * blend.x
          + texture2D(surface, p.xz) * blend.y
          + texture2D(surface, p.xy) * blend.z;
      }`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #ifdef USE_MAP
        diffuseColor *= coastalSample(map, vCoastalPosition * 1.15);
      #endif`,
    );
    const bump = THREE.ShaderChunk.bumpmap_pars_fragment;
    const start = bump.indexOf("vec2 dHdxy_fwd()");
    const end = bump.indexOf("vec3 perturbNormalArb", start);
    const blendedBump =
      bump.slice(0, start) +
      `vec2 dHdxy_fwd() {
      vec3 p = vCoastalPosition * 1.15;
      float h = bumpScale * coastalSample(bumpMap, p).x;
      return vec2(bumpScale * coastalSample(bumpMap, p + dFdx(p)).x - h,
        bumpScale * coastalSample(bumpMap, p + dFdy(p)).x - h);
    }\n` +
      bump.slice(end);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <bumpmap_pars_fragment>",
      blendedBump,
    );
  };
  material.customProgramCacheKey = () => "coastal-world-projection-v1";
  material.needsUpdate = true;
}
