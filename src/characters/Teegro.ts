import { addFlag, anyPlayerHasCollectible, Callback, CallbackCustom, game, getAdjustedPrice, getCharacters, getPickups, getPlayersOfType, getRandomInt, getRandomVector, hasFlag, inRoomType, itemConfig, K_COLORS, ModCallbackCustom, ModFeature, sfxManager, spawnCollectibleFromPool, spawnEffect, spawnPickup, type PickupIndex } from "isaacscript-common";
import { mod } from "../mod";
import { CacheFlag, CollectibleType, DamageFlag, EntityType, ItemConfigTag, ItemPoolType, ModCallback, PickupPrice, PickupVariant, RoomType, SoundEffect } from "isaac-typescript-definitions";
import { ModEnums } from "../ModEnums";
import { CallbackPostPlayerRenderAbove } from "../misc/AdditionalCallbacks";
import { Utils } from "../misc/Utils";

const TeegroHair = Isaac.GetCostumeIdByPath("gfx/characters/Teegro_Hair.anm2");
const TeegroTail = Isaac.GetCostumeIdByPath("gfx/characters/Teegro_Tail.anm2");

const font = Font();
font.Load("font/terminus.fnt");
const ItemChainsVariant = Isaac.GetEntityVariantByName("ItemChains");
const HunterPriceEffectVariant = Isaac.GetEntityVariantByName("HunterPrice");
const HunterKeyVariant = Isaac.GetEntityVariantByName("HunterKey");
const HunterKeySubType = {
    Shard: 1,
    Half: 2,
    Full: 3,
    Double: 4,
};
const HunterKeyInfo = {
    [HunterKeySubType.Shard]: {Value: 1, BasePrice: 5},
    [HunterKeySubType.Half]: {Value: 2, BasePrice: 5},
    [HunterKeySubType.Full]: {Value: 4, BasePrice: 15},
    [HunterKeySubType.Double]: {Value: 8, BasePrice: 15}
}
const HunterPrice = -100;

function CollectHunterPickup(pickup: EntityPickup, player: EntityPlayer) {
    if (pickup.Price > 0) player.AddCoins(-pickup.Price);
    else if (pickup.Price == PickupPrice.SPIKES) player.TakeDamage(2, addFlag(DamageFlag.SPIKES, DamageFlag.NO_PENALTIES), EntityRef(pickup), 60);
    v.run.keyShards += HunterKeyInfo[pickup.SubType]?.Value ?? 0;
    sfxManager.Play(SoundEffect.BONE_HEART);
}
function CollisionHunterPickup(pickup: EntityPickup, player: EntityPlayer) {
    if (pickup.Price > 0 && player.GetNumCoins() < pickup.Price || pickup.Price == PickupPrice.SPIKES && player.GetDamageCooldown() > 0) return true;
    return;
}
mod.registerCustomPickup(HunterKeyVariant, HunterKeySubType.Shard, CollectHunterPickup, CollisionHunterPickup);
mod.registerCustomPickup(HunterKeyVariant, HunterKeySubType.Half, CollectHunterPickup, CollisionHunterPickup);
mod.registerCustomPickup(HunterKeyVariant, HunterKeySubType.Full, CollectHunterPickup, CollisionHunterPickup);
mod.registerCustomPickup(HunterKeyVariant, HunterKeySubType.Double, CollectHunterPickup, CollisionHunterPickup);

const lockedEffects = new Map<PickupIndex, Array<EntityEffect>>();

