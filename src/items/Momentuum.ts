import { ActiveSlot, ButtonAction, CacheFlag, CardType, CollectibleAnimation, CollectibleType, DamageFlag, Direction, DoorSlot, DoorVariant, EffectVariant, EntityType, ItemType, LaserVariant, LevelCurse, LevelStage, ModCallback, PickupVariant, PlayerItemAnimation, RoomType, SoundEffect, TrinketType, UseFlag } from "isaac-typescript-definitions";
import { addFlag, addPlayerStat, arrayEquals, Callback, CallbackCustom, checkFamiliar, clamp, DefaultMap, defaultMapGetPlayer, directionToDegrees, game, getDoors, getEntities, getGoldenTrinketType, getPlayers, getPlayerTrinkets, getPocketItems, getRandomArrayElementAndRemove, getRandomInt, getRoomGridIndex, getRoomItemPoolType, getRoomShapeDoorSlotCoordinates, getStage, gridCoordinatesToWorldPosition, hasFlag, inRange, isDoorSlotValidAtGridIndexForRedRoom, isEmptyFlag, isEntity, isGlitchedCollectible, isGoldenTrinketType, isPickup, isPlayerAbleToAim, isSecretRoomType, isVector, itemConfig, K_COLORS, logDamageFlags, mapDeletePlayer, mapGetPlayer, mapHasPlayer, mapSetPlayer, ModCallbackCustom, ModFeature, PlayerIndex, PocketItemType, removeFlag, sfxManager, spawnEffect, spawnTrinket, VectorZero } from "isaacscript-common";
import { ModEnums } from "../ModEnums";
import { Utils } from "../misc/Utils";
import { InnateItems } from "../misc/InnateItems";
import { CallbackPostPlayerRenderAbove } from "../misc/AdditionalCallbacks";

// #region Consts

const NeedHold = 60 * 1;
const HoldingThreshold = 10;
const MomentuumSkillsRadius = 80;
const MomentuumSkillsRadiusSq = MomentuumSkillsRadius * MomentuumSkillsRadius;
// const MomentuumDefaultInvincibility = 60 * 1.5;
const MomentummConsumedStatsValues = new Map<CacheFlag, float>([
    [CacheFlag.DAMAGE, 0.5],
    [CacheFlag.FIRE_DELAY, 0.5],
    [CacheFlag.SHOT_SPEED, 0.2],
    [CacheFlag.RANGE, 60],
    [CacheFlag.SPEED, 0.2],
    [CacheFlag.LUCK, 1]
]);
const FamiliarCooldown = 22;
const DirectionToAnim = {
    [Direction.NO_DIRECTION]: "Down",
    [Direction.UP]: "Up",
    [Direction.DOWN]: "Down",
    [Direction.LEFT]: "Side",
    [Direction.RIGHT]: "Side"
}

// #region Momenttum skills

class MomentuumSkill<T> {
    target: Map<PlayerIndex, T>;
    _findNearestTarget: (player: EntityPlayer) => T;
    _useSkill: (player: EntityPlayer, target: T) => void;
    _getChargeCost: (player: EntityPlayer, target: T) => int;
    name: string | undefined;

    constructor(findNearestTarget: (player: EntityPlayer) => T,
                useSkill: (player: EntityPlayer, target: T) => void,
                getChargeCost: (player: EntityPlayer, target: T) => int) {
        this.target = new Map();
        this._findNearestTarget = findNearestTarget;
        this._useSkill = useSkill;
        this._getChargeCost = getChargeCost;
    }

    update(player: EntityPlayer) {
        let trg = this._findNearestTarget(player);
        if (!trg) mapDeletePlayer(this.target, player);
        else mapSetPlayer(this.target, player, trg);
    }

    canUseSkill(player: EntityPlayer): boolean {
        let chargeCost = this.getChargeCost(player);
        let playerCharges = defaultMapGetPlayer(v.run.MomentuumCharges, player);
        return mapHasPlayer(this.target, player) &&
            (playerCharges + player.GetSoulCharge() >= chargeCost || playerCharges + player.GetBloodCharge() >= chargeCost);
    }

    getTarget(player: EntityPlayer): T | undefined {
        return mapGetPlayer(this.target, player);
    }

    getChargeCost(player: EntityPlayer): int {
        let trg = mapGetPlayer(this.target, player);
        return !trg ? 0 : this._getChargeCost(player, trg);
    }

    useSkill(player: EntityPlayer) {
        let trg = mapGetPlayer(this.target, player);
        if (trg) this._useSkill(player, trg);
    }

    setName(name: string): MomentuumSkill<T> {
        this.name = name;
        return this;
    }
}

function getMaxMomentuumCharges(player: EntityPlayer) {
    if (player.GetPlayerType() == ModEnums.PLAYER_DREAM && player.HasCollectible(CollectibleType.BIRTHRIGHT) || player.HasCollectible(CollectibleType.BATTERY)) return 24;
    return 12;
}
export function addMomentuumCharges(player: EntityPlayer, charges: int) {
    let maxCharges = getMaxMomentuumCharges(player);
    let newCharges = clamp(defaultMapGetPlayer(v.run.MomentuumCharges, player) + charges, 0, maxCharges);
    mapSetPlayer(v.run.MomentuumCharges, player, newCharges);
}

