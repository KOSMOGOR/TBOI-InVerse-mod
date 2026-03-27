import { ISCFeature, upgradeMod } from "isaacscript-common";
import { name } from "../package.json";

declare let InVerse: Mod;
InVerse = RegisterMod(name, 1);
export const mod = upgradeMod(InVerse, [ISCFeature.SAVE_DATA_MANAGER, ISCFeature.PICKUP_INDEX_CREATION, ISCFeature.CUSTOM_PICKUPS, ISCFeature.RUN_IN_N_FRAMES] as const);