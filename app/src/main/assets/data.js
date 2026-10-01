// Demo library: each track is a little composition rendered live by synth.js
window.LM_DEMO = [
  { id: "d1", title: "Midnight Crown", artist: "Lord Ensemble", album: "Royal Nights", bpm: 92, root: 57, scale: "minor", prog: [0, 5, 3, 4], groove: "half", pad: "triangle", lead: "triangle", density: 0.28, seed: 11, duration: 158, art: { motif: "crown", hue: 222 },
    lyrics: ["Walking under neon skies", "In the city of a thousand lies", "Chasing shadows, losing time", "I wear the crown, it's mine", "Until the dawn, until I find", "A place where I can leave it all behind"] },
  { id: "d2", title: "Golden Throne", artist: "Lord Ensemble", album: "Royal Nights", bpm: 104, root: 60, scale: "dorian", prog: [0, 3, 4, 3], groove: "four", pad: "sawtooth", lead: "square", density: 0.22, seed: 23, duration: 172, art: { motif: "throne", hue: 44 },
    lyrics: ["Gold on the steps, light on the floor", "Nobody knocks on a royal door", "Hold the line, hold it high", "Every echo is a battle cry"] },
  { id: "d3", title: "Neon Skyline", artist: "Luna Drive", album: "Afterglow", bpm: 118, root: 62, scale: "minor", prog: [0, 6, 5, 6], groove: "four", pad: "sawtooth", lead: "triangle", density: 0.34, seed: 37, duration: 166, art: { motif: "skyline", hue: 285 },
    lyrics: ["Windows burn in violet light", "We drive until the end of night", "Radio loud, the city slow", "Take the long way, take it home"] },
  { id: "d4", title: "Echoes of You", artist: "Aurelia", album: "Glass Hours", bpm: 80, root: 55, scale: "major", prog: [0, 4, 5, 3], groove: "half", pad: "sine", lead: "sine", density: 0.26, seed: 41, duration: 150, art: { motif: "moon", hue: 340 },
    lyrics: ["I hear you in the quiet room", "A melody, a faint perfume", "The walls remember what we said", "Every word still in my head"] },
  { id: "d5", title: "Cosmic Waves", artist: "Nova Bloom", album: "Orbit", bpm: 124, root: 64, scale: "phrygian", prog: [0, 1, 0, 6], groove: "four", pad: "triangle", lead: "square", density: 0.3, seed: 53, duration: 180, art: { motif: "waves", hue: 195 },
    lyrics: ["Ride the signal, past the sun", "Two hearts beating, tuned as one", "Gravity lets go of me", "Floating in the frequency"] },
  { id: "d6", title: "Golden Hour", artist: "The Analogues", album: "Afterglow", bpm: 96, root: 58, scale: "major", prog: [0, 5, 3, 4], groove: "swing", pad: "triangle", lead: "triangle", density: 0.25, seed: 67, duration: 162, art: { motif: "sun", hue: 30 },
    lyrics: ["Sun is low and so are we", "Coffee cold and feeling free", "Hold this hour, make it stay", "Golden light won't fade away"] },
  { id: "d7", title: "Faith Unshaken", artist: "Lord Ensemble", album: "Royal Nights", bpm: 86, root: 53, scale: "dorian", prog: [0, 3, 0, 4], groove: "half", pad: "sawtooth", lead: "sine", density: 0.2, seed: 79, duration: 176, art: { motif: "rays", hue: 50 },
    lyrics: ["Stand where the old walls fall", "Answer when the mountains call", "Steady hands and open eyes", "Unshaken under breaking skies"] },
  { id: "d8", title: "City Lights", artist: "Luna Drive", album: "Afterglow", bpm: 110, root: 61, scale: "minor", prog: [0, 5, 6, 4], groove: "swing", pad: "sine", lead: "square", density: 0.27, seed: 83, duration: 154, art: { motif: "road", hue: 255 },
    lyrics: ["Red lights blinking in the rain", "Your name written on the train", "Every corner, every sign", "Leads me back to you and mine"] },
];
window.LM_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [7, 6, 4, 2, 0, 0, 0, 0, 1, 1],
  Rock: [5, 4, 2, -1, -2, 0, 2, 4, 5, 5],
  Pop: [-1, 1, 3, 4, 3, 1, -1, -1, 0, 1],
  Classical: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  Vocal: [-2, -2, -1, 1, 4, 5, 4, 2, 0, -1],
  Electronic: [6, 5, 1, 0, -2, 2, 1, 3, 5, 6],
};
