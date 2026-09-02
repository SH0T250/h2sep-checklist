"""Cycles materials for every exported material key.

Every three.js material in scene.json becomes a Principled BSDF:
  base colour   the exported map texture where one exists, multiplied by the
                material colour; otherwise the colour alone (sRGB hex read as a
                display colour, see units.hex_to_linear)
  roughness     the exported value, or the exported roughnessMap
  metallic      the exported metalness
  bump          bumpMap into a Bump node; the exhibit's bumpScale is in feet,
                so it becomes the Bump node's Distance in metres
  emissive      emissive colour times emissiveMap into the Principled emission
  transmission  the window and shower glass become real glass (a Principled with
                Transmission Weight 1), with shadow rays passed straight through
                so the daylight does not have to be found by caustic paths
  mirrors       the exhibit's planar reflection ShaderMaterials become a
                Principled with metallic 1, roughness 0: a real mirror in a path
                tracer
  emitters      MeshBasicMaterials that are light sources in the exhibit (globe,
                ledStrip, canLens, sky card) become Emission surfaces at a
                strength that is SCALED: calibrated by eye against the
                photographs, not derived from anything on a sheet
  decals        the exhibit's ambient occlusion and contact shadow decals
                (edge, contact, canHalo) are rasteriser fakes.  A path tracer
                computes those, so they are hidden

OVERRIDES is keyed by material key.  A later agent can hand tune a material
here without touching the importer: any key of the dict below is applied after
the node tree is built.  Values that are understood:
  base_color=(r, g, b) linear, tint=(r, g, b) linear multiplied into the map,
  roughness=f, metallic=f, emission_strength=f, emission_color=(r, g, b),
  hide=True, no_shadow=True, alpha=f, bump_distance=f (metres), roughness_scale=f
"""
import os
import bpy

from . import units

# --- SCALED emission strengths for the exhibit's toneMapped:false emitters.
# The photographs blow the lamp globes, the LED batten in the wardrobe and the
# ceiling can lenses to white.  These strengths are the smallest that clip at
# the calibrated exposure; none of them is a measured radiance.
EMISSION = {
    'globe': 18.0,      # SCALED bare frosted globe on the bedside floor lamps
    'ledStrip': 25.0,   # SCALED LED batten in the wardrobe hanging bay
    'canLens': 40.0,    # SCALED recessed can lens; the spot light beneath it does the lighting
    'sky': 6.0,         # SCALED the card outside the glass: what the camera sees, not the daylight source
    'lampShade': 1.4,   # SCALED linen shade glow on the lounge lamps; the point light inside does the lighting
}

# Rasteriser fakes that a path tracer replaces with real light transport.
HIDDEN = {'canHalo', 'edge', 'contact'}

# Surfaces that must not block light: the lamp shades and globes have the
# exhibit's point light INSIDE them, and the sky card sits between the window
# and the world.  Shadow visibility off lets the source out and the sky in.
NO_SHADOW = {'globe', 'lampShade', 'sky', 'canLens'}

# The roller shade: a blackout fabric that still glows with the window behind it.
TRANSLUCENT = {'shade': 0.35}   # SCALED fraction of a Translucent BSDF mixed in

# Hand tuning, keyed by material key.
OVERRIDES = {
    # [PHOTO] every photograph shows a white painted ceiling; the exhibit's
    # 0xcdc1ac tan was a rasteriser fix for a ceiling that took too much
    # unshadowed light.  In a path tracer the ceiling is lit by bounce, and a
    # tan albedo darkens the whole room's second bounce.  SCALED white paint.
    'ceiling': {'base_color': (0.78, 0.76, 0.72)},
    # [PHOTO 20260812_141218.jpg, photo-18] the entry leg walls are a neutral
    # white, (223, 223, 214) sRGB beside the corridor door at the phone's
    # balance, while the exhibit's #e9e5dc times its paint map is a warm off
    # white of albedo (0.78, 0.75, 0.68) that rendered (131, 125, 112) in the
    # same patch.  Brought to a flat white paint's (0.85, 0.84, 0.83); the
    # extra bounce is what lights the leg's walls in the photograph.
    'paintWhite': {'tint': (1.09, 1.12, 1.22)},
    # [PHOTO 20260812_141218.jpg, photo-18] the corridor door leaf is a grey
    # brown laminate, (100, 89, 83) sRGB in the same light as the (223, 223,
    # 214) wall beside it, an albedo near (0.15, 0.12, 0.10); the exported map
    # averages (0.24, 0.20, 0.16) and rendered (130, 114, 97).
    'woodDoor': {'tint': (0.65, 0.65, 0.68)},
    # [PHOTO 20260812_141209.jpg, photo-03] the kitchenette laminate is a grey
    # driftwood, (94, 89, 85) sRGB on the upper box face in the same light as
    # the (160, 157, 145) wall above the counter, so its albedo is about
    # (0.27, 0.24, 0.22); the exported map averages (0.31, 0.26, 0.20).
    'woodGrey': {'tint': (0.86, 0.92, 1.06)},
}

