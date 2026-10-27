// js/core/audio.js
// Central audio registry + tiny playback helper.
//
// SINGLE SOURCE OF TRUTH for every sound in the game. Each entry maps a logical
// key -> { path, type, volume?, loop? }:
//   • type 'music' — looping background track (one plays at a time per channel).
//   • type 'sfx'   — one-shot effect (interaction blips, hits, etc.).
//
// To add a sound: drop the file in assets/sounds/ and add an entry below. Scenes
// preload via `loadAudio(scene)` and play via the AudioManager attached to each
// scene (see attachAudio). Missing files degrade gracefully — playback is a
// no-op if the key never loaded.

export const SOUNDS = {
  // ── Music (looping soundtracks) ──────────────────────────────────────────
  'world-theme':  { path: 'assets/sounds/zionick.mp3', type: 'music', volume: 0.5, loop: true },
  // The Alcatraz (map `music`): "Disco Party" by Aurec, Pixabay (free licence). ~121.35 BPM.
  // The dream (chapter 9), the user's tracks: the dream house, the maze, and
  // the shadow closing in (played each time it gets near; .m4a from the user's .wav).
  'dream-house-theme': { path: 'assets/sounds/dream_house.mp3', type: 'music', volume: 0.6, loop: true },
  'dream-theme': { path: 'assets/sounds/dream_maze.mp3', type: 'music', volume: 0.6, loop: true },
  'shadow-near': { path: 'assets/sounds/shadow_near.m4a', type: 'sfx', volume: 0.9 },
  'jumpscare': { path: 'assets/sounds/jumpscare.m4a', type: 'sfx', volume: 1 }, // the user's scream, when the shadow catches you
  'alcatraz-theme': { path: 'assets/sounds/alcatraz.mp3', type: 'music', volume: 0.55, loop: true },
  // 'battle-theme': { path: 'assets/sounds/battle.mp3', type: 'music', volume: 0.5, loop: true },

  // ── SFX (one-shots) ──────────────────────────────────────────────────────
  // 'npc-talk': { path: 'assets/sounds/talk.mp3', type: 'sfx', volume: 0.7 },
};

// Default music track per scene key. Scenes call playSceneMusic() and the right
// track starts; add a scene here when it gets its own soundtrack.
export const SCENE_MUSIC = {
  WorldScene:  'world-theme',
  // BattleScene: 'battle-theme',
};

// Queue every declared sound onto a scene's loader. Cached globally by Phaser,
// so calling this in multiple scenes' preload() is a one-time cost per key.
export function loadAudio(scene) {
  for (const [key, def] of Object.entries(SOUNDS)) {
    if (!scene.cache.audio.exists(key)) scene.load.audio(key, def.path);
  }
}

// Per-scene audio controller. One music channel + fire-and-forget SFX.
class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.music = null;     // currently-playing music Sound (or null)
    this.musicKey = null;  // its logical key
  }

  // Start (or switch to) a looping music track. No-op if it's already playing
  // or the key never loaded. Survives scene restarts (e.g. map warps): if a
  // sound with this key is already playing on the global sound manager, adopt
  // it instead of restarting the track from the top.
  playMusic(key) {
    if (!key || this.musicKey === key) return;
    const def = SOUNDS[key];
    if (!def || !this.scene.cache.audio.exists(key)) return;

    const existing = this.scene.sound.get(key);
    if (existing && existing.isPlaying) {
      this.music = existing;
      this.musicKey = key;
      return;
    }

    this.stopMusic();
    // Another map's track may still be playing (each restart has a new
    // manager): stop every other music track first.
    for (const [k, d] of Object.entries(SOUNDS)) {
      if (k !== key && d.type === 'music') this.scene.sound.get(k)?.stop();
    }
    this.music = this.scene.sound.add(key, {
      loop: def.loop ?? true,
      volume: def.volume ?? 0.5,
    });
    this.musicKey = key;
    this.music.play();
  }

  // Play this scene's default soundtrack (from SCENE_MUSIC), if any.
  playSceneMusic() {
    this.playMusic(SCENE_MUSIC[this.scene.scene.key]);
  }

  // Stop every music track (a map whose own track is missing: the dream).
  silence() {
    this.stopMusic();
    for (const [k, d] of Object.entries(SOUNDS)) {
      if (d.type === 'music') this.scene.sound.get(k)?.stop();
    }
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
      this.musicKey = null;
    }
  }

  // Fire a one-shot effect. No-op if the key never loaded.
  playSfx(key) {
    const def = SOUNDS[key];
    if (!def || !this.scene.cache.audio.exists(key)) return;
    this.scene.sound.play(key, { volume: def.volume ?? 1 });
  }
}

// Attach an AudioManager to a scene as `scene.audio`. NOTE: we deliberately do
// NOT stop music on 'shutdown' — WorldScene restarts itself on every map warp,
// and stopping there would cut the soundtrack each time. Because playMusic()
// adopts an already-playing global instance, the track plays continuously
// across warps. Scenes that own a temporary track (e.g. a battle theme) should
// call `scene.audio.stopMusic()` explicitly when they end.
export function attachAudio(scene) {
  const audio = new AudioManager(scene);
  scene.audio = audio;
  return audio;
}
