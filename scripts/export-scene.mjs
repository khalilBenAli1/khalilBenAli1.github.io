/** Offline authoring tool; never imported by the portfolio runtime. */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

if (typeof window === 'undefined') {
  const { chromium } = await import('playwright');
  const { writeFile, mkdir, readFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const { resolve } = await import('node:path');
  const { createServer } = await import('vite');
  const server = process.env.PORTFOLIO_ORIGIN ? null : await createServer({
    configFile:false,root:process.cwd(),cacheDir:'/private/tmp/portfolio-blender-proof/vite-cache',
    server:{host:'127.0.0.1',port:4199,strictPort:true},
    optimizeDeps:{noDiscovery:true,include:['three','three/addons/exporters/GLTFExporter.js','three/addons/utils/BufferGeometryUtils.js','three/addons/geometries/RoundedBoxGeometry.js']},
  });
  if(server)await server.listen();
  const origin = process.env.PORTFOLIO_ORIGIN || 'http://127.0.0.1:4199';
  const destination = resolve(process.argv[2] || '/private/tmp/portfolio-blender-proof/source-world.glb');
  await mkdir(resolve(destination, '..'), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.on('response', response => {if(response.status()>=400)console.error(response.status(),response.url());});
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
    // Use a lightweight document on the same Vite origin; no live renderer or HMR page.
    await page.route(`${origin}/__offline-export`, route => route.fulfill({ contentType:'text/html', body:'<!doctype html><title>Offline scene export</title>' }));
    await page.goto(`${origin}/__offline-export`);
    const result = await page.evaluate(async () => {
      const { exportAuthoredWorld } = await import('/scripts/export-scene.mjs');
      return exportAuthoredWorld();
    });
    result.metadata.sourceHashes = {};
    for (const file of ['world.ts','architecture.ts','construction.ts','landscape.ts','materials.ts','camera.ts']) {
      const path = `src/scripts/island/scene/${file}`;
      result.metadata.sourceHashes[path] = createHash('sha256').update(await readFile(resolve(path))).digest('hex');
    }
    await writeFile(destination, Buffer.from(result.base64, 'base64'));
    await writeFile(destination.replace(/\.glb$/, '.json'), JSON.stringify(result.metadata, null, 2));
    console.log(JSON.stringify({ destination, bytes: Buffer.byteLength(result.base64, 'base64'), ...result.metadata }));
  } finally { await browser.close(); await server?.close(); }
}

export async function exportAuthoredWorld() {
  const [{ createWorld }, { SceneResources }, { IslandCamera }] = await Promise.all([
    import('../src/scripts/island/scene/world.ts'),
    import('../src/scripts/island/scene/resources.ts'),
    import('../src/scripts/island/scene/camera.ts'),
  ]);
  const resources = new SceneResources();
  const screens = [
    {src:'/island/screens/maison-sol.webp',label:'Maison Sol',sector:'hospitality'},
    {src:'/island/screens/veyli-colour.webp',label:'Veyli Colour',sector:'beauty'},
    {src:'/island/screens/erdenvaux.webp',label:'Erden Vaux',sector:'luxury'},
  ];
  let arrived = 0;
  const world = createWorld(resources, 'high', screens, () => arrived++, false);
  // Select the authored group explicitly; runtime exhibits and child ordering
  // must not change which geometry is eligible for the static-lighting bake.
  const architecture = world.root.children.find(child => child.userData.bakeRole === 'architecture');
  if (!architecture) {
    resources.dispose();
    throw new Error('The authored architecture group is not tagged for export');
  }
  architecture.traverse(object => { object.userData.bakeRole = 'architecture'; });
  for (const child of [...world.root.children]) {
    if (child === architecture) continue;
    if (child.userData.bakeRole === 'exhibit' || child.userData.skipOfflineExport) {
      child.removeFromParent();
      continue;
    }
    child.traverse(object => {
      object.userData.bakeRole = object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial ? 'water' : 'vegetation';
    });
  }
  const camera = new IslandCamera(world.anchors);
  camera.resize(1248, 864);
  camera.setDestination('home', true, 0);
  const cameraTarget = camera.camera.position.clone().addScaledVector(camera.camera.getWorldDirection(new THREE.Vector3()), 28);
  const cameraMetadata = {position:camera.camera.position.toArray(),target:cameraTarget.toArray(),orthographicWidth:camera.camera.right-camera.camera.left,viewport:[1248,864]};
  const textures = new Set();
  const screenTextures = new Set();
  world.root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      if (material instanceof THREE.MeshBasicMaterial && material.map?.image?.width === 768 && material.map.image.height === 760) screenTextures.add(material.map);
    }
  });
  const complete = () => [...textures].every(texture => texture.image && (texture.image.width || texture.image.naturalWidth)) && [...screenTextures].every(texture => texture.version > 1);
  const deadline = performance.now()+20000;
  while(!complete() && performance.now()<deadline) await new Promise(r=>setTimeout(r,100));
  if(!complete() || screenTextures.size !== 3) throw new Error(`Incomplete texture export: ${arrived} assets, ${screenTextures.size} screens`);
  const scene = new THREE.Scene();scene.add(world.root);
  world.root.updateMatrixWorld(true);
  let meshCount=0,instanceCount=0,triangles=0;
  const sourceMaterialIds=new Map();
  const replacements=[];
  world.root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    if(object.userData.skipOfflineExport || object.material instanceof THREE.ShaderMaterial){replacements.push([object,null]);return;}
    meshCount++;
    object.userData.bakeSourceObjectId=`authored-mesh-${meshCount}`;
    const originalMaterials=Array.isArray(object.material)?object.material:[object.material];
    object.userData.bakeSourceMaterialIds=originalMaterials.map(material=>{if(!sourceMaterialIds.has(material))sourceMaterialIds.set(material,`material-${sourceMaterialIds.size}`);const id=sourceMaterialIds.get(material);material.userData.bakeSourceId=id;return id;});
    if(object instanceof THREE.InstancedMesh){
      // Bake instance transforms and colours, keeping one mesh/material per botanical batch.
      const parts=[];const matrix=new THREE.Matrix4();const color=new THREE.Color();
      for(let i=0;i<object.count;i++){
        object.getMatrixAt(i,matrix);object.getColorAt(i,color);
        const part=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
        part.applyMatrix4(matrix);
        const vertexCount=part.getAttribute('position').count;
        const colors=new Float32Array(vertexCount*3);
        for(let j=0;j<vertexCount;j++){colors[j*3]=color.r;colors[j*3+1]=color.g;colors[j*3+2]=color.b;}
        part.setAttribute('color',new THREE.BufferAttribute(colors,3));
        parts.push(part);
      }
      const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());
      const material=object.material.clone();material.vertexColors=true;
      const replacement=new THREE.Mesh(geometry,material);replacement.name=object.name;
      replacement.position.copy(object.position);replacement.quaternion.copy(object.quaternion);replacement.scale.copy(object.scale);
      replacement.userData={...object.userData};replacements.push([object,replacement]);instanceCount+=object.count;
    }
    triangles+=(object.geometry.index?.count??object.geometry.getAttribute('position').count)/3*(object.count??1);
  });
  for(const [old,replacement] of replacements){if(replacement)old.parent.add(replacement);old.removeFromParent();}
  const buffer=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true,maxTextureSize:1024,includeCustomExtensions:false});
  const blob=new Blob([buffer]);
  const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
  resources.dispose();
  return {base64,metadata:{generator:'Authored Three.js world → offline GLB export',meshCount,instanceCount,triangles,water:'Shader surface omitted; reconstruct physically in Blender.',coordinates:'glTF Y up',camera:cameraMetadata,assetsLoaded:arrived}};
}