_IMAGE_CACHE = {}


def _load_image(tex_dir, file, srgb):
    path = os.path.join(tex_dir, file)
    key = (path, srgb)
    if key in _IMAGE_CACHE:
        return _IMAGE_CACHE[key]
    img = bpy.data.images.load(path, check_existing=False)
    img.name = ('srgb.' if srgb else 'data.') + file
    img.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    _IMAGE_CACHE[key] = img
    return img


def _wrap(chan):
    """Blender image extension from the exported wrap mode."""
    if not chan:
        return 'REPEAT'
    if chan.get('wrapS') == 'clamp':
        return 'EXTEND'
    if chan.get('wrapS') == 'mirror':
        return 'MIRROR'
    return 'REPEAT'


def _tex_node(nodes, links, tex_dir, chan, srgb, x, y):
    n = nodes.new('ShaderNodeTexImage')
    n.image = _load_image(tex_dir, chan['file'], srgb)
    n.extension = _wrap(chan)
    n.interpolation = 'Linear'
    n.location = (x, y)
    return n


def _rgb(v):
    return (v[0], v[1], v[2], 1.0)


def build_material(rec, tex_dir):
    """Build and return a bpy material for one exported record."""
    key = rec['key']
    mat = bpy.data.materials.new(key)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial')
    out.location = (600, 0)

    color = units.hex_to_linear(rec.get('color'), (1.0, 1.0, 1.0))
    rough = rec.get('roughness')
    metal = rec.get('metalness') or 0.0
    t = rec.get('type', '')

    # --- mirrors: a real mirror
    if rec.get('isMirror') or key in ('mirror', 'mirrorGlass'):
        if rec.get('mirrorGlass') or key == 'mirrorGlass':
            return _glass_material(mat, nodes, links, out, units.hex_to_linear(rec.get('mirrorTint'), (0.96, 0.98, 0.98)), 0.0, shadow_pass=True)
        p = nodes.new('ShaderNodeBsdfPrincipled')
        p.location = (300, 0)
        p.inputs['Base Color'].default_value = _rgb(units.hex_to_linear(rec.get('mirrorTint'), (0.95, 0.96, 0.95)))
        p.inputs['Metallic'].default_value = 1.0
        p.inputs['Roughness'].default_value = 0.0
        links.new(p.outputs['BSDF'], out.inputs['Surface'])
        return mat

    # --- pure emitters (MeshBasicMaterial with toneMapped false in the exhibit)
    if key in EMISSION and t == 'MeshBasicMaterial':
        e = nodes.new('ShaderNodeEmission')
        e.location = (300, 0)
        e.inputs['Strength'].default_value = EMISSION[key]
        if rec.get('map'):
            tx = _tex_node(nodes, links, tex_dir, rec['map'], True, -200, 0)
            links.new(tx.outputs['Color'], e.inputs['Color'])
        else:
            e.inputs['Color'].default_value = _rgb(color)
        links.new(e.outputs['Emission'], out.inputs['Surface'])
        return mat

    # --- glass: the window pane and any transmissive material
    if key in ('glass', 'showerGlass') or (rec.get('transmission') or 0) > 0.5:
        return _glass_material(mat, nodes, links, out, color, rough or 0.03, shadow_pass=True)

    # --- everything else: Principled
    p = nodes.new('ShaderNodeBsdfPrincipled')
    p.location = (300, 0)
    p.inputs['Metallic'].default_value = float(metal)
    p.inputs['Roughness'].default_value = float(rough if rough is not None else 0.5)

    # base colour
    if rec.get('map'):
        tx = _tex_node(nodes, links, tex_dir, rec['map'], rec['map'].get('srgb', True), -400, 200)
        if tuple(round(c, 3) for c in color) != (1.0, 1.0, 1.0):
            mix = nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            mix.location = (-100, 200)
            links.new(tx.outputs['Color'], mix.inputs[6])
            mix.inputs[7].default_value = _rgb(color)
            links.new(mix.outputs[2], p.inputs['Base Color'])
        else:
            links.new(tx.outputs['Color'], p.inputs['Base Color'])
    else:
        p.inputs['Base Color'].default_value = _rgb(color)

    # roughness map (the brushed stainless streaks)
    if rec.get('roughnessMap'):
        rm = _tex_node(nodes, links, tex_dir, rec['roughnessMap'], False, -400, -100)
        # three.js multiplies the map by the roughness value
        mul = nodes.new('ShaderNodeMath')
        mul.operation = 'MULTIPLY'
        mul.location = (-100, -100)
        links.new(rm.outputs['Color'], mul.inputs[0])
        mul.inputs[1].default_value = float(rough if rough is not None else 1.0)
        links.new(mul.outputs['Value'], p.inputs['Roughness'])

    # bump
    if rec.get('bumpMap') and rec.get('bumpScale'):
        bm = _tex_node(nodes, links, tex_dir, rec['bumpMap'], False, -400, -400)
        bump = nodes.new('ShaderNodeBump')
        bump.location = (0, -400)
        bump.inputs['Strength'].default_value = 1.0
        # bumpScale is in feet in the exhibit; Distance is metres here
        bump.inputs['Distance'].default_value = float(rec['bumpScale']) * units.FT
        links.new(bm.outputs['Color'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], p.inputs['Normal'])

    # emissive (the lamp shades, the reading light housings)
    em = rec.get('emissive')
    em_lin = units.hex_to_linear(em, (0.0, 0.0, 0.0)) if em else (0.0, 0.0, 0.0)
    if max(em_lin) > 0.001:
        strength = EMISSION.get(key, float(rec.get('emissiveIntensity') or 1.0))
        if rec.get('emissiveMap'):
            et = _tex_node(nodes, links, tex_dir, rec['emissiveMap'], True, -400, 500)
            mix = nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            mix.location = (-100, 500)
            links.new(et.outputs['Color'], mix.inputs[6])
            mix.inputs[7].default_value = _rgb(em_lin)
            links.new(mix.outputs[2], p.inputs['Emission Color'])
        else:
            p.inputs['Emission Color'].default_value = _rgb(em_lin)
        p.inputs['Emission Strength'].default_value = strength

    shader_out = p.outputs['BSDF']

    # translucent fabric (the roller shade)
    if key in TRANSLUCENT:
        tr = nodes.new('ShaderNodeBsdfTranslucent')
        tr.location = (300, -300)
        if rec.get('map'):
            links.new(tx.outputs['Color'], tr.inputs['Color'])
        mixs = nodes.new('ShaderNodeMixShader')
        mixs.location = (450, -100)
        mixs.inputs['Fac'].default_value = TRANSLUCENT[key]
        links.new(shader_out, mixs.inputs[1])
        links.new(tr.outputs['BSDF'], mixs.inputs[2])
        shader_out = mixs.outputs['Shader']

    # partial opacity that is not glass (a microwave window, the exhibit's tints)
    if rec.get('transparent') and (rec.get('opacity') or 1.0) < 0.999 and key not in EMISSION:
        tp = nodes.new('ShaderNodeBsdfTransparent')
        tp.location = (300, -500)
        mixs = nodes.new('ShaderNodeMixShader')
        mixs.location = (480, -250)
        mixs.inputs['Fac'].default_value = float(rec.get('opacity') or 1.0)
        links.new(tp.outputs['BSDF'], mixs.inputs[1])
        links.new(shader_out, mixs.inputs[2])
        shader_out = mixs.outputs['Shader']

    links.new(shader_out, out.inputs['Surface'])
    return mat


