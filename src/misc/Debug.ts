import { CollectibleType } from "isaac-typescript-definitions";
import { CallbackCustom, ModCallbackCustom, ModFeature, repeat } from "isaacscript-common";

const isDebug = require("./isDebug")?.isDebug ?? false;

export class Debug extends ModFeature {
    @CallbackCustom(ModCallbackCustom.POST_PLAYER_INIT_FIRST)
    PostPlayerInit(player: EntityPlayer) {
        if (!isDebug) return;
        print("DEBUG");
        repeat(5, () => player.AddCollectible(CollectibleType.BELT));
        player.AddCollectible(CollectibleType.BLACK_CANDLE);
        player.AddCollectible(CollectibleType.MIND);
        player.EvaluateItems();
    }
}