import { anyPlayerHasCollectible, anyPlayerHasTrinket, Callback, CallbackCustom, DEFAULT_ITEM_POOL_TYPE, DefaultMap, defaultMapGetPlayer, game, getAdjustedPrice, getCharacters, getEffects, getGoldenTrinketType, getPickups, getPlayersOfType, getRandomArrayElement, getRandomFromWeightedArray, getRandomInt, getRandomVector, getRoomDescriptorReadOnly, getRoomItemPoolType, hasFlag, inRoomType, iRange, isChest, itemConfig, K_COLORS, ModCallbackCustom, ModFeature, newRNG, onStage, repeat, sfxManager, spawnCollectibleFromPool, spawnEffect, spawnPickup, vectorEquals, type PickupIndex, type PlayerIndex } from "isaacscript-common";
import { mod } from "../mod";
import { BombSubType, CacheFlag, CardType, CoinSubType, CollectibleType, DamageFlag, EffectVariant, EntityCollisionClass, EntityType, GridRoom, HeartSubType, ItemConfigTag, KeySubType, LevelStage, ModCallback, PickupPrice, PickupVariant, RoomType, SoundEffect, TrinketType } from "isaac-typescript-definitions";
import { ModEnums } from "../ModEnums";
import { CallbackPostPlayerRenderAbove } from "../misc/AdditionalCallbacks";
import { Utils } from "../misc/Utils";
import { InnateItems } from "../misc/InnateItems";

const TeegroHair = Isaac.GetCostumeIdByPath("gfx/characters/Teegro_Hair.anm2");
const TeegroTail = Isaac.GetCostumeIdByPath("gfx/characters/Teegro_Tail.anm2");

const ItemChainsVariant = Isaac.GetEntityVariantByName("ItemChains");
const HunterPriceEffectVariant = Isaac.GetEntityVariantByName("HunterPrice");
const HunterKeyInfo = {
    [ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Shard]: {Value: 1, BasePrice: 5},
    [ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Half]: {Value: 2, BasePrice: 5},
    [ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Full]: {Value: 4, BasePrice: 15},
    [ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Double]: {Value: 8, BasePrice: 15}
}
const HunterPrice = -100;

function CollectHunterPickup(this: void, pickup: EntityPickup, player: EntityPlayer) {
    if (pickup.Price !== undefined) {
        if (pickup.Price > 0) player.AddCoins(-pickup.Price);
    }
    v.run.keyShards += HunterKeyInfo[pickup.SubType]?.Value ?? 0;
    sfxManager.Play(SoundEffect.BONE_HEART);
}
function CollisionHunterPickup(this: void, pickup: EntityPickup, player: EntityPlayer) {
    if (!pickup.Price) return;
    if (pickup.Price > 0 && player.GetNumCoins() < pickup.Price || pickup.Price == PickupPrice.SPIKES && player.GetDamageCooldown() > 0) return true;
    return;
}
mod.registerCustomPickup(ModEnums.PICKUP_HUNTER_KEY_VARIANT, ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Shard, CollectHunterPickup, CollisionHunterPickup);
mod.registerCustomPickup(ModEnums.PICKUP_HUNTER_KEY_VARIANT, ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Half, CollectHunterPickup, CollisionHunterPickup);
mod.registerCustomPickup(ModEnums.PICKUP_HUNTER_KEY_VARIANT, ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Full, CollectHunterPickup, CollisionHunterPickup);
mod.registerCustomPickup(ModEnums.PICKUP_HUNTER_KEY_VARIANT, ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Double, CollectHunterPickup, CollisionHunterPickup);

class HunterChestReward {
    _getReward: (rng: RNG) => {reward: {Variant: PickupVariant, SubType: int}, fixate?: boolean};
    // out of 100
    getChance: () => int;
    getCost: () => int;
    onlyItem: boolean;
    onlyOne: boolean;

    constructor(getReward: (rng: RNG) => {reward: {Variant: PickupVariant, SubType: int}, fixate?: boolean},
                getChance: () => int, getCost: () => int, onlyItem: boolean = false, onlyOne: boolean = false) {
        this._getReward = getReward;
        this.getChance = getChance;
        this.getCost = getCost;
        this.onlyItem = onlyItem;
        this.onlyOne = onlyOne;
    }