const v = {
    run: {
        keyShards: 80,
        tookDamageThisRoom: false
    },
    level: {
        pickupsInfo: new Map<PickupIndex, {locked: boolean, canTouch: boolean, cost: number, wait: number}>(),
        // For turning pickups into hunter keys
        checkedPickups: new Set<PickupIndex>(),
        hunterChestRewards: new Map<PickupIndex, Array<[PickupVariant, int?]>>(),
        pickupsRemoveOnNewRoom: new Set<PickupIndex>()
    },
    room: {
        droppedKey: false
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
        pickup.Price = HunterPrice;
        let price = spawnEffect(HunterPriceEffectVariant, 0, pickup.Position);
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
                player.Damage += 0.6; break;
            case CacheFlag.FIRE_DELAY:
                player.MaxFireDelay *= 1.2; break;
            case CacheFlag.SHOT_SPEED:
                player.ShotSpeed += 0.2; break;
            case CacheFlag.RANGE:
                player.TearRange -= 80; break;
            case CacheFlag.SPEED:
                player.MoveSpeed += 0.2; break;
            case CacheFlag.LUCK:
                player.Luck -= 1; break;
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
        v.run.tookDamageThisRoom = false;
        getPickups().forEach(pickup => {
            let ind = mod.getPickupIndex(pickup);
            if (v.level.pickupsRemoveOnNewRoom.has(ind)) {
                pickup.Remove();
                v.level.pickupsRemoveOnNewRoom.delete(ind);
            }
        });
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
    SpawnKeyOnNewRoom() {
        if (!getCharacters().includes(ModEnums.PLAYER_TEEGRO)) return;
        let room = game.GetRoom();
        if (!room.IsFirstVisit()) return;
        if (room.GetType() == RoomType.ANGEL)
            spawnPickup(HunterKeyVariant, HunterKeySubType.Full, room.FindFreePickupSpawnPosition(room.GetCenterPos()));
    }

    @CallbackCustom(ModCallbackCustom.POST_ROOM_CLEAR_CHANGED, true)
    SpawnKeyShardOnRoomClear() {
        if (!getCharacters().includes(ModEnums.PLAYER_TEEGRO)) return;
        let room = game.GetRoom();
        if (!v.run.tookDamageThisRoom && getRandomInt(1, 2, game.GetRoom().GetAwardSeed()) == 1)
            spawnPickup(HunterKeyVariant, HunterKeySubType.Shard, room.FindFreePickupSpawnPosition(room.GetCenterPos()));
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
            if (itemConfig.GetCollectible(pickup.SubType)?.HasTags(ItemConfigTag.QUEST) || inRoomType(RoomType.BOSS) || pickup.Price == PickupPrice.YOUR_SOUL) return;
            let canTouch = true, cost = 4, wait = pickup.Price == 0 ? 15 : 0;
            if ([PickupPrice.TWO_HEARTS, PickupPrice.THREE_SOUL_HEARTS, PickupPrice.ONE_HEART_AND_TWO_SOUL_HEARTS, PickupPrice.TWO_SOUL_HEARTS, PickupPrice.ONE_HEART_AND_ONE_SOUL_HEART].includes(pickup.Price) || pickup.Price >= 25) {
                cost = 12;
                canTouch = false;
            } else if ([PickupPrice.ONE_HEART, PickupPrice.ONE_SOUL_HEART].includes(pickup.Price) || pickup.Price >= 15) {
                cost = 8;
                canTouch = false;
            } else if (pickup.Price == HunterPrice || pickup.Price > 0) {
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
    HunterPickupUpdatePrice(pickup: EntityPickup) {
        let hki = HunterKeyInfo[pickup.SubType];
        if (pickup.Variant != HunterKeyVariant || !hki) return;
        if (pickup.Price > 0) pickup.Price = anyPlayerHasCollectible(CollectibleType.POUND_OF_FLESH) ? PickupPrice.SPIKES : getAdjustedPrice(hki.BasePrice);
        return;
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
        if (!getCharacters().includes(ModEnums.PLAYER_TEEGRO)) return;
        if (pickup.Variant == PickupVariant.COLLECTIBLE) return;
        let ind = mod.getPickupIndex(pickup);
        if (v.level.checkedPickups.has(ind)) return;
        v.level.checkedPickups.add(ind);
        let rand = getRandomInt(1, 100, pickup.InitSeed);
        if (pickup.Variant == PickupVariant.KEY) {
            let targetVariant = pickup.Variant, targetSubType = pickup.SubType
            if (rand == 1) {
                targetVariant = HunterKeyVariant;
                targetSubType = HunterKeySubType.Full
            } else if (rand <= 25) {
                targetVariant = HunterKeyVariant;
                targetSubType = HunterKeySubType.Shard;
            }
            if (pickup.Variant != targetVariant) {
                pickup.Morph(EntityType.PICKUP, targetVariant, targetSubType, true, true);
                pickup.AutoUpdatePrice = false;
            }
            pickup.GetSprite().LoadGraphics()
        } else if (Isaac.GetPlayer().GetNumCoins() >= 30 && pickup.Variant == PickupVariant.COIN) {
            if (rand <= 10) {
                pickup.Morph(EntityType.PICKUP, HunterKeyVariant, HunterKeySubType.Shard, true, true);
                pickup.AutoUpdatePrice = false;
            }
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_LEVEL_REORDERED)
    BirthrightEffect() {
        let teegrosWithBirthright = getPlayersOfType(ModEnums.PLAYER_TEEGRO).filter(player => player.HasCollectible(CollectibleType.BIRTHRIGHT));
        if (teegrosWithBirthright.length == 0) return;
        let positions = [Vector(80, 160), Vector(560, 160), Vector(80, 400), Vector(560, 400)];
        let teegro = teegrosWithBirthright[0]; if (!teegro) return;
        let room = game.GetRoom();
        teegro.AddCollectible(CollectibleType.CHAOS);
        positions.forEach(position => {
            let pickup = spawnCollectibleFromPool(ItemPoolType.TREASURE, room.FindFreePickupSpawnPosition(position), undefined);
            let ind = mod.getPickupIndex(pickup);
            v.level.pickupsInfo.set(ind, {
                locked: true,
                canTouch: true,
                cost: getRandomInt(2, 3, pickup.InitSeed) * 4,
                wait: 15
            });
            v.level.pickupsRemoveOnNewRoom.add(ind);
        });
        teegro.RemoveCollectible(CollectibleType.CHAOS);
    }

    @Callback(ModCallback.POST_NPC_DEATH)
    OnMinibossDeath(npc: EntityNPC) {
        if (!getCharacters().includes(ModEnums.PLAYER_TEEGRO)) return;
        if (npc.IsBoss() && !v.room.droppedKey) {
            let subType = inRoomType(RoomType.MINI_BOSS) ? HunterKeySubType.Shard : inRoomType(RoomType.BOSS, RoomType.ANGEL, RoomType.DEVIL) ? HunterKeySubType.Full : -1;
            if (subType != -1) {
                spawnPickup(HunterKeyVariant, subType, npc.Position, getRandomVector(undefined).Resized(5));
                v.room.droppedKey = true;
            }
        }
    }

    @Callback(ModCallback.ENTITY_TAKE_DMG, EntityType.PLAYER)
    OnPlayerTakeDamage(entity: Entity, amount: float, damageFlags: BitFlags<DamageFlag>, source: EntityRef, countdownFrames: int): boolean | undefined {
        let player = entity.ToPlayer(); if (!player) return;
        if (amount > 0 && !hasFlag(damageFlags, DamageFlag.NO_PENALTIES)) v.run.tookDamageThisRoom = true;
        return;
    }

    @CallbackPostPlayerRenderAbove()
    RenderHunterKeyCount(player: EntityPlayer) {
        if (player.GetPlayerType() != ModEnums.PLAYER_TEEGRO || !game.GetHUD().IsVisible()) return;
        let pos = Utils.worldToMirrorScreen(player.Position).add(Vector(-15, 10));
        let scale = 0.5;
        font.DrawStringScaled(v.run.keyShards.toString(), pos.X, pos.Y, scale, scale, K_COLORS.White, 30, true);
    }
}