function getMomentuumCardFromRegular(card: CardType): CardType | undefined {
    if (inRange(card, CardType.REVERSE_FOOL, CardType.REVERSE_WORLD)) card += CardType.FOOL - CardType.REVERSE_FOOL;
    if (CardType.FOOL > card || card > CardType.WORLD) return undefined;
    let startMomentuumCard = Isaac.GetCardIdByName("momentuum_fool");
    let momentuumCardType = card + startMomentuumCard - CardType.FOOL;
    return momentuumCardType;
}

function canCardBecomeMomentuumCard(card: CardType) : boolean {
    return inRange(card, CardType.FOOL, CardType.WORLD) || inRange(card, CardType.REVERSE_FOOL, CardType.REVERSE_WORLD);
}

type TargetEntity = Entity | undefined;
type TargetGridEntity = GridEntity | undefined;
type TargetDoorSlot = {doorSlot: DoorSlot, Position: Vector} | undefined;
type TargetInt = int | undefined;
type TargetEmpty = object | undefined;
const MomentuumSkills: MomentuumSkill<any>[] = [
    // new MomentuumSkill<>(
    //     (player) => {
    //         return undefined;
    //     },
    //     (player, target) => {

    //     },
    //     (player, target) => {
    //         return 0;
    //     }
    // ).setName(""),
    new MomentuumSkill<TargetEntity>(
        (player) => {
            let collectibles = getEntities(EntityType.PICKUP, PickupVariant.COLLECTIBLE)
                .filter(ent => player.Position.DistanceSquared(ent.Position) <= MomentuumSkillsRadiusSq && ent.SubType != CollectibleType.NULL)
                .toSorted((a, b) => player.Position.DistanceSquared(a.Position) - player.Position.DistanceSquared(b.Position));
            return collectibles[0]?.ToPickup();
        },
        (player, target) => {
            let pickup = target?.ToPickup(); if (!pickup) return;
            let pool = getRoomItemPoolType();
            let item = game.GetItemPool().GetCollectible(pool, true, game.GetRoom().GetAwardSeed());
            pickup.Morph(EntityType.PICKUP, PickupVariant.COLLECTIBLE, item, true);
            spawnEffect(EffectVariant.POOF_1, 0, pickup.Position);
        },
        () => 4
    ).setName("Reroll"),
    new MomentuumSkill<TargetEntity>(
        (player) => {
            let collectibles = getEntities(EntityType.PICKUP, PickupVariant.COLLECTIBLE)
                .filter(ent => player.Position.DistanceSquared(ent.Position) <= MomentuumSkillsRadiusSq && ent.SubType != CollectibleType.NULL)
                .toSorted((a, b) => player.Position.DistanceSquared(a.Position) - player.Position.DistanceSquared(b.Position));
            return collectibles[0]?.ToPickup();
        },
        (player, target) => {
            let pickup = target?.ToPickup(); if (!pickup) return;
            player.AddCollectible(CollectibleType.TMTRAINER);
            pickup.Morph(EntityType.PICKUP, PickupVariant.COLLECTIBLE, CollectibleType.SAD_ONION, true);
            player.RemoveCollectible(CollectibleType.TMTRAINER);
            spawnEffect(EffectVariant.POOF_1, 0, pickup.Position);
        },
        () => 3
    ).setName("Glitch"),
    new MomentuumSkill<TargetEntity>(
        (player) => {
            let collectibles = getEntities(EntityType.PICKUP, PickupVariant.COLLECTIBLE)
                .filter(ent => player.Position.DistanceSquared(ent.Position) <= MomentuumSkillsRadiusSq && ent.SubType != CollectibleType.NULL && ent.ToPickup()?.Price == 0)
                .toSorted((a, b) => player.Position.DistanceSquared(a.Position) - player.Position.DistanceSquared(b.Position));
            return collectibles[0]?.ToPickup();
        },
        (player, target) => {
            let pickup = target?.ToPickup(); if (!pickup) return;
            let possibleStats = [...MomentummConsumedStatsValues.keys()];
            let statsGained = []
            for (let i = 0; i < 2; i++) {
                let stat = getRandomArrayElementAndRemove(possibleStats, player.GetCollectibleRNG(ModEnums.COLLECTIBLE_MOMENTUUM));
                statsGained.push(stat);
                if (possibleStats.length == 0) break;
            }
            let momentuumStats = defaultMapGetPlayer(v.run.MomentuumConsumedStats, player);
            statsGained.forEach(stat => momentuumStats.set(stat, momentuumStats.getAndSetDefault(stat) + 1));
            mapSetPlayer(v.run.MomentuumConsumedStats, player, momentuumStats);
            pickup.Remove();
            spawnEffect(EffectVariant.POOF_1, 0, pickup.Position);
        },
        () => 3
    ).setName("Consume"),
    new MomentuumSkill<TargetEntity>(
        (player) => {
            let collectibles = getEntities(EntityType.PICKUP, PickupVariant.COLLECTIBLE)
                .map(ent => ent.ToPickup()).filter(pickup => pickup != undefined)
                .filter(pickup => player.Position.DistanceSquared(pickup.Position) <= MomentuumSkillsRadiusSq && !isGlitchedCollectible(pickup) &&
                    pickup.SubType != CollectibleType.NULL && itemConfig.GetCollectible(pickup.SubType)?.Type == ItemType.PASSIVE)
                .toSorted((a, b) => player.Position.DistanceSquared(a.Position) - player.Position.DistanceSquared(b.Position));
            return collectibles[0];
        },
        (player, target) => {
            let pickup = target?.ToPickup(); if (!pickup) return;
            player.AddItemWisp(pickup.SubType, player.Position);
        },
        () => 4
    ).setName("Copy"),
    new MomentuumSkill<TargetEntity | TargetEmpty>(
        (player) => {
            if (defaultMapGetPlayer(v.run.MomentuumCharges, player) == getMaxMomentuumCharges(player)) return undefined;
            let collectibles = getEntities(EntityType.PICKUP, PickupVariant.COLLECTIBLE)
                .filter(ent => player.Position.DistanceSquared(ent.Position) <= MomentuumSkillsRadiusSq && ent.SubType != CollectibleType.NULL && ent.ToPickup()?.Price == 0)
                .toSorted((a, b) => player.Position.DistanceSquared(a.Position) - player.Position.DistanceSquared(b.Position));
            if (collectibles.length > 0) return collectibles[0]?.ToPickup();
            else if (player.HasCollectible(CollectibleType.SHARP_PLUG)) return {};
            return undefined;
        },
        (player, target) => {
            if (isPickup(target)) {
                let pickup = target;
                let charges = 0;
                if (pickup.SubType == ModEnums.COLLECTIBLE_MOMENTUUM) charges = 12
                else if ([CollectibleType.DATAMINER, CollectibleType.TMTRAINER].includes(pickup.SubType)) charges = getRandomInt(1, getMaxMomentuumCharges(player), pickup.DropSeed);
                else charges = 2 + (itemConfig.GetCollectible(pickup.SubType)?.Quality ?? 0) * 2;
                addMomentuumCharges(player, charges);
                pickup.Remove();
                spawnEffect(EffectVariant.POOF_1, 0, pickup.Position);
            } else if (typeof target == "object" && player.HasCollectible(CollectibleType.SHARP_PLUG)) {
                player.TakeDamage(2, addFlag(DamageFlag.RED_HEARTS, DamageFlag.ISSAC_HEART, DamageFlag.INVINCIBLE, DamageFlag.IV_BAG, DamageFlag.NO_MODIFIERS), EntityRef(player), 30);
                addMomentuumCharges(player, 2);
            }
        },
        () => 0
    ).setName("Charge"),
    new MomentuumSkill<TargetEntity>(
        (player) => {
            let collectibles = getEntities(EntityType.PICKUP)
                .filter(ent => player.Position.DistanceSquared(ent.Position) <= MomentuumSkillsRadiusSq && ent.SubType != CollectibleType.NULL && (ent.ToPickup()?.Price ?? 0) > 0)
                .toSorted((a, b) => player.Position.DistanceSquared(a.Position) - player.Position.DistanceSquared(b.Position));
            return collectibles[0]?.ToPickup();
        },
        (player, target) => {
            let pickup = target?.ToPickup(); if (!pickup) return;
            pickup.Price = 0;
        },
        (player, target) => {
            let pickup = target?.ToPickup(); if (!pickup) return 0;
            if (!pickup.Price) return 0;
            let coinsPrice = pickup.Price < 0 ? 15 : pickup.Price;
            return math.ceil(coinsPrice / 7) * 2;
        }
    ).setName("Free"),
    new MomentuumSkill<TargetGridEntity>(
        (player) => {
            if (timeSpentInRoom < 5) return;
            let doors = getDoors()
                .filter(door => player.Position.DistanceSquared(door.Position) <= MomentuumSkillsRadiusSq && !door.IsOpen() && !isSecretRoomType(door.TargetRoomType))
                .toSorted((a, b) => player.Position.DistanceSquared(a.Position) - player.Position.DistanceSquared(b.Position));
            return doors[0];
        },
        (player, target) => {
            let door = target?.ToDoor(); if (!door) return;
            door.SetLocked(false);
            door.Open();
        },
        (player, target) => {
            let door = target?.ToDoor(); if (!door) return 0;
            // Mega Satan, Mother or Beast (photo door)
            if (door.GetVariant() == DoorVariant.LOCKED_KEY_FAMILIAR ||
                door.GetVariant() == DoorVariant.LOCKED_CRACKED && game.GetRoom().GetType() == RoomType.BOSS ||
                door.TargetRoomType == RoomType.SECRET_EXIT && getStage() == LevelStage.DEPTHS_2) return 24;
            // Boss challenge, cube room, bedroom or vault
            else if (door.TargetRoomType == RoomType.CHALLENGE && game.GetLevel().HasBossChallenge() || [DoorVariant.LOCKED_DOUBLE, DoorVariant.LOCKED_CRACKED].includes(door.GetVariant())) return 3;
            // Shop, treasure, library, planetarium or normal challenge
            else if (door.GetVariant() == DoorVariant.LOCKED || door.TargetRoomType == RoomType.CHALLENGE) return 2;
            // All other - should be blowable and something similar
            return 1;
        }
    ).setName("Open\ndoor"),
    new MomentuumSkill<TargetDoorSlot>(
        (player) => {
            let room = game.GetRoom();
            let roomShape = room.GetRoomShape();
            let doorSlotCoords = [];
            for (let doorSlot = 0; doorSlot <= 7; doorSlot++) {
                let coords = getRoomShapeDoorSlotCoordinates(roomShape, doorSlot); if (!coords) continue;
                let pos = gridCoordinatesToWorldPosition(...coords);
                let door = room.GetDoor(doorSlot);
                if (player.Position.DistanceSquared(pos) <= MomentuumSkillsRadiusSq) {
                    let canBeRedRoom = door == undefined && isDoorSlotValidAtGridIndexForRedRoom(doorSlot, getRoomGridIndex());
                    let closedSecretRoom = door != undefined && !door.IsOpen() && [RoomType.SECRET, RoomType.SUPER_SECRET].includes(door.TargetRoomType);
                    if (canBeRedRoom || closedSecretRoom) doorSlotCoords.push({doorSlot, Position: pos});
                }
            }
            if (doorSlotCoords.length == 0) return undefined;
            return doorSlotCoords.toSorted((a, b) => player.Position.DistanceSquared(a.Position) - player.Position.DistanceSquared(b.Position))[0];
        },
        (player, target) => {
            if (!target?.doorSlot) return;
            let level = game.GetLevel();
            let door = game.GetRoom().GetDoor(target.doorSlot);
            if (door) door.SetLocked(false);
            else level.MakeRedRoomDoor(level.GetCurrentRoomDesc().SafeGridIndex, target.doorSlot);
        },
        () => 4
    ).setName("Open\nwall"),
    new MomentuumSkill<TargetEmpty>(
        (player) => {
            return getPocketItems(player).some(pid => pid.type == PocketItemType.CARD && canCardBecomeMomentuumCard(pid.subType)) ? {} : undefined;
        },
        (player) => {
            getPocketItems(player).forEach(pid => {
                if (pid.type != PocketItemType.CARD) return;
                let momentuumCard = getMomentuumCardFromRegular(pid.subType);
                if (momentuumCard) player.SetCard(pid.slot, momentuumCard);
            });
        },
        () => 4
    ).setName("Card"),
    new MomentuumSkill<TargetEmpty>(
        (player) => {
            return getPocketItems(player).some(pid => pid.type == PocketItemType.PILL && !game.GetItemPool().IsPillIdentified(pid.subType)) ? {} : undefined;
        },
        (player) => {
            getPocketItems(player).forEach(pid => {
                if (pid.type === PocketItemType.PILL) game.GetItemPool().IdentifyPill(pid.subType)
            })
        },
        () => 1
    ).setName("Pill"),
    new MomentuumSkill<TargetEmpty>(
        () => {
            let roomType = game.GetRoom().GetType();
            return [RoomType.ANGEL, RoomType.DEVIL].includes(roomType) && !v.level.MomentuumFixateUsed ? {} : undefined;
        },
        (player) => {
            v.level.MomentuumFixateUsed = true;
            InnateItems.AddItemForLevel(player, CollectibleType.GOAT_HEAD);
        },
        () => 2
    ).setName("Fixate"),
    new MomentuumSkill<TargetEmpty>(
        () => {
            let curses = game.GetLevel().GetCurses();
            return isEmptyFlag(removeFlag(curses, LevelCurse.LABYRINTH)) ? undefined : {};
        },
        () => {
            let level = game.GetLevel();
            let curses = level.GetCurses();
            level.RemoveCurses(removeFlag(curses, LevelCurse.LABYRINTH));
        },
        () => 3
    ).setName("Cleanse"),
    new MomentuumSkill<TargetEmpty>(
        (player) => {
            return getPlayerTrinkets(player).some(trinket => !isGoldenTrinketType(trinket)) ? {} : undefined;
        },
        (player) => {
            getPlayerTrinkets(player).forEach(trinket => {
                player.TryRemoveTrinket(trinket);
                let pos = game.GetRoom().FindFreePickupSpawnPosition(player.Position, 20);
                spawnTrinket(getGoldenTrinketType(trinket), pos);
            });
        },
        () => 3
    ).setName("Gilding"),
    new MomentuumSkill<TargetEmpty>(
        (player) => {
            return !player.IsFlying() ? {} : undefined;
        },
        (player) => {
            player.UseCard(CardType.HANGED_MAN, addFlag(UseFlag.NO_ANIMATION, UseFlag.NO_ANNOUNCER_VOICE));
        },
        () => 2
    ).setName("Fly"),
    new MomentuumSkill<TargetInt>(
        (player) => {
            let emptyHearts = player.GetMaxHearts() - player.GetHearts();
            let charges = defaultMapGetPlayer(v.run.MomentuumCharges, player);
            return emptyHearts != 0 ? math.min(emptyHearts, charges * 2) : undefined;
        },
        (player, target) => {
            player.AddHearts(target ?? 0);
        },
        (player, target) => math.ceil(target ?? 0 / 2)
    ).setName("Heal"),
    new MomentuumSkill<TargetEmpty>(
        () => {
            return {};
        },
        (player) => {
            game.GetRoom().MamaMegaExplosion(player.Position, player);
        },
        () => game.GetRoom().GetType() == RoomType.BOSS ? 8 : 4
    ).setName("Mama\nMega"),
]

