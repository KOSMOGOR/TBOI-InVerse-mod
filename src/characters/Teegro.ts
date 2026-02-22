import { Callback, CallbackCustom, game, getCharacters, inRoomType, itemConfig, K_COLORS, ModCallbackCustom, ModFeature, spawnEffect, type PickupIndex } from "isaacscript-common";
import { mod } from "../mod";
import { CacheFlag, ItemConfigTag, ModCallback, PickupPrice, PickupVariant, RoomType } from "isaac-typescript-definitions";
import { ModEnums } from "../ModEnums";
import { CallbackPostPlayerRenderAbove } from "../misc/AdditionalCallbacks";
import { Utils } from "../misc/Utils";

const TeegroHair = Isaac.GetCostumeIdByPath("gfx/characters/Teegro_Hair.anm2");
const TeegroTail = Isaac.GetCostumeIdByPath("gfx/characters/Teegro_Tail.anm2");

const font = Font();
font.Load("font/terminus.fnt");
const ItemChainsVariant = Isaac.GetEntityVariantByName("ItemChains");
const HunterPriceVariant = Isaac.GetEntityVariantByName("HunterPrice");
const HunterKeyVariant = Isaac.GetEntityVariantByName("HunterKey");
const HunterKeySubType = {
    Shard: 1,
    Half: 2,
    Full: 3,
    Double: 4,
};
const HunterKeyValue = {
    [HunterKeySubType.Shard]: 1,
    [HunterKeySubType.Half]: 2,
    [HunterKeySubType.Full]: 4,
    [HunterKeySubType.Double]: 8,
}

mod.registerCustomPickup(HunterKeyVariant, HunterKeySubType.Shard, _ => v.run.keyShards += HunterKeyValue[HunterKeySubType.Shard] ?? 0);
mod.registerCustomPickup(HunterKeyVariant, HunterKeySubType.Half, _ => v.run.keyShards += HunterKeyValue[HunterKeySubType.Half] ?? 0);
mod.registerCustomPickup(HunterKeyVariant, HunterKeySubType.Full, _ => v.run.keyShards += HunterKeyValue[HunterKeySubType.Full] ?? 0);
mod.registerCustomPickup(HunterKeyVariant, HunterKeySubType.Double, _ => v.run.keyShards += HunterKeyValue[HunterKeySubType.Double] ?? 0);

const lockedEffects = new Map<PickupIndex, Array<EntityEffect>>();

const v = {
    run: {
        keyShards: 80
    },
    level: {
        pickupsInfo: new Map<PickupIndex, {locked: boolean, canTouch: boolean, cost: number, wait: number}>(),
        // For turning pickups into hunter keys
        checkedPickups: new Set<PickupIndex>()
    }
}

function LockItemSprite(pickup: EntityPickup) {
    let ind = mod.getPickupIndex(pickup);
    let effects = lockedEffects.get(ind);
    if (effects) effects.forEach(effect => effect.Remove());
    let pickupInfo = v.level.pickupsInfo.get(ind);
    if (!pickupInfo) return;
    if (pickupInfo.canTouch) {
        let front = spawnEffect(ItemChainsVariant, 0, pickup.Position);
        front.GetSprite().Play("Front", true);
        front.DepthOffset = 10;
        front.FollowParent(pickup);
        let back = spawnEffect(ItemChainsVariant, 0, pickup.Position);
        back.GetSprite().Play("Back", true);
        back.DepthOffset = -10;
        back.FollowParent(pickup);
        lockedEffects.set(ind, [front, back]);
    } else {
        pickup.AutoUpdatePrice = false;
        pickup.Price = -100;
        let price = spawnEffect(HunterPriceVariant, 0, pickup.Position);
        price.SpriteOffset = Vector(0, 10);
        price.DepthOffset = 10;
        price.GetSprite().SetFrame("Idle", math.floor(pickupInfo.cost / 4) - 1);
        lockedEffects.set(ind, [price]);
    }
}
function UnlockItemSprite(pickup: EntityPickup) {
    let ind = mod.getPickupIndex(pickup);
    let effects = lockedEffects.get(ind); if (!effects) return;
    let pickupInfo = v.level.pickupsInfo.get(ind);
    if (!pickupInfo) effects.forEach(effect => effect.Remove());
    else {
        if (pickupInfo.canTouch) effects.forEach(effect => {
            let sprite = effect.GetSprite();
            sprite.Play(sprite.GetAnimation() + "Unlocking", true)
        });
        else effects.forEach(effect => effect.Remove());
    }
}

export class Teegro extends ModFeature {
    v = v;

    @Callback(ModCallback.EVALUATE_CACHE)
    EvaluateCache(player: EntityPlayer, cacheFlag: CacheFlag): void {
        if (player.GetPlayerType() != ModEnums.PLAYER_TEEGRO) return;
        switch (cacheFlag) {
            case CacheFlag.DAMAGE:
                player.Damage += 1.6; break;
            case CacheFlag.FIRE_DELAY:
                player.MaxFireDelay *= 1.4; break;
            case CacheFlag.SHOT_SPEED:
                player.ShotSpeed += 0.2; break;
            case CacheFlag.RANGE:
                player.TearRange -= 80; break;
            case CacheFlag.SPEED:
                player.MoveSpeed += 0.1; break;
        }
    }