def _glass_material(mat, nodes, links, out, color, rough, shadow_pass=True):
    """A Principled glass that shadow rays pass through.

    Caustic paths through a pane are the noisiest thing in an interior render.
    Mixing in a Transparent BSDF on shadow rays lets the daylight reach the
    room directly; what the camera sees is still refracting, reflecting glass.
    """
    p = nodes.new('ShaderNodeBsdfPrincipled')
    p.location = (200, 100)
    p.inputs['Base Color'].default_value = _rgb(color)
    p.inputs['Roughness'].default_value = float(rough)
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['IOR'].default_value = 1.5
    if not shadow_pass:
        links.new(p.outputs['BSDF'], out.inputs['Surface'])
        return mat
    tp = nodes.new('ShaderNodeBsdfTransparent')
    tp.location = (200, -150)
    lp = nodes.new('ShaderNodeLightPath')
    lp.location = (200, 400)
    mixs = nodes.new('ShaderNodeMixShader')
    mixs.location = (450, 0)
    links.new(lp.outputs['Is Shadow Ray'], mixs.inputs['Fac'])
    links.new(p.outputs['BSDF'], mixs.inputs[1])
    links.new(tp.outputs['BSDF'], mixs.inputs[2])
    links.new(mixs.outputs['Shader'], out.inputs['Surface'])
    return mat