// #region Resources and data

// Fonts and sprites to render
const font = Font();
font.Load("font/terminus.fnt");
const ChargeBarSprites = new DefaultMap<PlayerIndex, Sprite>(() => {
    let s = Sprite();
    s.Load("gfx/chargebar.anm2", true);
    return s;
});
const ShieldSprites = new DefaultMap<PlayerIndex, Sprite>(() => {
    let shield = Sprite();
    shield.Load("gfx/items/collectibles/Momentuum_Shield.anm2", true);
    shield.PlaybackSpeed = 0.4;
    shield.Play("Shield", true);
    return shield;
});
const MomentuumChargeSprites = new DefaultMap<PlayerIndex, {base: Sprite, cost: Sprite, empty: Sprite, extra: Sprite, costExtra: Sprite}>(() => {
    let charges = {base: Sprite(), cost: Sprite(), empty: Sprite(), extra: Sprite(), costExtra: Sprite()}
    let path = "gfx/ui/Momentuum_Charges.anm2";
    charges.base.Load(path, true);
    charges.base.Play("Base", true);
    charges.cost.Load(path, true);
    charges.cost.Play("Cost", true);
    charges.empty.Load(path, true);
    charges.empty.Play("Empty", true);
    charges.extra.Load(path, true);
    charges.extra.Play("Extra", true);
    charges.costExtra.Load(path, true);
    charges.costExtra.Play("Extra", true);
    charges.costExtra.Color = Color(1, 1, 1, 0.5);
    return charges;
});

