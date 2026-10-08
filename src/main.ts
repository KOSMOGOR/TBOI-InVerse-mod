import { initModFeatures } from "isaacscript-common";
import { mod } from "./mod";
import { Dream } from "./characters/Dream";
import { Momentuum } from "./items/Momentuum";
import { InnateItems } from "./misc/InnateItems";
import { DreamsHandbag } from "./trinkets/DeamsBag";
import { MomentuumCards } from "./pocketItems/MomentuumCards";
import { Teegro } from "./characters/Teegro";
import { PostPlayerRenderAbove } from "./misc/AdditionalCallbacks";
import { Unlocks } from "./misc/Unlocks";


export function main(): void {
    initModFeatures(mod, [PostPlayerRenderAbove]);
    initModFeatures(mod, [InnateItems, Unlocks]);
    initModFeatures(mod, [Dream, Momentuum, MomentuumCards]);
    // Tainted Dream will be here
    initModFeatures(mod, [DreamsHandbag]);
    initModFeatures(mod, [Teegro]);
}