def apply_override(mat, ov):
    """Apply one OVERRIDES entry to a built material."""
    nt = mat.node_tree
    p = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    e = next((n for n in nt.nodes if n.type == 'EMISSION'), None)
    if 'base_color' in ov and p:
        for l in list(p.inputs['Base Color'].links):
            nt.links.remove(l)
        p.inputs['Base Color'].default_value = _rgb(ov['base_color'])
    if 'tint' in ov and p:
        src = p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].links else None
        if src is not None:
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            mix.location = (100, 300)
            nt.links.remove(p.inputs['Base Color'].links[0])
            nt.links.new(src, mix.inputs[6])
            mix.inputs[7].default_value = _rgb(ov['tint'])
            nt.links.new(mix.outputs[2], p.inputs['Base Color'])
        else:
            c = p.inputs['Base Color'].default_value
            p.inputs['Base Color'].default_value = _rgb((c[0] * ov['tint'][0], c[1] * ov['tint'][1], c[2] * ov['tint'][2]))
    if 'roughness' in ov and p:
        for l in list(p.inputs['Roughness'].links):
            nt.links.remove(l)
        p.inputs['Roughness'].default_value = float(ov['roughness'])
    if 'roughness_scale' in ov and p and not p.inputs['Roughness'].links:
        p.inputs['Roughness'].default_value *= float(ov['roughness_scale'])
    if 'metallic' in ov and p:
        p.inputs['Metallic'].default_value = float(ov['metallic'])
    if 'alpha' in ov and p:
        p.inputs['Alpha'].default_value = float(ov['alpha'])
    if 'bump_distance' in ov:
        for n in nt.nodes:
            if n.type == 'BUMP':
                n.inputs['Distance'].default_value = float(ov['bump_distance'])
    if 'emission_strength' in ov:
        if e:
            e.inputs['Strength'].default_value = float(ov['emission_strength'])
        elif p:
            p.inputs['Emission Strength'].default_value = float(ov['emission_strength'])
    if 'emission_color' in ov:
        if e:
            e.inputs['Color'].default_value = _rgb(ov['emission_color'])
        elif p:
            p.inputs['Emission Color'].default_value = _rgb(ov['emission_color'])


def build_materials(scene_json, tex_dir):
    """Build every material in scene.json.  Returns {key: material}."""
    _IMAGE_CACHE.clear()
    mats = {}
    for key, rec in scene_json['materials'].items():
        mat = build_material(rec, tex_dir)
        if key in OVERRIDES:
            apply_override(mat, OVERRIDES[key])
        mats[key] = mat
    return mats


def object_flags(key):
    """Per object visibility flags for a material key: (hide, no_shadow)."""
    ov = OVERRIDES.get(key, {})
    hide = key in HIDDEN or bool(ov.get('hide'))
    no_shadow = key in NO_SHADOW or bool(ov.get('no_shadow'))
    return hide, no_shadow
