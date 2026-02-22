import { CacheFlag, CollectibleType, ItemType, ModCallback, PickupVariant } from "isaac-typescript-definitions";
import { Callback, CallbackCustom, getPlayersOfType, getRandomInt, mapSetPlayer, ModCallbackCustom, ModFeature } from "isaacscript-common";
import { ModEnums } from "../ModEnums";
import { MomentuumData } from "../items/Momentuum";

const DreamHair = Isaac.GetCostumeIdByPath("gfx/characters/Dream_Hair.anm2");

export class Dream extends ModFeature {
    @Callback(ModCallback.EVALUATE_CACHE)
    EvaluateCache(player: EntityPlayer, cacheFlag: CacheFlag): void {
        if (player.GetPlayerType() != ModEnums.PLAYER_DREAM) return;
        switch (cacheFlag) {
            case CacheFlag.DAMAGE:
                player.Damage -= 0.4; break;
            case CacheFlag.FIRE_DELAY:
                player.MaxFireDelay *= 1.1; break;
            case CacheFlag.SHOT_SPEED:
                player.ShotSpeed += 0.25; break;
            case CacheFlag.RANGE:
                player.TearRange -= 80; break;
            case CacheFlag.SPEED:
                player.MoveSpeed -= 0.15; break;
        }
    }

    @Callback(ModCallback.POST_PLAYER_INIT)
    PostPlayerInit(player: EntityPlayer) {
        if (player.GetPlayerType() != ModEnums.PLAYER_DREAM) return;
        player.AddNullCostume(DreamHair);
        player.AddCollectible(ModEnums.COLLECTIBLE_MOMENTUUM);
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_COLLECTIBLE_ADDED, CollectibleType.BIRTHRIGHT)
    OnGetBirthright(player: EntityPlayer) {
        if (player.GetPlayerType() != ModEnums.PLAYER_DREAM) return;
        mapSetPlayer(MomentuumData.run.MomentuumCharges, player, 24);
    }

    @Callback(ModCallback.POST_PICKUP_SELECTION)
    RerollItemToMomentuum(pickup: EntityPickup, variant: PickupVariant, subType: int) : [pickupVariant: PickupVariant, subType: int] | undefined {
        if (variant != PickupVariant.COLLECTIBLE || subType == ModEnums.COLLECTIBLE_MOMENTUUM) return;
        let dreamsWithBirthright = getPlayersOfType(ModEnums.PLAYER_DREAM).filter(player => player.HasCollectible(CollectibleType.BIRTHRIGHT));
        if (dreamsWithBirthright.length > 0 && getRandomInt(1, 100, dreamsWithBirthright[0]?.GetCollectibleRNG(CollectibleType.BIRTHRIGHT)) <= 3) return [PickupVariant.COLLECTIBLE, ModEnums.COLLECTIBLE_MOMENTUUM];
        return;
    }
}