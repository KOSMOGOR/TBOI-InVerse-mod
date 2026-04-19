import { initModFeatures } from "isaacscript-common";
import { mod } from "./mod";
import { Dream } from "./characters/Dream";
import { Momentuum } from "./items/Momentuum";
import { InnateItems } from "./misc/InnateItems";
import { DreamsHandbag } from "./trinkets/DeamsBag";
import { MomentuumCards } from "./pocketItems/MomentuumCards";
import { Teegro } from "./characters/Teegro";
import { OnGlowingHourglassRewind, PostPlayerRenderAbove } from "./misc/AdditionalCallbacks";


export function main(): void {
    initModFeatures(mod, [PostPlayerRenderAbove, OnGlowingHourglassRewind]);
    initModFeatures(mod, [InnateItems]);
    initModFeatures(mod, [Dream, Momentuum, MomentuumCards]);
    // tainted Dream will be here
    initModFeatures(mod, [DreamsHandbag]);
    initModFeatures(mod, [Teegro]);
}
