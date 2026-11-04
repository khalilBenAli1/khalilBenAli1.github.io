"""Offline physical-lighting proof from the actual authored world.

Run using portable Blender, never from the browser runtime:
  Blender --background --factory-startup --python scripts/bake-scene.py -- source.glb output-dir
Use --gallery for the gallery or --architecture for all static architectural meshes.
Use --repair-only source.glb asset.glb with ordinary Python to restore literal PNGs
and runtime accent materials without another lighting bake.
"""
def repair_runtime_materials(source_path, packed_path):
    """Restore literal PNGs and runtime accent PBR without changing Draco geometry."""
    import copy
    import hashlib
    import json
    import re
    import struct

    def read_glb(path):
        raw = open(path, 'rb').read()
        json_length = struct.unpack_from('<I', raw, 12)[0]
        document = json.loads(raw[20:20 + json_length])
        binary_start = 28 + json_length
        return document, raw[binary_start:]

    source, source_binary = read_glb(source_path)
    packed, packed_binary = read_glb(packed_path)
    replacement_views = {}
    accent_materials = {}
    restored_materials = set()
    restored_images = []
    accent_meshes = []
    natural_stone_meshes = []
    cliff_meshes = []
    material_ids = {m.get('extras', {}).get('bakeSourceId'): i for i, m in enumerate(source['materials']) if m.get('extras', {}).get('bakeSourceId')}
    named_nodes = {n.get('name'): n for n in source['nodes'] if n.get('name') and 'mesh' in n}
    source_node_ids = {n.get('extras', {}).get('bakeSourceObjectId'): n for n in source['nodes'] if n.get('extras', {}).get('bakeSourceObjectId')}

    def source_primitive(node, primitive_index):
        original_node=source_node_ids.get(node.get('extras', {}).get('bakeSourceObjectId'))
        match=re.fullmatch(r'Mesh_(\d+)',node.get('name',''))
        mesh_index=original_node['mesh'] if original_node else int(match.group(1)) if match else named_nodes.get(node.get('name'),{}).get('mesh')
        if mesh_index is None or mesh_index>=len(source['meshes']):return None
        primitives=source['meshes'][mesh_index]['primitives']
        return primitives[min(primitive_index,len(primitives)-1)]

    def source_material(node, primitive_index):
        ids = node.get('extras', {}).get('bakeSourceMaterialIds', [])
        if primitive_index < len(ids) and ids[primitive_index] in material_ids:
            return material_ids[ids[primitive_index]]
        primitive=source_primitive(node,primitive_index)
        return primitive.get('material') if primitive else None

    def restore_texture(target_texture, original_texture):
        old = packed['textures'][target_texture]
        original = source['textures'][original_texture]
        image_index = old['source']
        original_image = source['images'][original['source']]
        original_view = source['bufferViews'][original_image['bufferView']]
        start = original_view.get('byteOffset', 0)
        data = source_binary[start:start + original_view['byteLength']]
        view_index = packed['images'][image_index]['bufferView']
        replacement_views[view_index] = data
        packed['images'][image_index]['mimeType'] = original_image['mimeType']
        packed['images'][image_index]['name'] = f'Literal source image {original["source"]}'
        sampler = copy.deepcopy(source.get('samplers', [{}])[original.get('sampler', 0)])
        samplers = packed.setdefault('samplers', [])
        if sampler not in samplers:
            samplers.append(sampler)
        old['sampler'] = samplers.index(sampler)
        restored_images.append({'image': image_index, 'mimeType': original_image['mimeType'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})

    def coastal_texture(original_texture):
        # Embed the original WebP so cancellation and delivery stay self-contained.
        from pathlib import Path
        script=Path(globals().get('__file__','scripts/bake-scene.py')).resolve()
        data=(script.parents[1]/'public/island/materials/coastal-limestone.webp').read_bytes()
        images=packed.setdefault('images',[])
        image=next((item for item in images if item.get('name')=='Shared coastal limestone mineral map'),None)
        if image is None:
            image={'name':'Shared coastal limestone mineral map'}
            images.append(image)
        view_index=image.get('bufferView')
        if view_index is None:
            view_index=len(packed['bufferViews'])
            packed['bufferViews'].append({'buffer':0,'byteOffset':0,'byteLength':0})
        replacement_views[view_index]=data
        image.pop('uri',None)
        image['bufferView']=view_index
        image['mimeType']='image/webp'
        original=source['textures'][original_texture]
        sampler=copy.deepcopy(source.get('samplers',[{}])[original.get('sampler',0)])
        samplers=packed.setdefault('samplers',[])
        if sampler not in samplers:samplers.append(sampler)
        texture={'sampler':samplers.index(sampler),'extensions':{'EXT_texture_webp':{'source':images.index(image)}}}
        textures=packed.setdefault('textures',[])
        if texture not in textures:textures.append(texture)
        for extension in ['EXT_texture_webp','EXT_materials_bump','KHR_texture_transform']:
            if extension not in packed.setdefault('extensionsUsed',[]):packed['extensionsUsed'].append(extension)
        if 'EXT_texture_webp' not in packed.setdefault('extensionsRequired',[]):packed['extensionsRequired'].append('EXT_texture_webp')
        return textures.index(texture)

    for node in packed['nodes']:
        if 'mesh' not in node:
            continue
        for primitive_index, primitive in enumerate(packed['meshes'][node['mesh']]['primitives']):
            original_index = source_material(node, primitive_index)
            if original_index is None:
                continue
            original = source['materials'][original_index]
            pbr = original.get('pbrMetallicRoughness', {})
            colour = pbr.get('baseColorFactor', [1, 1, 1, 1])
            original_primitive=source_primitive(node,primitive_index)
            attributes=original_primitive.get('attributes',{}) if original_primitive else {}
            bounds=source['accessors'][attributes['POSITION']] if 'POSITION' in attributes else {}
            low=bounds.get('min',[0,0,0]);high=bounds.get('max',[0,0,0])
            natural_stone=(not node.get('extras',{}).get('destination') and 'COLOR_0' not in attributes and pbr.get('roughnessFactor')==1 and pbr.get('metallicFactor')==0 and 'baseColorTexture' in pbr and low[0]<-8 and high[0]>8 and low[2]<-4 and high[2]>5 and low[1]<0 and high[1]<3)
            coastal_cliff=(not node.get('extras',{}).get('destination') and 'COLOR_0' in attributes and pbr.get('roughnessFactor')==1 and pbr.get('metallicFactor')==0 and 'baseColorTexture' in pbr and low[0]<-8 and high[0]>8 and low[2]<-4 and high[2]>5 and low[1]<0 and 5<high[1]<6)
            unlit = 'KHR_materials_unlit' in original.get('extensions', {})
            accent = 'blue' if colour[2] > .6 and colour[0] < .2 else 'citrus' if colour[0] > .8 and colour[2] < .2 else None
            if unlit:
                target_index = primitive['material']
                if target_index in restored_materials:
                    continue
                target = packed['materials'][target_index]
                restored = copy.deepcopy(original)
                restored['name'] = target.get('name', f'Literal material {original_index}')
                source_info = pbr.get('baseColorTexture')
                target_info = target.get('pbrMetallicRoughness', {}).get('baseColorTexture')
                if source_info and target_info:
                    restore_texture(target_info['index'], source_info['index'])
                    restored['pbrMetallicRoughness']['baseColorTexture']['index'] = target_info['index']
                packed['materials'][target_index] = restored
                restored_materials.add(target_index)
            elif natural_stone or coastal_cliff:
                restored=copy.deepcopy(original)
                restored['name']='Runtime coastal limestone boulders' if natural_stone else 'Runtime coastal limestone cliffs'
                texture=coastal_texture(pbr['baseColorTexture']['index'])
                # The source GLB's PNG is exactly the vertical flip of the public
                # WebP. This transform preserves the authored UV0 appearance.
                info={'index':texture,'texCoord':0,'extensions':{'KHR_texture_transform':{'offset':[0,1],'scale':[1,-1]}}}
                restored['pbrMetallicRoughness']['baseColorTexture']=copy.deepcopy(info)
                restored['extensions']['EXT_materials_bump']['bumpTexture']=copy.deepcopy(info)
                if restored not in packed['materials']:packed['materials'].append(restored)
                primitive['material']=packed['materials'].index(restored)
                node.get('extras',{}).pop('bakedSurface',None)
                node.get('extras',{}).pop('bakedLighting',None)
                node.setdefault('extras',{})['runtimeMaterialRole']='natural-stone-boulders' if natural_stone else 'coastal-limestone-cliffs'
                record={'mesh':node.get('name'),'sourceMaterial':original_index,'bounds':{'min':low,'max':high},'uv':0,'vertexColours':'COLOR_0' in primitive.get('attributes',{}),'texture':'embedded coastal-limestone.webp'}
                (natural_stone_meshes if natural_stone else cliff_meshes).append(record)
            elif accent:
                if original_index not in accent_materials:
                    restored = copy.deepcopy(original)
                    restored['name'] = f'Runtime {accent} accent'
                    if restored not in packed['materials']:
                        packed['materials'].append(restored)
                    accent_materials[original_index] = packed['materials'].index(restored)
                primitive['material'] = accent_materials[original_index]
                node.get('extras', {}).pop('bakedSurface', None)
                node.get('extras', {}).pop('bakedLighting', None)
                accent_meshes.append({'mesh': node.get('name'), 'accent': accent})

    # Repack buffer views in place; geometry/accessor/Draco indices stay unchanged.
    binary = bytearray()
    for index, view in enumerate(packed['bufferViews']):
        start = view.get('byteOffset', 0)
        data = replacement_views.get(index, packed_binary[start:start + view['byteLength']])
        while len(binary) % 4:
            binary.append(0)
        view['byteOffset'] = len(binary)
        view['byteLength'] = len(data)
        binary.extend(data)
    packed['buffers'][0]['byteLength'] = len(binary)
    while len(binary) % 4:
        binary.append(0)
    document = json.dumps(packed, separators=(',', ':'), ensure_ascii=False).encode('utf8')
    document += b' ' * ((-len(document)) % 4)
    total = 12 + 8 + len(document) + 8 + len(binary)
    result = struct.pack('<III', 0x46546c67, 2, total) + struct.pack('<II', len(document), 0x4e4f534a) + document + struct.pack('<II', len(binary), 0x004e4942) + binary
    with open(packed_path, 'wb') as handle:
        handle.write(result)
    return {'bytes': len(result), 'sha256': hashlib.sha256(result).hexdigest(), 'literalImages': restored_images, 'runtimeAccentMeshes': accent_meshes, 'runtimeNaturalStoneMeshes': natural_stone_meshes, 'runtimeCliffMeshes': cliff_meshes}

import sys
if '--repair-only' in sys.argv:
    import json
    args=sys.argv[sys.argv.index('--repair-only')+1:]
    print(json.dumps(repair_runtime_materials(args[0],args[1]),indent=2))
    raise SystemExit(0)

import bpy
import json
import math
import os
import sys
from mathutils import Vector

argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(argv)<2:
    raise SystemExit('Expected input GLB and output directory')
source=os.path.abspath(argv[0]); output=os.path.abspath(argv[1]); os.makedirs(output,exist_ok=True)
metadata_path=os.path.splitext(source)[0]+'.json'
metadata=json.load(open(metadata_path)) if os.path.exists(metadata_path) else {}
camera_info=metadata.get('camera',{})
viewport=camera_info.get('viewport',[1280,900])
width=int(os.environ.get('BAKE_RENDER_WIDTH',str(viewport[0]))); height=int(os.environ.get('BAKE_RENDER_HEIGHT',str(viewport[1])))
samples=int(os.environ.get('BAKE_SAMPLES','48'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=samples
scene.cycles.use_denoising=True
scene.cycles.max_bounces=8
scene.cycles.diffuse_bounces=4
scene.cycles.glossy_bounces=4
scene.cycles.transmission_bounces=6
scene.render.resolution_x=width;scene.render.resolution_y=height;scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=0.35
# Prefer Metal if present; CPU remains a portable fallback.
try:
    pref=bpy.context.preferences.addons['cycles'].preferences
    pref.compute_device_type='METAL';pref.get_devices()
    gpu=[d for d in pref.devices if d.type=='METAL']
    if gpu:
        for device in pref.devices: device.use=device.type=='METAL'
        scene.cycles.device='GPU'
except Exception as error:
    print('Metal unavailable; CPU fallback:',str(error))

# glTF Y-up is imported to Blender Z-up: (x, y, z) -> (x, -z, y).
def pos(x,y,z):return Vector((x,-z,y))
def aim(obj,target):obj.rotation_euler=(target-obj.location).to_track_quat('-Z','Y').to_euler()
world=bpy.data.worlds.new('Mediterranean daylight');scene.world=world;world.use_nodes=True
nodes=world.node_tree.nodes;links=world.node_tree.links
background=nodes.get('Background');background.inputs['Strength'].default_value=.32
sky=nodes.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=math.radians(32);sky.sun_rotation=math.radians(130);sky.sun_disc=False;sky.altitude=.2;sky.air_density=1.0;sky.dust_density=.6
links.new(sky.outputs['Color'],background.inputs['Color'])
def light(name,kind,location,energy,color,size=1):
    data=bpy.data.lights.new(name,kind);data.energy=energy;data.color=color
    if kind=='AREA':data.shape='DISK';data.size=size
    if kind=='SUN':data.angle=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=pos(*location);return obj
sun=light('Warm directional afternoon sun','SUN',(-8,16,10),3.0,(1,.86,.67),.06);aim(sun,pos(0,0,0))
fill=light('Broad reflected sky','AREA',(0,10,10),350,(.77,.87,1),12);aim(fill,pos(0,3,0))
# Preserve original materials; convert the existing mineral colour maps into subtle relief.
for material in bpy.data.materials:
    if not material.use_nodes:continue
    n=material.node_tree.nodes;l=material.node_tree.links
    principled=next((node for node in n if node.type=='BSDF_PRINCIPLED'),None)
    if not principled:continue
    tex=next((node for node in n if node.type=='TEX_IMAGE'),None)
    if tex and tex.image and tex.image.size[0]>=256 and material.diffuse_color[0]>.3:
        # Screens and transparent typography retain their exact supplied pixels.
        alpha=principled.inputs.get('Alpha')
        if alpha and (alpha.is_linked or alpha.default_value<.9):continue
        if material.get('gltf_pbrMetallicRoughness') is None and 'KHR_materials_unlit' in str(material):continue
        if any(node.type=='EMISSION' for node in n):continue
        bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.045
        l.new(tex.outputs['Color'],bump.inputs['Height']);l.new(bump.outputs['Normal'],principled.inputs['Normal'])
# The browser's dynamic water shader has no glTF representation; reproduce its authored footprint.
vertices=[]
for i in range(160):
    angle=i/160*math.tau
    radius=.92+.022*math.sin(angle*23)+.012*math.sin(angle*41)
    vertices.append((.2+math.cos(angle)*11*radius,-(.8+math.sin(angle)*7.5*radius),-.3))
mesh=bpy.data.meshes.new('Water footprint');mesh.from_pydata(vertices,[],[list(range(160))]);mesh.update()
water=bpy.data.objects.new('Turquoise shallow water',mesh);scene.collection.objects.link(water)
water_material=bpy.data.materials.new('Physical turquoise water');water_material.use_nodes=True
n=water_material.node_tree.nodes;l=water_material.node_tree.links;p=n.get('Principled BSDF')
p.inputs['Base Color'].default_value=(.025,.24,.25,1);p.inputs['Metallic'].default_value=.22;p.inputs['Roughness'].default_value=.13;p.inputs['IOR'].default_value=1.333
p.inputs['Transmission Weight'].default_value=.12
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=29;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.6
mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1,3.2,1)
coords=n.new('ShaderNodeTexCoord');l.new(coords.outputs['Generated'],mapping.inputs[0]);l.new(mapping.outputs['Vector'],noise.inputs['Vector'])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.32;bump.inputs['Distance'].default_value=.08;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal']);water.data.materials.append(water_material)
# Matching orthographic view, with all interactive building locations preserved.
camera_data=bpy.data.cameras.new('Portfolio orthographic camera');camera=bpy.data.objects.new('Portfolio camera',camera_data);scene.collection.objects.link(camera)
camera_data.type='ORTHO';camera_data.ortho_scale=camera_info.get('orthographicWidth',21.3)
camera.location=pos(*camera_info.get('position',[7.7,14.2,25.8]));aim(camera,pos(*camera_info.get('target',[-.35,3.65,.7])));scene.camera=camera
# Output stays separate from production assets until compared and approved by the parent.
scene.render.filepath=os.path.join(output,'physical-lighting-proof.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output,'physical-lighting-proof.blend'))
if '--no-render' not in argv:bpy.ops.render.render(write_still=True)
report={'source':source,'renderer':'Blender Cycles','samples':samples,'device':scene.cycles.device,'dimensions':[width,height],'meshes':len([o for o in scene.objects if o.type=='MESH']),'lighting':'Nishita sky, warm sun and reflected fill','not_integrated':True,'limitations':['Browser water shader reconstructed as physical material.','Current authored geometry is a snapshot and must be re-exported after geometry edits.','Transparent text/BasicMaterial rendering must be visually compared.']}
if '--gallery' in argv or '--bake' in argv or '--architecture' in argv:
    complete_architecture='--architecture' in argv
    role='architecture' if complete_architecture else 'gallery'
    atlas_size=4096 if complete_architecture else 2048
    bake_samples=int(os.environ.get('BAKE_DIFFUSE_SAMPLES','64' if complete_architecture else '32'))
    exported=[o for o in scene.objects if o.get('bakeRole')=='architecture'] if complete_architecture else [o for o in scene.objects if o.get('destination')=='work']
    gallery=[o for o in exported if o.type=='MESH']
    candidates=[]
    for obj in gallery:
        mat=obj.data.materials[0] if obj.data.materials else None
        if not mat or not mat.use_nodes:continue
        p=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        # Retain exact screen pixels, chrome reflections and emissive light sources.
        if not p or p.inputs['Metallic'].default_value>.5:continue
        if p.inputs['Alpha'].is_linked or p.inputs['Alpha'].default_value<.95:continue
        if p.inputs['Emission Strength'].default_value>0:continue
        colour=p.inputs['Base Color'].default_value
        if (colour[2]>.6 and colour[0]<.2) or (colour[0]>.8 and colour[2]<.2):continue
        obj['bakedSurface']={'roughness':p.inputs['Roughness'].default_value,'metalness':p.inputs['Metallic'].default_value,'clearcoat':p.inputs['Coat Weight'].default_value,'clearcoatRoughness':p.inputs['Coat Roughness'].default_value}
        candidates.append(obj)
    if not candidates:raise RuntimeError('No opaque architectural surfaces found')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in candidates:
        obj.select_set(True)
        old_uv=obj.data.uv_layers.active
        target_uv=obj.data.uv_layers.new(name='LightBake')
        obj.data.uv_layers.active=target_uv
        if old_uv:old_uv.active_render=True
    bpy.context.view_layer.objects.active=candidates[0]
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=.00001)
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.003 if complete_architecture else .008,area_weight=1.0,scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    image=bpy.data.images.new(f'{role.title()} physical diffuse lighting',atlas_size,atlas_size,alpha=False)
    for obj in candidates:
        for index,material in enumerate(list(obj.data.materials)):
            material=material.copy();obj.data.materials[index]=material
            node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;material.node_tree.nodes.active=node
    scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=True;scene.render.bake.use_pass_color=True
    scene.render.bake.margin=12;scene.cycles.samples=bake_samples
    bpy.ops.object.bake(type='DIFFUSE',uv_layer='LightBake')
    image.filepath_raw=os.path.join(output,f'{role}-baked-diffuse.png');image.file_format='PNG';image.save()
    baked=bpy.data.materials.new(f'{role.title()} baked diffuse — no runtime double lighting');baked.use_nodes=True
    n=baked.node_tree.nodes;n.clear();l=baked.node_tree.links
    texture=n.new('ShaderNodeTexImage');texture.image=image
    uv=n.new('ShaderNodeUVMap');uv.uv_map='LightBake';l.new(uv.outputs['UV'],texture.inputs['Vector'])
    emission=n.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1;l.new(texture.outputs['Color'],emission.inputs['Color'])
    surface=n.new('ShaderNodeOutputMaterial');l.new(emission.outputs['Emission'],surface.inputs['Surface'])
    for obj in candidates:
        obj.data.materials.clear();obj.data.materials.append(baked)
        obj.data.uv_layers['LightBake'].active_render=True
        obj['bakedLighting']=f'Cycles diffuse direct+indirect+albedo, {bake_samples} samples, {atlas_size} atlas'
    bpy.ops.object.select_all(action='DESELECT')
    for obj in exported:obj.select_set(True)
    bpy.context.view_layer.objects.active=gallery[0]
    asset=os.path.join(output,f'{role}-baked.glb')
    bpy.ops.export_scene.gltf(filepath=asset,export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_image_format='JPEG',export_jpeg_quality=int(os.environ.get('BAKE_JPEG_QUALITY','85' if complete_architecture else '88')),export_draco_mesh_compression_enable=complete_architecture,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_texcoord_quantization=14)
    preservation=repair_runtime_materials(source,asset)
    report['materialPreservation']=preservation
    report['bake']={'scope':role,'objects':[o.name for o in candidates],'meshObjects':len(gallery),'faces':sum(len(o.data.polygons) for o in gallery),'map':f'{role}-baked-diffuse.png','samples':bake_samples,'size':atlas_size,'asset':f'{role}-baked.glb','bytes':os.path.getsize(asset),'coordinates':'glTF Y-up; world placement retained, no additional runtime transform','draco':complete_architecture,'destinations':{d:sum(1 for o in gallery if o.get('destination')==d) for d in ['work','about','experience','contact']},'terrainOccluders':sum(1 for o in gallery if not o.get('destination'))}
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output,'physical-lighting-proof.blend'))
report['sourceHashes']=metadata.get('sourceHashes',{})
report['camera']=camera_info
report['renderStudyViewTransform']={'transform':scene.view_settings.view_transform,'look':scene.view_settings.look,'exposure':scene.view_settings.exposure}
if 'bake' in report:report['bake']['colorContract']='8-bit LDR sRGB baked appearance; no extra runtime tone mapping on flat or reflective diffuse bases. Reflection highlights may clip.'
with open(os.path.join(output,'physical-lighting-proof.json'),'w') as f:json.dump(report,f,indent=2)
print('PHYSICAL_LIGHTING_PROOF',json.dumps(report))