    @Callback(ModCallback.POST_PLAYER_INIT)
    PostPlayerInit(player: EntityPlayer) {
        if (player.GetPlayerType() != ModEnums.PLAYER_TEEGRO) return;
        player.AddNullCostume(TeegroHair);
        player.AddNullCostume(TeegroTail);
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_EARLY)
    ResetValues() {
        lockedEffects.clear();
    }

    @CallbackCustom(ModCallbackCustom.POST_PICKUP_INIT_LATE, PickupVariant.COLLECTIBLE)
    LockItemOnInit(pickup: EntityPickup) {
        let ind = mod.getPickupIndex(pickup);
        let pickupInfo = v.level.pickupsInfo.get(ind);
        // Unlocked - skip
        if (pickupInfo?.locked == false) return;
        // No Teegro - mark as unlocked
        if (!getCharacters().includes(ModEnums.PLAYER_TEEGRO)) {
            v.level.pickupsInfo.set(ind, {
                locked: false,
                canTouch: true,
                cost: 0,
                wait: 0
            });
            return;
        }
        // Didn't check - lock
        if (!pickupInfo) {
            if (itemConfig.GetCollectible(pickup.SubType)?.HasTags(ItemConfigTag.QUEST) || inRoomType(RoomType.BOSS)) return;
            let canTouch = true, cost = 4, wait = pickup.Price == 0 ? 15 : 0;
            if ([PickupPrice.TWO_HEARTS, PickupPrice.THREE_SOUL_HEARTS, PickupPrice.ONE_HEART_AND_ONE_SOUL_HEART, PickupPrice.TWO_SOUL_HEARTS, PickupPrice.ONE_HEART_AND_ONE_SOUL_HEART, 30].includes(pickup.Price)) {
                cost = 12;
                canTouch = false;
            } else if ([PickupPrice.ONE_HEART, PickupPrice.ONE_SOUL_HEART, 15].includes(pickup.Price)) {
                cost = 8;
                canTouch = false;
            } else if ([PickupPrice.YOUR_SOUL, -100].includes(pickup.Price) || pickup.Price > 0) {
                cost = 4;
                canTouch = false;
            }
            pickupInfo = {
                locked: true,
                canTouch,
                cost,
                wait
            };
            v.level.pickupsInfo.set(ind, pickupInfo);
        }
        if (pickupInfo.locked && !lockedEffects.has(ind)) LockItemSprite(pickup);
    }

    @Callback(ModCallback.PRE_PICKUP_COLLISION)
    LockedItemInteraction(pickup: EntityPickup, collider: Entity): boolean | undefined {
        let ind = mod.getPickupIndex(pickup);
        let pickupInfo = v.level.pickupsInfo.get(ind);
        // If no info or pickup unlocked and passed some time - player can pick it up
        if (!pickupInfo || (!pickupInfo.locked && pickupInfo.wait == 0)) return;
        // If item is unlocking - default behaviour
        if (!pickupInfo.locked && pickupInfo.wait > 0) return !pickupInfo.canTouch;
        // If item is just locked - try buy it
        if (v.run.keyShards >= pickupInfo.cost) {
            v.run.keyShards -= pickupInfo.cost;
            pickupInfo.locked = false;
            UnlockItemSprite(pickup);
        }
        // No shard - default behaviour
        return !pickupInfo.canTouch;
    }

    @Callback(ModCallback.POST_PICKUP_UPDATE)
    UpdateUnlockingItems(pickup: EntityPickup) {
        let ind = mod.getPickupIndex(pickup);
        let pickupInfo = v.level.pickupsInfo.get(ind);
        if (!pickupInfo) return;
        if (!pickupInfo.locked && pickupInfo.wait > 0) {
            pickupInfo.wait--;
            v.level.pickupsInfo.set(ind, pickupInfo);
        }
        let effects = lockedEffects.get(ind); if (!effects) return;
        let spr = effects[0]?.GetSprite(); if (!spr) return;
    }

    @CallbackCustom(ModCallbackCustom.POST_PICKUP_INIT_LATE)
    SpawnHunterKeys(pickup: EntityPickup) {
        if (pickup.Variant == PickupVariant.COLLECTIBLE) return;
    }

    @CallbackPostPlayerRenderAbove()
    RenderHunterKeyCount(player: EntityPlayer) {
        if (player.GetPlayerType() != ModEnums.PLAYER_TEEGRO || !game.GetHUD().IsVisible()) return;
        let pos = Utils.worldToMirrorScreen(player.Position).add(Vector(-15, 10));
        let scale = 0.5;
        font.DrawStringScaled(v.run.keyShards.toString(), pos.X, pos.Y, scale, scale, K_COLORS.White, 30, true);
    }
}