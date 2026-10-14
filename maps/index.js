// maps/index.js
// Central registry of every map. Add a new area here after creating its
// folder + module under maps/<name>/.

import entrance from './entrance/entrance.js';
import baseFloor from './base-floor/base-floor.js';
import baseKitchen from './base-kitchen/base-kitchen.js';
import firstFloor from './first-floor/first-floor.js';
import firstFloorKitchen from './first-floor-kitchen/first-floor-kitchen.js';
import firstFloorBathroom from './first-floor-bathroom/first-floor-bathroom.js';
import laundryRoom from './laundry-room/laundry-room.js';
import trashbinRoom from './trashbin-room/trashbin-room.js';

import { expandMapProps } from '../js/core/furniture.js';

// Base-floor rooms (empty for now), one module each.
import bRoom1 from './base-floor-rooms/room-1/room-1.js';
import bRoom2 from './base-floor-rooms/room-2/room-2.js';
import bRoom3 from './base-floor-rooms/room-3/room-3.js';
import bRoom4 from './base-floor-rooms/room-4/room-4.js';
import bRoom5 from './base-floor-rooms/room-5/room-5.js';
import bRoom6 from './base-floor-rooms/room-6/room-6.js';
import bRoom7 from './base-floor-rooms/room-7/room-7.js';
import bRoom8 from './base-floor-rooms/room-8/room-8.js';
import bRoom9 from './base-floor-rooms/room-9/room-9.js';
import bRoom10 from './base-floor-rooms/room-10/room-10.js';
import bRoom11 from './base-floor-rooms/room-11/room-11.js';
import bRoom12 from './base-floor-rooms/room-12/room-12.js';

// First-floor rooms (empty for now), one module each.
import room13 from './first-floor-rooms/room-13/room-13.js';
import room14 from './first-floor-rooms/room-14/room-14.js';
import room15 from './first-floor-rooms/room-15/room-15.js';
import room16 from './first-floor-rooms/room-16/room-16.js';
import room17 from './first-floor-rooms/room-17/room-17.js';
import room18 from './first-floor-rooms/room-18/room-18.js';
import room19 from './first-floor-rooms/room-19/room-19.js';
import room20 from './first-floor-rooms/room-20/room-20.js';
import room21 from './first-floor-rooms/room-21/room-21.js';
import room22 from './first-floor-rooms/room-22/room-22.js';
import room23 from './first-floor-rooms/room-23/room-23.js';
import room24 from './first-floor-rooms/room-24/room-24.js';
import room25 from './first-floor-rooms/room-25/room-25.js';
import room26 from './first-floor-rooms/room-26/room-26.js';
import room27 from './first-floor-rooms/room-27/room-27.js';

export const MAPS = {
  entrance,
  'base-floor': baseFloor,
  'base-kitchen': baseKitchen,
  'first-floor': firstFloor,
  'first-floor-kitchen': firstFloorKitchen,
  'first-floor-bathroom': firstFloorBathroom,
  'laundry-room': laundryRoom,
  'trashbin-room': trashbinRoom,
  'room-1': bRoom1, 'room-2': bRoom2, 'room-3': bRoom3, 'room-4': bRoom4,
  'room-5': bRoom5, 'room-6': bRoom6, 'room-7': bRoom7, 'room-8': bRoom8,
  'room-9': bRoom9, 'room-10': bRoom10, 'room-11': bRoom11, 'room-12': bRoom12,
  'room-13': room13, 'room-14': room14, 'room-15': room15, 'room-16': room16,
  'room-17': room17, 'room-18': room18, 'room-19': room19, 'room-20': room20,
  'room-21': room21, 'room-22': room22, 'room-23': room23, 'room-24': room24,
  'room-25': room25, 'room-26': room26, 'room-27': room27,
};

// Orientable furniture ({ furniture, dir, tx, ty } entries) → normal props with
// absolute colliders/seats, once, before anyone reads the maps (js/core/furniture.js).
for (const [key, map] of Object.entries(MAPS)) expandMapProps(map, key);

// Where a new game begins: Zio Nick wakes up in his own room (room-20, first
// floor) and his two melons are gone (see STORY.md).
export const START_MAP = 'room-20';