    getReward(rng: RNG, needOnlyItem: boolean): {reward: {Variant: PickupVariant, SubType: int}, fixate?: boolean} | undefined {
        if (needOnlyItem && !this.onlyItem) return undefined;
        let res = getRandomInt(1, 100, rng);
        if (res <= this.getChance()) return this._getReward(rng);
        return undefined;
    }
}
const HunterChestRewards: HunterChestReward[] = [
    new HunterChestReward(
        rng => {
            let item = Utils.getItemFromPool(getRoomItemPoolType(), rng, 3);
            return {reward: {Variant: PickupVariant.COLLECTIBLE, SubType: item}, fixate: true};
        },
        () => 10,
        () => 8,
        true
    ),
    new HunterChestReward(
        () => { return {reward: {Variant: ModEnums.PICKUP_HUNTER_KEY_VARIANT, SubType: ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Shard}}; },
        () => {
            let count = Utils.getAllPlayersTrinketMultiplier(TrinketType.RUSTED_KEY);
            let chance = 40 + (count >= 1 ? 10 : 0) + (count >= 2 ? 5 : 0);
            if (count >= 3) chance = 100;
            return chance;
        },
        () => {
            let cost = 3 - (anyPlayerHasCollectible(CollectibleType.MOMS_KEY) ? 1 : 0) - Utils.getAllPlayersTrinketMultiplier(TrinketType.RUSTED_KEY);
            return math.max(cost, 0);
        }
    ),
    new HunterChestReward(
        () => {
            let player = Isaac.GetPlayer();
            InnateItems.AddItem(player, CollectibleType.CHAOS);
            let item = game.GetItemPool().GetCollectible(DEFAULT_ITEM_POOL_TYPE);
            InnateItems.RemoveItem(player, CollectibleType.CHAOS);
            return {reward: {Variant: PickupVariant.COLLECTIBLE, SubType: item}, fixate: true};
        },
        () => 15,
        () => 6,
        true
    ),
    new HunterChestReward(
        rng => {
            let coins: [number, float][] = [[CoinSubType.NICKEL, 49], [CoinSubType.DIME, 10], [CoinSubType.LUCKY_PENNY, 10], [CoinSubType.STICKY_NICKEL, 9], [CoinSubType.GOLDEN, 5]];
            let coin = getRandomFromWeightedArray(coins, rng);
            return {reward: {Variant: PickupVariant.COIN, SubType: coin}};
        },
        () => 10,
        () => 2 - (anyPlayerHasCollectible(CollectibleType.MOMS_KEY) ? 1 : 0)
    ),
    new HunterChestReward(
        () => { return {reward: {Variant: PickupVariant.KEY, SubType: KeySubType.GOLDEN}}; },
        () => {
            let count = Utils.getAllPlayersTrinketMultiplier(TrinketType.RUSTED_KEY);
            let chance = 30 + (count >= 1 ? 10 : 0);
            if (count >= 2) chance = 100;
            return chance;
        },
        () => {
            let cost = 3 - (anyPlayerHasCollectible(CollectibleType.MOMS_KEY) ? 1 : 0) - Utils.getAllPlayersTrinketMultiplier(TrinketType.RUSTED_KEY);
            return math.max(cost, 0);
        },
        false, true
    ),
    new HunterChestReward(
        () => { return {reward: {Variant: PickupVariant.BOMB, SubType: BombSubType.GOLDEN}}; },
        () => 30,
        () => 3 - (anyPlayerHasCollectible(CollectibleType.MOMS_KEY) ? 1 : 0),
        false, true
    ),
    new HunterChestReward(
        rng => {
            let runes = [...iRange(CardType.RUNE_HAGALAZ, CardType.RUNE_BLACK), ...iRange(CardType.SOUL_OF_ISAAC, CardType.SOUL_OF_JACOB_AND_ESAU)];
            let rune = getRandomArrayElement(runes, rng);
            return {reward: {Variant: PickupVariant.CARD, SubType: rune}};
        },
        () => 20,
        () => 4 - (anyPlayerHasCollectible(CollectibleType.MOMS_KEY) ? 1 : 0)
    ),
    new HunterChestReward(
        rng => {
            let cards = iRange(CardType.REVERSE_FOOL, CardType.REVERSE_WORLD);
            let card = getRandomArrayElement(cards, rng);
            return {reward: {Variant: PickupVariant.CARD, SubType: card}};
        },
        () => 20,
        () => 4 - (anyPlayerHasCollectible(CollectibleType.MOMS_KEY) ? 1 : 0)
    ),
    new HunterChestReward(
        () => {
            let trinket = game.GetItemPool().GetTrinket();
            return {reward: {Variant: PickupVariant.TRINKET, SubType: getGoldenTrinketType(trinket)}};
        },
        () => 20,
        () => 5 - (anyPlayerHasCollectible(CollectibleType.MOMS_KEY) ? 1 : 0)
    ),
    new HunterChestReward(
        () => { return {reward: {Variant: PickupVariant.HEART, SubType: HeartSubType.SOUL}}; },
        () => 20 + Utils.getAllPlayersTrinketMultiplier(TrinketType.MOMS_PEARL) * 10,
        () => 2 - (anyPlayerHasCollectible(CollectibleType.MOMS_KEY) ? 1 : 0)
    ),
    new HunterChestReward(
        rng => {
            let pickups = [PickupVariant.HEART, PickupVariant.COIN, PickupVariant.KEY, PickupVariant.BOMB, PickupVariant.SACK, PickupVariant.PILL, PickupVariant.LIL_BATTERY, PickupVariant.CARD, PickupVariant.TRINKET];
            let pickup = getRandomArrayElement(pickups, rng);
            return {reward: {Variant: pickup, SubType: 0}};
        },
        () => 100,
        () => 1
    )
];
function GenerateHunterChestReward(rng: RNG): {Variant: PickupVariant, SubType: int}[] {
    let rewards: {Variant: PickupVariant, SubType: int}[] = [];
    let remainingRewardLevel = getRandomInt(6, 16, rng);
    let pickedOptions = new Set<int>();
    let needOnlyItem = onStage(LevelStage.DARK_ROOM_CHEST);
    let i = 0;
    while (remainingRewardLevel > 0) {
        let hcr = HunterChestRewards[i]; if (!hcr) break;
        if (remainingRewardLevel >= hcr.getCost() && (!hcr.onlyOne || !pickedOptions.has(i))) {
            let reward = hcr.getReward(rng, needOnlyItem);
            if (reward) {
                if (reward.fixate) rewards = [];
                rewards.push(reward.reward);
                remainingRewardLevel -= hcr.getCost();
                pickedOptions.add(i);
                if (reward.fixate) break;
            }
        }
        i = (i + 1) % HunterChestRewards.length;
    }
    return rewards;
}