// Data to save
const v = {
    run: {
        MomentuumCharges: new DefaultMap<PlayerIndex, int>(12),
        // index of all MomentuumSkills, not currently available
        MomentuumSkillChoice: new DefaultMap<PlayerIndex, int>(-1),
        MomentuumInvincibility: new DefaultMap<PlayerIndex, int>(0),
        MomentuumConsumedStats: new DefaultMap<PlayerIndex, DefaultMap<CacheFlag, int>>(() => new DefaultMap(0, [...MomentummConsumedStatsValues.keys()].map(cf => [cf, 0])))
    },
    level: {
        MomentuumFixateUsed: false
    }
}
export const MomentuumData = v;

// Additional data
const Holding = new DefaultMap<PlayerIndex, int>(0)
const AvailableMomentuumSkills = new Map<PlayerIndex, int[]>();
let timeSpentInRoom = 0;

// #region Momentuum

export class Momentuum extends ModFeature {
    v = v;

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
    ResetValues() {
        Holding.clear();
        timeSpentInRoom = 0;
    }

    @Callback(ModCallback.POST_USE_ITEM, ModEnums.COLLECTIBLE_MOMENTUUM)
    MomentuumUse(item: CollectibleType, rng: RNG, player: EntityPlayer, useFlags: BitFlags<UseFlag>, activeSlot: int): any {
        if (hasFlag(useFlags, UseFlag.CAR_BATTERY)) return;
        if (!isPlayerAbleToAim(player) && !mapHasPlayer(Holding, player)) {
            sfxManager.Stop(SoundEffect.ITEM_RAISE);
            return {Discharge: false};
        }
        if (!mapHasPlayer(Holding, player)) {
            player.AnimateCollectible(item, PlayerItemAnimation.LIFT_ITEM, CollectibleAnimation.PLAYER_PICKUP)
            defaultMapGetPlayer(Holding, player);
        } else {
            player.AnimateCollectible(item, PlayerItemAnimation.HIDE_ITEM, CollectibleAnimation.PLAYER_PICKUP)
            mapDeletePlayer(Holding, player);
        }
        return;
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
    MomentuumHolding(player: EntityPlayer) {
        let holding = mapGetPlayer(Holding, player);
        if (holding && Input.IsActionPressed(ButtonAction.ITEM, player.ControllerIndex) && player.GetActiveItem(ActiveSlot.PRIMARY) == ModEnums.COLLECTIBLE_MOMENTUUM) {
            mapSetPlayer(Holding, player, math.min(holding + 1, NeedHold));
            if (mapGetPlayer(Holding, player) == NeedHold) {
                player.UseActiveItem(ModEnums.COLLECTIBLE_MOMENTUUM, UseFlag.NO_ANIMATION);
                this.UseMomentuumSkill(player);
            }
        } else if (holding && holding > 0) mapSetPlayer(Holding, player, 0);
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_LEVEL_REORDERED)
    RegainMomentuumCharges() {
        getPlayers().forEach(player => {
            if (!player.HasCollectible(ModEnums.COLLECTIBLE_MOMENTUUM)) return;
            let charges = 6 + player.GetCollectibleNum(CollectibleType.NINE_VOLT);
            addMomentuumCharges(player, charges);
        });
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
    UpdateAvailableMomentuumSkillsAndChoice(player: EntityPlayer) {
        if (player.HasCollectible(ModEnums.COLLECTIBLE_MOMENTUUM)) {
            // Player holding - don't change skills
            let hold = mapGetPlayer(Holding, player) ?? 0;
            if (hold > HoldingThreshold) return;
            // Collect skills that can be used
            let newAvailableMomentuumSkills = [];
            for (let i = 0; i < MomentuumSkills.length; i++) {
                MomentuumSkills[i]?.update(player);
                if (MomentuumSkills[i]?.canUseSkill(player)) newAvailableMomentuumSkills.push(i);
            }
            let skillChoice = defaultMapGetPlayer(v.run.MomentuumSkillChoice, player);
            if (!arrayEquals(mapGetPlayer(AvailableMomentuumSkills, player) ?? [], newAvailableMomentuumSkills)) {
                mapSetPlayer(AvailableMomentuumSkills, player, newAvailableMomentuumSkills);
                skillChoice = newAvailableMomentuumSkills[0] ?? -1;
            }
            // Change skill choice, if current is unavailable or player pressed ButtonAction.DROP
            if (Input.IsActionTriggered(ButtonAction.DROP, player.ControllerIndex)) {
                let skillChoiceAvailableInd = newAvailableMomentuumSkills.indexOf(skillChoice); // not found = -1
                if (newAvailableMomentuumSkills.length > 0) skillChoice = newAvailableMomentuumSkills[(skillChoiceAvailableInd + 1) % newAvailableMomentuumSkills.length] ?? -1;
            }
            mapSetPlayer(v.run.MomentuumSkillChoice, player, skillChoice);
        } else if (!player.HasCollectible(ModEnums.COLLECTIBLE_MOMENTUUM) && mapHasPlayer(AvailableMomentuumSkills, player)) {
            mapDeletePlayer(AvailableMomentuumSkills, player);
            mapDeletePlayer(v.run.MomentuumSkillChoice, player);
        }
    }

    // Use current Momentuum skill, if can
    UseMomentuumSkill(player: EntityPlayer) {
        let skill = MomentuumSkills[defaultMapGetPlayer(v.run.MomentuumSkillChoice, player)];
        if (!skill) return;
        let chargeCost = skill.getChargeCost(player);
        let playerCharges = defaultMapGetPlayer(v.run.MomentuumCharges, player);
        if (chargeCost <= playerCharges) {
            skill.useSkill(player);
            addMomentuumCharges(player, -chargeCost);
        } else if (chargeCost + player.GetSoulCharge() <= playerCharges) {
            skill.useSkill(player);
            mapSetPlayer(v.run.MomentuumCharges, player, 0);
            player.AddSoulCharge(playerCharges - chargeCost);
        } else if (chargeCost + player.GetBloodCharge() <= playerCharges) {
            skill.useSkill(player);
            mapSetPlayer(v.run.MomentuumCharges, player, 0);
            player.AddBloodCharge(playerCharges - chargeCost);
        }
    }

    @Callback(ModCallback.ENTITY_TAKE_DMG, EntityType.PLAYER)
    OnTakeDamage(entity: Entity, amount: float, damageFlags: BitFlags<DamageFlag>, source: EntityRef, countdownFrames: int): boolean | undefined {
        let player = entity.ToPlayer(); if (!player) return;
        if (amount == 0 || player.IsInvincible()) return;
        if (mapHasPlayer(v.run.MomentuumInvincibility, player)) return false;
        let holding = mapGetPlayer(Holding, player);
        mapDeletePlayer(Holding, player);
        if (holding && holding <= HoldingThreshold) {
            if (defaultMapGetPlayer(v.run.MomentuumCharges, player) > 0) {
                addMomentuumCharges(player, -1);
                // mapSetPlayer(v.run.MomentuumInvincibility, player, MomentuumDefaultInvincibility);
                player.UseActiveItem(CollectibleType.DULL_RAZOR, UseFlag.NO_ANIMATION);
                sfxManager.Stop(SoundEffect.DULL_RAZOR);
                sfxManager.Stop(SoundEffect.ISAAC_HURT_GRUNT);
                player.AnimateCollectible(ModEnums.COLLECTIBLE_MOMENTUUM, PlayerItemAnimation.HIDE_ITEM, CollectibleAnimation.PLAYER_PICKUP);
                return false;
            }
        }
        return;
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
    MomentuumTickInvincibility(player: EntityPlayer) {
        if (mapHasPlayer(v.run.MomentuumInvincibility, player)) {
            let val = defaultMapGetPlayer(v.run.MomentuumInvincibility, player);
            if (--val <= 0) mapDeletePlayer(v.run.MomentuumInvincibility, player);
            else mapSetPlayer(v.run.MomentuumInvincibility, player, val);
        }
    }

    @Callback(ModCallback.EVALUATE_CACHE)
    MomentuumAddConsumedStats(player: EntityPlayer, cacheFlag: CacheFlag) {
        if (!player.HasCollectible(ModEnums.COLLECTIBLE_MOMENTUUM) || !mapHasPlayer(v.run.MomentuumConsumedStats, player) || !MomentummConsumedStatsValues.has(cacheFlag)) return;
        let stats = defaultMapGetPlayer(v.run.MomentuumConsumedStats, player);
        let statMult = stats.getAndSetDefault(cacheFlag);
        let statValue = MomentummConsumedStatsValues.get(cacheFlag) ?? 0;
        addPlayerStat(player, cacheFlag, statMult * statValue);
    }

    @Callback(ModCallback.POST_UPDATE)
    PostUpdate() {
        timeSpentInRoom += 1;
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_COLLECTIBLE_ADDED, CollectibleType.NINE_VOLT)
    OnGetNineVolt(player: EntityPlayer) {
        addMomentuumCharges(player, 12);
    }

    // #region Familiar

    @Callback(ModCallback.EVALUATE_CACHE, CacheFlag.FAMILIARS)
    CacheFamiliar(player: EntityPlayer) {
        let targetCount = 0;
        if (player.HasCollectible(ModEnums.COLLECTIBLE_MOMENTUUM)) targetCount = !mapHasPlayer(Holding, player) && defaultMapGetPlayer(v.run.MomentuumCharges, player) > 0 ? 1 : 0;
        checkFamiliar(player, ModEnums.COLLECTIBLE_MOMENTUUM, targetCount, ModEnums.FAMILIAR_MOMENTUUM);
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_COLLECTIBLE_ADDED, ModEnums.COLLECTIBLE_MOMENTUUM)
    SpawnFamiliarOnGettingMomentuum(player: EntityPlayer) {
        player.AddCacheFlags(CacheFlag.FAMILIARS);
        player.EvaluateItems();
    }

    @Callback(ModCallback.POST_FAMILIAR_INIT, ModEnums.FAMILIAR_MOMENTUUM)
    FamiliarInit(familiar: EntityFamiliar) {
        familiar.AddToOrbit(0);
        familiar.FireCooldown = FamiliarCooldown / (familiar.Player.HasTrinket(TrinketType.FORGOTTEN_LULLABY) ? 2 : 1);
    }

    @Callback(ModCallback.POST_FAMILIAR_UPDATE, ModEnums.FAMILIAR_MOMENTUUM)
    FamiliarUpdate(familiar: EntityFamiliar) {
        let player = familiar.Player;
        familiar.OrbitDistance = Vector(30, 25);
        familiar.Velocity = familiar.GetOrbitPosition(player.Position.add(player.Velocity)).sub(familiar.Position);
        let fireDirection = familiar.Player.GetFireDirection();
        let fireDegrees = directionToDegrees(fireDirection);
        let anim = "Float";
        if (familiar.FireCooldown <= 0 && fireDirection != Direction.NO_DIRECTION) {
            let damageMult = defaultMapGetPlayer(v.run.MomentuumCharges, player) / 12 * (player.HasCollectible(CollectibleType.BFFS) ? 1.5 : 1);
            let laser = EntityLaser.ShootAngle(LaserVariant.THIN_RED, familiar.Position.add(Vector(0, -20)), fireDegrees, 3, VectorZero, familiar);
            laser.Parent = undefined;
            laser.CollisionDamage = player.Damage * damageMult;
            laser.SetColor(Color(1, 1, 1, 1, 1, .5, 0), -1, 100);
            familiar.FireCooldown = FamiliarCooldown / (player.HasTrinket(TrinketType.FORGOTTEN_LULLABY) ? 2 : 1);
            anim = "FloatShoot";
        }
        familiar.FireCooldown = math.max(familiar.FireCooldown - 1, 0);
        let sprite = familiar.GetSprite();
        let dir = fireDirection == Direction.NO_DIRECTION ? player.GetMovementDirection() : fireDirection;
        let animName = anim + DirectionToAnim[dir];
        if (!sprite.GetAnimation().startsWith("FloatShoot") || sprite.IsFinished()) {
            sprite.Play(animName, false);
            if (dir != Direction.NO_DIRECTION) sprite.FlipX = dir == Direction.LEFT;
        }
    }

    @Callback(ModCallback.PRE_FAMILIAR_COLLISION, ModEnums.FAMILIAR_MOMENTUUM)
    FamiliarDestroyProjectiles(familiar: EntityFamiliar, collider: Entity, low: boolean): boolean | undefined {
        if (collider.ToProjectile()) collider.Die();
        return;
    }

    // #region Render UI

    @CallbackPostPlayerRenderAbove()
    Test(player: EntityPlayer) {
        if (!player.HasCollectible(ModEnums.COLLECTIBLE_MOMENTUUM) || !player.IsVisible()) return;
        if (game.GetHUD().IsVisible()) {
            this.RenderMomentuuumCharges(player);
            this.RenderMomentuumSkills(player);
            this.RenderMomentuuumSkillTarget(player);
            this.RenderMomentuumHolding(player);
        }
        this.RenderMomentuumShield(player);
    }

    RenderMomentuuumCharges(player: EntityPlayer) {
        // let posText = Utils.worldToMirrorScreen(player.Position).add(Vector(-20, -40));
        // font.DrawString(defaultMapGetPlayer(v.run.MomentuumCharges, player).toString(), posText.X, posText.Y, K_COLORS.White, 40, true);
        let pos = Utils.worldToMirrorScreen(player.Position).add(Vector(0, 10));
        let chargeSprites = defaultMapGetPlayer(MomentuumChargeSprites, player);
        chargeSprites.base.Render(pos);
        let skill = MomentuumSkills[defaultMapGetPlayer(v.run.MomentuumSkillChoice, player)];
        let charges = defaultMapGetPlayer(v.run.MomentuumCharges, player);
        let extraCharges = math.max(charges - 12, 0);
        let empty = math.max(12 - charges, 0);
        let cost = skill?.getChargeCost(player) ?? 0;
        let costLower12 = clamp(12 - charges + cost, 0, cost);
        let costBigger12 = clamp(charges - 12, 0, cost);
        if (costBigger12 > 0) {
            chargeSprites.costExtra.SetFrame(extraCharges - 1);
            chargeSprites.costExtra.Render(pos);
        }
        if (extraCharges - costBigger12 > 0) {
            chargeSprites.extra.SetFrame(extraCharges - costBigger12 - 1);
            chargeSprites.extra.Render(pos);
        }
        if (costLower12 > 0) {
            chargeSprites.cost.SetFrame(empty + costLower12 - 1);
            chargeSprites.cost.Render(pos);
        }
        if (empty > 0) {
            chargeSprites.empty.SetFrame(empty - 1);
            chargeSprites.empty.Render(pos);
        }
    }

    RenderMomentuumSkills(player: EntityPlayer) {
        let skills = mapGetPlayer(AvailableMomentuumSkills, player);
        if (!skills || skills.length == 0) return;
        let scale = 0.5;
        let skillsRenderOffset = Vector(30, 0), xStartOffset = skillsRenderOffset.X * (skills.length - 1) / 2;
        let pos = Utils.worldToMirrorScreen(player.Position).add(Vector(-20 - xStartOffset, 20));
        skills.forEach(skillInd => {
            let posMirror = pos;
            font.DrawStringScaled(MomentuumSkills[skillInd]?.name ?? "-", posMirror.X, posMirror.Y, scale, scale, K_COLORS.White, 40, true);
            if (skillInd == mapGetPlayer(v.run.MomentuumSkillChoice, player)) font.DrawString("^", posMirror.X, posMirror.Y + 10, K_COLORS.White, 40, true);
            font.DrawStringScaled(MomentuumSkills[skillInd]?.getChargeCost(player).toString() ?? "-", posMirror.X, posMirror.Y + 25, scale, scale, K_COLORS.White, 40, true);
            pos = pos.add(skillsRenderOffset);
        });
    }

    RenderMomentuuumSkillTarget(player: EntityPlayer) {
        let target, targetMap = MomentuumSkills[defaultMapGetPlayer(v.run.MomentuumSkillChoice, player)]?.target;
        if (targetMap) target = mapGetPlayer(targetMap, player);
        if (!target) return;
        if (isVector(target.Position)) {
            let pos = Utils.worldToMirrorScreen(target.Position).add(Vector(-20, -40));
            font.DrawString("V", pos.X, pos.Y, K_COLORS.White, 40, true);
        }
    }

    RenderMomentuumHolding(player: EntityPlayer) {
        if (!player.HasCollectible(ModEnums.COLLECTIBLE_MOMENTUUM)) return;
        let hold = mapGetPlayer(Holding, player) ?? 0;
        let bar = defaultMapGetPlayer(ChargeBarSprites, player);
        if (hold > HoldingThreshold) {
            let perc = math.floor(100 * hold / NeedHold);
            if (perc < 100) bar.SetFrame("Charging", perc);
        } else if (bar.GetAnimation() == "Charging" && !bar.IsFinished("Disappear")) bar.Play("Disappear", true);
        bar.Render(Utils.worldToMirrorScreen(player.Position).add(Vector(20, -30)));
        bar.Update();
    }

    RenderMomentuumShield(player: EntityPlayer) {
        if (!player.HasCollectible(ModEnums.COLLECTIBLE_MOMENTUUM)) return;
        let shoudRenderShield = mapHasPlayer(Holding, player) && mapGetPlayer(Holding, player) == 0 && defaultMapGetPlayer(v.run.MomentuumCharges, player) > 0;
        let shield = defaultMapGetPlayer(ShieldSprites, player);
        if (shoudRenderShield) shield.Render(Utils.worldToMirrorScreen(player.Position));
        shield.Update();
    }
}