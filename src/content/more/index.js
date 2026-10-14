/* v8: the processes added in phase 4, one file per group of divisions. Each item names its division
   and work area; meridian.js, expeditions.js and areas.js merge them in on load. */
import {MORE as missionBuildings} from './mission-buildings.js';
import {MORE as buildingsPeople} from './buildings-people.js';
import {MORE as peopleSystem} from './people-system.js';
import {MORE as institution} from './institution.js';

export const MORE_ALL = [...missionBuildings, ...buildingsPeople, ...peopleSystem, ...institution];