const v = {
    run: {
        keyShards: 4,
        tookDamageThisRoom: false
    },
    level: {
        pickupsInfo: new Map<PickupIndex, {locked: boolean, canTouch: boolean, cost: int, wait: int, basePrice?: int}>(),
        // For turning pickups into hunter keys and other things
        checkedPickups: new Set<PickupIndex>(),
        hunterChestRewards: new Map<PickupIndex, Array<{Variant: PickupVariant, SubType: int}>>(),
        pickupsRemoveOnNewRoom: new Set<PickupIndex>()
    },
    room: {
        droppedKey: false
    }
}
export const TeegroData = v;

const font = Font();
font.Load("font/terminus.fnt");
const lockedEffects = new Map<PickupIndex, Array<EntityEffect>>();
const hunterKeysCountSprites = new DefaultMap<PlayerIndex, Sprite>(() => {
    let sprite = Sprite();
    sprite.Load("gfx/ui/HunterKey_HUD.anm2", true);
    sprite.Play("Partial", true);
    return sprite;
});

function GetHunterPriceFromRegular(price: int) {
    if (price > 0) price = getAdjustedPrice(price);
    if ([PickupPrice.TWO_HEARTS, PickupPrice.THREE_SOUL_HEARTS, PickupPrice.ONE_HEART_AND_TWO_SOUL_HEARTS, PickupPrice.TWO_SOUL_HEARTS, PickupPrice.ONE_HEART_AND_ONE_SOUL_HEART].includes(price) || price >= 25) {
        return 12;
    } else if ([PickupPrice.ONE_HEART, PickupPrice.ONE_SOUL_HEART].includes(price) || price >= 15) {
        return 8
    } else if ([PickupPrice.DEVIL_SACRIFICE_SPIKES, HunterPrice].includes(price) || price > 0) {
        return 4;
    }
    return 4;
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
        price.GetSprite().SetFrame("Full", math.floor(pickupInfo.cost / 4) - 1);
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

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
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
    HunterItemsSpecialRooms() {
        if (!getCharacters().includes(ModEnums.PLAYER_TEEGRO)) return;
        let room = game.GetRoom();
        if (!room.IsFirstVisit()) return;
        let center = room.GetCenterPos();
        if (inRoomType(RoomType.ANGEL)) {
            spawnPickup(ModEnums.PICKUP_HUNTER_KEY_VARIANT, ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Full, room.FindFreePickupSpawnPosition(room.GetCenterPos()));
        } else if (inRoomType(RoomType.DEVIL)) {
            let key = spawnPickup(ModEnums.PICKUP_HUNTER_KEY_VARIANT, ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Full, room.FindFreePickupSpawnPosition(center.add(Vector(-120, -40))));
            key.AutoUpdatePrice = false;
            key.Price = PickupPrice.SPIKES;
            let chest = spawnPickup(ModEnums.PICKUP_HUNTER_CHEST, 0, room.FindFreePickupSpawnPosition(center.add(Vector(120, -40))));
            chest.AutoUpdatePrice = false;
            chest.Price = PickupPrice.SPIKES;
        } else if ([GridRoom.BLACK_MARKET, GridRoom.SECRET_SHOP].includes(getRoomDescriptorReadOnly().SafeGridIndex)) {
            let pos = room.FindFreePickupSpawnPosition(room.GetRandomPosition(10));
            spawnPickup(ModEnums.PICKUP_HUNTER_CHEST, 0, pos);
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_ROOM_CLEAR_CHANGED, true)
    SpawnKeyShardOnRoomClear() {
        if (!getCharacters().includes(ModEnums.PLAYER_TEEGRO)) return;
        let room = game.GetRoom();
        if (!v.run.tookDamageThisRoom && getRandomInt(1, 2, game.GetRoom().GetAwardSeed()) == 1)
            spawnPickup(ModEnums.PICKUP_HUNTER_KEY_VARIANT, ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Shard, room.FindFreePickupSpawnPosition(room.GetCenterPos()));
    }

    @CallbackCustom(ModCallbackCustom.POST_PICKUP_UPDATE_FILTER, PickupVariant.COLLECTIBLE)
    LockItemOnInit(pickup: EntityPickup) {
        let ind = mod.getPickupIndex(pickup);
        let pickupInfo = v.level.pickupsInfo.get(ind);
        // Unlocked - skip
        if (pickupInfo?.locked == false) return;
        // "Free" price - skip
        if ([PickupPrice.YOUR_SOUL, PickupPrice.FREE].includes(pickup.Price)) return;
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
        // Didn't check or price returned to normal - lock
        let forceUpdate = false;
        if (!pickupInfo || pickup.Price != HunterPrice) {
            if (itemConfig.GetCollectible(pickup.SubType)?.HasTags(ItemConfigTag.QUEST) || inRoomType(RoomType.BOSS) || pickup.Price == PickupPrice.YOUR_SOUL) return;
            let canTouch = pickup.Price == 0;
            let wait = canTouch ? 15 : 0;
            pickupInfo = {
                locked: true,
                canTouch,
                cost: 0,
                wait
            };
            forceUpdate = true;
        }
        // Evaluate cost first time or reevaluate if wrong
        let itemConfigItem = itemConfig.GetCollectible(pickup.SubType);
        let basePrice = (pickupInfo.basePrice ?? pickup.Price) > 0 ? (itemConfigItem?.ShopPrice ?? 15) : (itemConfigItem?.DevilPrice ?? PickupPrice.TWO_HEARTS);
        let cost = GetHunterPriceFromRegular(basePrice);
        if (pickupInfo.cost != cost) {
            pickupInfo.cost = cost;
            pickupInfo.basePrice = basePrice;
            forceUpdate = true;
        }
        if (forceUpdate) v.level.pickupsInfo.set(ind, pickupInfo);
        if (pickupInfo.locked && (forceUpdate || !lockedEffects.has(ind))) LockItemSprite(pickup);
    }

    @Callback(ModCallback.PRE_PICKUP_COLLISION)
    LockedItemInteraction(pickup: EntityPickup, collider: Entity): boolean | undefined {
        let ind = mod.getPickupIndex(pickup);
        let pickupInfo = v.level.pickupsInfo.get(ind);
        // If no info or pickup unlocked and passed some time - player can pick it up
        if (!pickupInfo || (!pickupInfo.locked && pickupInfo.wait == 0)) return;
        // If item unlocks - default behaviour
        if (!pickupInfo.locked && pickupInfo.wait > 0) return !pickupInfo.canTouch;
        // If item is just locked - try buy it
        if (v.run.keyShards >= pickupInfo.cost) {
            v.run.keyShards -= pickupInfo.cost;
            pickupInfo.locked = false;
            UnlockItemSprite(pickup);
        }
        // Not enough shards - default behaviour
        return !pickupInfo.canTouch;
    }

    @CallbackCustom(ModCallbackCustom.POST_PICKUP_UPDATE_FILTER, ModEnums.PICKUP_HUNTER_KEY_VARIANT)
    HunterPickupUpdatePrice(pickup: EntityPickup) {
        let hki = HunterKeyInfo[pickup.SubType];
        if (!hki) return;
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

    @Callback(ModCallback.POST_EFFECT_UPDATE)
    RemoveUselessLockSprites(effect: EntityEffect) {
        if (![ItemChainsVariant, HunterPriceEffectVariant].includes(effect.Variant)) return;
        if (![...lockedEffects.values()].flat().some(effect1 => Utils.EqualPtrHash(effect1, effect))) effect.Remove();
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
                targetVariant = ModEnums.PICKUP_HUNTER_KEY_VARIANT;
                targetSubType = ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Full
            } else if (rand <= 25) {
                targetVariant = ModEnums.PICKUP_HUNTER_KEY_VARIANT;
                targetSubType = ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Shard;
            }
            if (pickup.Variant != targetVariant) {
                pickup.Morph(EntityType.PICKUP, targetVariant, targetSubType, true, true);
                pickup.AutoUpdatePrice = false;
            }
            pickup.GetSprite().LoadGraphics()
        } else if (Isaac.GetPlayer().GetNumCoins() >= 30 && pickup.Variant == PickupVariant.COIN) {
            if (rand <= 10) {
                pickup.Morph(EntityType.PICKUP, ModEnums.PICKUP_HUNTER_KEY_VARIANT, ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Shard, true, true);
                pickup.AutoUpdatePrice = false;
            }
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_PICKUP_INIT_LATE)
    SpawnHunterChest(pickup: EntityPickup) {
        if (!isChest(pickup)) return;
        let ind = mod.getPickupIndex(pickup);
        if (v.level.checkedPickups.has(ind)) return;
        v.level.checkedPickups.add(ind);
        let chance = onStage(LevelStage.DARK_ROOM_CHEST) ? 4 : 2;
        if (getRandomInt(1, 100, pickup.InitSeed) <= chance) pickup.Morph(pickup.Type, ModEnums.PICKUP_HUNTER_CHEST, 0);
    }

    @CallbackCustom(ModCallbackCustom.POST_PICKUP_INIT_LATE)
    HunterChestGenerateReward(pickup: EntityPickup) {
        if (pickup.Variant != ModEnums.PICKUP_HUNTER_CHEST) return;
        let ind = mod.getPickupIndex(pickup);
        if (v.level.hunterChestRewards.has(ind)) return;
        let rng = newRNG(pickup.DropSeed);
        let reward = GenerateHunterChestReward(rng);
        v.level.hunterChestRewards.set(ind, reward);
    }

    @Callback(ModCallback.PRE_PICKUP_COLLISION, ModEnums.PICKUP_HUNTER_CHEST)
    HunterChestCollision(pickup: EntityPickup, collider: Entity, low: boolean): boolean | undefined {
        let player = collider.ToPlayer();
        if (!player) return;
        let sprite = pickup.GetSprite();
        if (sprite.GetAnimation() != "Idle" || v.run.keyShards < 4 || pickup.Price == PickupPrice.SPIKES && player.GetDamageCooldown() > 0) return;
        let ind = mod.getPickupIndex(pickup);
        let drop = v.level.hunterChestRewards.get(ind); if (!drop || drop.length == 0) return;
        v.run.keyShards -= 4;
        sfxManager.Play(SoundEffect.CHEST_OPEN);
        if (drop[0]?.Variant == PickupVariant.COLLECTIBLE) {
            let pickup1 = spawnPickup(PickupVariant.COLLECTIBLE, drop[0].SubType, pickup.Position);
            let sprite1 = pickup1.GetSprite();
            sprite1.ReplaceSpritesheet(5, "gfx/teegro/HunterChest_Item.png");
            sprite1.LoadGraphics();
            sprite1.SetOverlayFrame("Alternates", 10);
            let ind1 = mod.getPickupIndex(pickup1);
            v.level.pickupsInfo.set(ind1, {
                locked: false,
                canTouch: true,
                cost: 0,
                wait: 0
            });
            repeat(4, () => pickup1.Update());
            for (let effect of getEffects(EffectVariant.POOF_1)) {
                if (vectorEquals(effect.Position, pickup1.Position)) {
                    effect.Remove();
                    break;
                }
            }
        } else {
            let pickup1 = spawnPickup(ModEnums.PICKUP_HUNTER_CHEST, 0, pickup.Position);
            pickup1.EntityCollisionClass = EntityCollisionClass.ALL;
            let sprite1 = pickup1.GetSprite();
            sprite1.Play("Open", true);
            drop.forEach(dropInfo => {
                let vel = RandomVector().Resized(5);
                spawnPickup(dropInfo.Variant, dropInfo.SubType, pickup.Position, vel);
            });
            let ind1 = mod.getPickupIndex(pickup1);
            v.level.pickupsRemoveOnNewRoom.add(ind1);
            v.level.hunterChestRewards.set(ind1, []);
        }
        pickup.Remove();
        return;
    }

    @Callback(ModCallback.POST_PICKUP_UPDATE)
    HunterSounds(pickup: EntityPickup) {
        let sprite = pickup.GetSprite();
        if (pickup.Variant == ModEnums.PICKUP_HUNTER_KEY_VARIANT && sprite.IsEventTriggered("DropSound")) sfxManager.Play(SoundEffect.BONE_DROP);
        else if (pickup.Variant == ModEnums.PICKUP_HUNTER_CHEST && sprite.IsEventTriggered("DropSound")) sfxManager.Play(SoundEffect.CHEST_DROP);
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_LEVEL_REORDERED)
    BirthrightEffect() {
        let teegrosWithBirthright = getPlayersOfType(ModEnums.PLAYER_TEEGRO).filter(player => player.HasCollectible(CollectibleType.BIRTHRIGHT));
        if (teegrosWithBirthright.length == 0) return;
        let positions = [Vector(80, 160), Vector(560, 160), Vector(80, 400), Vector(560, 400)];
        let teegro = teegrosWithBirthright[0]; if (!teegro) return;
        let room = game.GetRoom();
        InnateItems.AddItem(teegro, CollectibleType.CHAOS);
        positions.forEach(position => {
            let pickup = spawnCollectibleFromPool(DEFAULT_ITEM_POOL_TYPE, room.FindFreePickupSpawnPosition(position), undefined);
            let ind = mod.getPickupIndex(pickup);
            v.level.pickupsInfo.set(ind, {
                locked: true,
                canTouch: true,
                cost: getRandomInt(2, 3, pickup.InitSeed) * 4,
                wait: 15
            });
            v.level.pickupsRemoveOnNewRoom.add(ind);
        });
        InnateItems.RemoveItem(teegro, CollectibleType.CHAOS);
    }

    @Callback(ModCallback.POST_NPC_DEATH)
    OnMinibossDeath(npc: EntityNPC) {
        if (!getCharacters().includes(ModEnums.PLAYER_TEEGRO)) return;
        if (npc.IsBoss() && !v.room.droppedKey) {
            let subType = inRoomType(RoomType.MINI_BOSS) ? ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Shard : inRoomType(RoomType.BOSS, RoomType.ANGEL, RoomType.DEVIL) ? ModEnums.PICKIP_HUNTER_KEY_SUBTYPE.Full : -1;
            if (subType != -1) {
                spawnPickup(ModEnums.PICKUP_HUNTER_KEY_VARIANT, subType, npc.Position, getRandomVector(undefined).Resized(5));
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
        let shards = v.run.keyShards;
        let pos = Utils.worldToMirrorScreen(player.Position).add(Vector(-5, -40));
        let scale = 0.5;
        font.DrawStringScaled(math.floor(shards / 4).toString(), pos.X, pos.Y - 4, scale, scale, K_COLORS.White, 20, true);
        let sprite = defaultMapGetPlayer(hunterKeysCountSprites, player);
        sprite.SetFrame(shards % 4);
        sprite.Render(pos);
    }
}