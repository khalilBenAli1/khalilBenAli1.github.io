import * as THREE from "three";
import { SceneResources } from "./resources";

export function createWater(resources: SceneResources) {
  const geometry = resources.own(new THREE.PlaneGeometry(22, 15, 1, 1));
  geometry.rotateX(-Math.PI / 2);
  const material = resources.own(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vUv; uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      float sea(vec2 p){return noise(p)*.5+noise(p*2.1)*.28+noise(p*4.2)*.15+noise(p*8.4)*.07;}
      void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float edge=.92+.022*sin(atan(p.y,p.x)*23.)+.012*sin(atan(p.y,p.x)*41.);
        float alpha=1.-smoothstep(edge-.025,edge,r);if(alpha<.01)discard;
        vec2 flow=vUv*vec2(42.,158.)+vec2(time*.08,time*.04);float w=sea(flow);
        vec3 col=mix(vec3(.025,.17,.19),vec3(.065,.34,.33),w);
        float glint=pow(max(0.,1.-abs(w-.55)*8.),12.);
        col+=vec3(.30,.34,.29)*glint*.65;
        float foam=pow(noise(vUv*vec2(120.,240.)),9.);col+=vec3(.24)*foam;
        gl_FragColor=vec4(col,alpha*.96);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0.2, -0.3, 0.8);
  mesh.renderOrder = -2;
  return {
    mesh,
    update: (time: number) => {
      material.uniforms.time.value = time;
    },
  };
}
