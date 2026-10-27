// js/story/clock.js
// In-game clock. Each chapter has a start time (`time: 'HH:MM'` in its file),
// picked so its phone messages make sense (e.g. chapter 3 at 12:30: lunch). The clock starts there when the chapter
// starts and runs at RATE game minutes per real second while you play
// (questState.clock = { chapter, min }, saved). Phone message times are
// derived from it: a chapter's messages arrive in the minutes BEFORE its start
// time; affinity messages keep the minute they arrived. Day/night comes from
// the time (nightAlpha, the HUD icon). Node-importable.
import { questState } from './questState.js';
import { CHAPTERS } from './chapters.js';

export const RATE = 1; // game minutes per real second
const DAY = 24 * 60;

export function parseTime(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  return m ? (Number(m[1]) * 60 + Number(m[2])) % DAY : null;
}

export const chapterStart = (id) => parseTime(CHAPTERS[id]?.time) ?? 9 * 60;

// Current minute of the day (resets to the chapter's start on a new chapter).
export function clockNow() {
  const ch = questState.activeChapter;
  if (!questState.clock || questState.clock.chapter !== ch) {
    questState.clock = { chapter: ch, min: chapterStart(ch) };
  }
  return questState.clock.min;
}

export function advanceClock(ms) {
  clockNow();
  questState.clock.min = (questState.clock.min + (ms / 1000) * RATE) % DAY;
}

export const fmt = (min) => {
  const m = ((Math.floor(min) % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// 0 in full daylight … NIGHT_MAX at night, with dawn (6–8) and dusk (18:30–21:30) ramps.
export const NIGHT_MAX = 0.5;
export function nightAlpha(min) {
  const h = (((min % DAY) + DAY) % DAY) / 60;
  if (h >= 8 && h < 18.5) return 0;
  if (h >= 21.5 || h < 6) return NIGHT_MAX;
  if (h < 8) return NIGHT_MAX * (1 - (h - 6) / 2);  // dawn
  return NIGHT_MAX * ((h - 18.5) / 3);              // dusk
}

export const phaseIcon = (min) => {
  const h = (((min % DAY) + DAY) % DAY) / 60;
  if (h >= 21.5 || h < 6) return '🌙';
  if (h < 8) return '🌅';
  if (h >= 18.5) return '🌆';
  return '☀️';
};
