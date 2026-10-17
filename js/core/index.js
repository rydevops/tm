// Public entry point for the simulation: installs every command module onto Game.
import { Game, SCHEMA, DEFAULT_SETTINGS } from './game.js';
import { installBoardCommands } from './cmd-board.js';
import { installWorldCommands } from './cmd-world.js';
import { installQuestCommands } from './cmd-quests.js';
import { installIslandCommands } from './islands.js';
import { installDropCommands } from './drops.js';
import { installMagnetCommands } from './cmd-magnet.js';
import { loadData, Data } from './data.js';
import { Board } from './board.js';
import { planMerge, previewMerge, planFromCells } from './merge.js';

installBoardCommands(Game);
installWorldCommands(Game);
installQuestCommands(Game);
installIslandCommands(Game);
installDropCommands(Game);
installMagnetCommands(Game);

export { Game, SCHEMA, DEFAULT_SETTINGS, loadData, Data, Board, planMerge, previewMerge, planFromCells };
