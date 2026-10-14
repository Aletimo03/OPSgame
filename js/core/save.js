// js/core/save.js
// Save / load the run in the browser's localStorage (one slot).
//
// What's saved: the whole questState (chapter, progress log, items) plus where
// the player stands (map + pixel position + facing; the position is kept for
// reference only: loading always starts in Zio Nick's room, see applySave). WorldScene autosaves on
// every map entry, every progress event, every few seconds and when the tab
// closes — there is no manual "save" button. TitleScene offers Continua /
// Nuova partita; the in-game Esc menu offers "Ricomincia da capo".
//
// Bump VERSION if the saved shape changes incompatibly: older saves are then
// ignored (the title screen just offers a new game).
import { questState } from '../story/questState.js';
import { CHAPTERS } from '../story/chapters.js';
import { START_MAP } from '../../maps/index.js';

const KEY = 'opsgame-save';
const VERSION = 1;

// localStorage can be missing or throw (private mode, blocked storage, Node).
function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

// Persist questState + the player's position. Returns true on success.
export function writeSave({ mapKey, x, y, facing }) {
  const s = storage();
  if (!s) return false;
  const data = {
    version: VERSION,
    savedAt: Date.now(),
    mapKey,
    x,
    y,
    facing,
    quest: questState.toJSON(),
  };
  try {
    s.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// The saved run, or null if there is none / it's unreadable / it comes from an
// incompatible version (unknown save version or a chapter that no longer exists).
export function loadSave() {
  const s = storage();
  if (!s) return null;
  try {
    const data = JSON.parse(s.getItem(KEY));
    if (!data || data.version !== VERSION || !data.quest) return null;
    if (!CHAPTERS[data.quest.activeChapter]) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

// Load a save into questState and return the WorldScene start data for it.
// Falls back to the start map if the saved map/position no longer fits (e.g.
// the map was edited or removed since the save was written).
export function applySave(data) {
  // Progress comes back; the position doesn't: whatever the save, you always
  // wake up in Zio Nick's room (START_MAP), as the story begins (user's choice).
  questState.restore(data.quest);
  return { mapKey: START_MAP, spawnName: 'default' };
}
