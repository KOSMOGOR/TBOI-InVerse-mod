import { Callback, CallbackCustom, DefaultMap, defaultMapGetPlayer, game, getEntities, getGoldenTrinketType, getPlayersWithTrinket, getPlayerTrinkets, getPocketItems, getRandomArrayElement, getRandomInt, getTrinkets, itemConfig, mapSetPlayer, MAX_PLAYER_TRINKET_SLOTS, ModCallbackCustom, ModFeature, PlayerIndex, smeltTrinket, spawn, spawnPickup, VectorZero, type PocketItemType } from "isaacscript-common";
import { ModEnums } from "../ModEnums";
import { InnateItems } from "../misc/InnateItems";
import { CollectibleType, EntityType, ModCallback, PickupVariant, TrinketSlot, TrinketType, type DamageFlag } from "isaac-typescript-definitions";
import { Utils } from "../misc/Utils";

const v = {
    run: {
        HadDreamsBag: new DefaultMap<PlayerIndex, boolean>(false)
    }
}

export class DreamsHandbag extends ModFeature {
    v = v;

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
    CheckDreamsBagCount(player: EntityPlayer) {
        let hasBag = player.HasTrinket(ModEnums.TRINKET_DREAMSHANDBAG);
        if (defaultMapGetPlayer(v.run.HadDreamsBag, player) != hasBag) {
            if (hasBag) InnateItems.AddItem(player, CollectibleType.BELLY_BUTTON);
            else InnateItems.RemoveItem(player, CollectibleType.BELLY_BUTTON);
            mapSetPlayer(v.run.HadDreamsBag, player, hasBag);
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_ROOM_CLEAR_CHANGED, true)
    SpawnTrinketOnRoomClear() {
        let player = getPlayersWithTrinket(ModEnums.TRINKET_DREAMSHANDBAG)[0]; if (!player) return;
        let mult = player.GetTrinketMultiplier(ModEnums.TRINKET_DREAMSHANDBAG);
        let rng = player.GetTrinketRNG(ModEnums.TRINKET_DREAMSHANDBAG);
        let room = game.GetRoom();
        let awardSeed = room.GetAwardSeed();
        let awardPickups = getEntities(EntityType.PICKUP).map(ent => ent.ToPickup()).filter(pickup => pickup != undefined && pickup.DropSeed == awardSeed);
        if (getRandomInt(1, 100, rng) <= 2 * mult) {
            let pos = room.FindFreePickupSpawnPosition(room.GetCenterPos());
            awardPickups.forEach(pickup => pickup?.Remove());
            let trinket = game.GetItemPool().GetTrinket();
            if (mult >= 3 && getRandomInt(1, 100, rng) <= 5) trinket = getGoldenTrinketType(trinket);
            spawnPickup(PickupVariant.TRINKET, trinket, pos);
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_LEVEL_REORDERED)
    GulpOnNewLevel() {
        getPlayersWithTrinket(ModEnums.TRINKET_DREAMSHANDBAG).forEach(player => {
            let mult = player.GetTrinketMultiplier(ModEnums.TRINKET_DREAMSHANDBAG);
            let gulped = 0;
            for (let i = 0; i < MAX_PLAYER_TRINKET_SLOTS; ++i) {
                let trinket = player.GetTrinket(i);
                if (trinket != ModEnums.TRINKET_DREAMSHANDBAG) {
                    smeltTrinket(player, trinket);
                    player.TryRemoveTrinket(trinket);
                    gulped++;
                }
                if (gulped >= mult) break;
            }
        });
    }

    @Callback(ModCallback.ENTITY_TAKE_DMG, EntityType.PLAYER)
    DropTrinketOnDamage(entity: Entity, amount: float, damageFlags: BitFlags<DamageFlag>, source: EntityRef, countdownFrames: int): boolean | undefined {
        let player = entity.ToPlayer(); if (!player) return;
        let mult = player.GetTrinketMultiplier(ModEnums.TRINKET_DREAMSHANDBAG);
        if (mult == 0 || mult >= 2) return;
        let rng = player.GetTrinketRNG(ModEnums.TRINKET_DREAMSHANDBAG);
        if (getRandomInt(1, 10, rng) <= 1) {
            let trinkets = Utils.getAllPlayerTrinkets(player);
            let trinket = getRandomArrayElement(trinkets, rng);
            player.TryRemoveTrinket(trinket);
            let pos = game.GetRoom().FindFreePickupSpawnPosition(player.Position);
            spawnPickup(PickupVariant.TRINKET, trinket, pos, VectorZero, undefined, player.GetTrinketRNG(trinket));
        }
        return;
    }
}