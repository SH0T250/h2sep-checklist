# Critic checklist: which panel is the render?

You are looking at one composite with two panels, A and B. One is a phone
photograph of room 110 (King Studio, Home2 Suites, Eagle Pass), the other is a
render of the same view. Answer: which panel is the render, how confident you
are (instantly, confident, leaning, guessing, cannot tell), what gave it away,
the single biggest gap in your own words, the secondary gaps, a realism score
from 1 to 10 for the render, and whether the render made you say "wow".

Do not assume the render is the worse picture. Do not assume the sharper,
cleaner or more colorful one is the photograph. Judge each check on both
panels before you decide. These checks come from every round so far
(research/king-studio/critic-log.md).

## Light transport

- Look for bounced color: a white wall next to a wood cabinet should pick up
  a little warmth. Does either panel have surfaces lit from the wrong side?
- Find every corner where two surfaces meet. A photograph darkens into the
  crease. A render with flat fill stays the same brightness right into it.
- Look under the bed, the sofa, the nightstands and the vanity. Is there a
  shadow pool that darkens toward contact, or a hard seam, or nothing?
- Follow a lamp's light onto the wall. Does it fall off like an inverse
  square wash that dies before it meets the next lamp's wash, or is it a
  uniform bright disc or a uniform wall?
- Is the light in a windowless bathroom coming from the fixtures in it, or is
  there a wash with no source?
- Are the darks really dark? Note the deepest shadow in each panel.

## Highlights and sources

- What is clipped to white? A phone clips the light source (the lens of a
  recessed can, the bulb through a shade, the window) and the sensor bloom
  around it. It does not clip a lamp shade or a wall.
- Does each lamp shade show an internal gradient (brighter where the bulb is,
  falling off toward the rim) or is it one flat tone?
- Does the window read cyan or blue against 3000 K lamps (auto white balance
  for tungsten pushes daylight cold)? A warm or neutral window is a tell.
- Do the ceiling fixtures exist as objects with a trim ring and a lens, or as
  a bright patch on the ceiling?

## Soft goods

- Mattress: does each tufting button pull a shallow crater with the ticking
  wrinkling between them, or is the pattern painted on a rigid box?
- Curtain: are the pleats identical in width and spacing? Is there a weighted
  hem, or does it end in a straight line?
- Sofa and cushions: any sag, crown or drape at the edges, or beveled boxes?
- Bedding, towels, anything fabric: is there a pile or weave at close range?

## Material identity

- Wood: grain that runs the right way on each face, with sheen that changes
  with the angle to the light. Flat uniform wood with no grain is a tell.
- Metal (faucet, pulls, grab bar, microwave, fridge): does it reflect the
  room, with bright and dark bands, or is it a gray or white blob? Stainless
  that reads white is a tell.
- Glass (shower enclosure, window, framed print): does it transmit and also
  layer a reflection? Invisible glass is a tell, as is glass with no doubled
  edge where two panes overlap.
- Tile and grout: grout lines with a little depth and slight tile to tile
  variation, or a perfect repeating grid?
- Carpet: pile, a pattern that breaks at the seams, dust and scuffs, or a
  smooth repeating texture?
- Wallpaper, solid surface, quartz: any detail at all at close range?

## Sensor and lens signature

- Noise: shadows in a phone photograph carry luminance grain that rises as it
  gets darker. Clean shadows are a tell. Uniform grain laid over everything
  including the highlights is also a tell.
- Vignette: are the corners a little darker than the center?
- Lens: an ultrawide phone camera stretches objects near the frame edges and
  the corners; straight lines near the edge bow slightly after correction.
- Chromatic aberration: a faint color fringe on high contrast edges toward
  the corners.
- Depth of field: at f/1.9 very close objects go a little soft; everything at
  room distance is sharp. A render with everything equally sharp or with a
  cinematic blur is a tell.
- Highlight rolloff: does the brightest area go to white gradually, with
  bloom, or stop hard?
- Compression: both panels are JPEG. Do not use block structure, chroma
  softness or sharpness alone; they have been equalized.

## Camera and framing

- Is the camera where a person stood: about eye or chest height, a plausible
  distance from the wall behind, not inside furniture, not floating?
- Does the field of view look like the phone's ultrawide (about 105 degrees
  horizontal, so the near objects loom and the far wall is small), or a
  narrower modeling viewport orbit?
- Is anything perfectly aligned: walls exactly vertical, horizon exactly
  level, the bed exactly centered? A person holding a phone tilts and drifts.
- Are objects placed with construction site life: a mop, a label, a scuff, a
  cord, a receptacle cover, tape on a floor, or is everything catalog clean?

## Mirrors and reflections

- Does the mirror show the room it is in, with the correct parallax and the
  same lighting? A gradient, a blur, a telephoto crop or the wrong wall is a
  tell.
- Is the shower glass doubled: tile seen twice, a streak of the fixture across
  two panes?
- Does the TV screen reflect the room (and possibly the photographer)?

## Geometry and edges

- Edge aliasing: a pixel ladder on a diagonal edge is a tell. So is an edge
  that is too smooth and too clean against a busy background.
- Texture repetition: find one distinct mark in a texture and look for its
  twin. Repeating tiles in carpet, wallpaper or wood are a tell.
- Object edges: do rounded edges catch a highlight (every real corner is
  slightly rounded), or are they mathematically sharp?
- Scale: does every object read as the right size against the door, the
  outlet and the bed?

## Color

- Compare overall saturation. Earlier renders were far grayer than the
  photograph on the herringbone wall and the carpet.
- Is the white balance consistent across the frame the way one phone frame
  is, with the lamps warm and the window cold?
- Are the darkest tones slightly colored (a phone's shadows are never a
  neutral black) or dead gray?

## Before you answer

- Name the single feature that decided it for you, and the panel it is in.
- If you could not decide, say so. A wrong pick and an honest "cannot tell"
  both count as the render passing; a lucky guess helps nobody.
- Say what would be the first thing to fix in the render, in one sentence.
