import { CacheFlag, CardType, CollectibleType, EntityFlag, EntityType, ModCallback, UseFlag, PlayerItemAnimation, SoundEffect, GridRoom, PickupVariant, RoomType, DisplayFlag, RoomDescriptorFlag, GeminiVariant, BeastVariant, DingleVariant, GurglingVariant, ItemPoolType, TrinketType, GridEntityType, PoopGridEntityVariant, PlayerType, DamageFlagZero, FireplaceVariant, PickupPrice } from "isaac-typescript-definitions";
import { addFlag, anyPlayerHasCollectible, bitFlags, Callback, CallbackCustom, COLORS, DefaultMap, defaultMapGetPlayer, game, getEntities, getGridEntities, getPlayers, getRandomArrayElement, getRandomInt, getRoomData, getRoomDescriptorReadOnly, getRoomGridIndex, getRooms, getUnusedDoorSlots, hasFlag, inRoomType, isRoomType, itemConfig, mapDeletePlayer, mapHasPlayer, mapSetPlayer, ModCallbackCustom, ModFeature, repeat, sfxManager, smeltTrinket, spawn, spawnCollectible, spawnCollectibleFromPool, spawnNPC, spawnPickup, teleport, type PlayerIndex } from "isaacscript-common";
import { ModEnums } from "../ModEnums";
import { Utils } from "../misc/Utils";
import { InnateItems } from "../misc/InnateItems";

const v = {
    run: {
        Fool: false,
        FoolRoomTime: 0,
        Priestess: false,
        Empress: new DefaultMap<PlayerIndex, int>(0),
        Emperor: new Array<EntityType>(),
        Hermit: false,
        WheelOfFortune: new DefaultMap<PlayerIndex, {remainingUses: int, passedSinceLastUse: int}>(() => { return {remainingUses: 0, passedSinceLastUse: 0}; }),
        Devil: false,
        Moon: false
    },
    level: {
        Chariot: new Map<PlayerIndex, boolean>(),
        World: false
    },
    room: {
        Stars: false
    }
}

const ActiveItems = Utils.getAllActiveItems();

function MomentuumPriestess() {
    v.run.Priestess = false;
    if (inRoomType(RoomType.ANGEL)) {
        let room = game.GetRoom();
        let times = anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) ? 2 : 1
        repeat(times, () => {
            spawnCollectibleFromPool(ItemPoolType.ANGEL, room.FindFreePickupSpawnPosition(room.GetRandomPosition(10)), Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_PRIESTESS))
        });
    }
}
function MomentuumDevil() {
    v.run.Devil = false;
    if (inRoomType(RoomType.DEVIL)) {
        let room = game.GetRoom();
        let times = anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) ? 4 : 2
        repeat(times, () => {
            let entityPickup = spawnCollectibleFromPool(ItemPoolType.DEVIL, room.FindFreePickupSpawnPosition(room.GetRandomPosition(10)), Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_PRIESTESS))
            entityPickup.ShopItemId = -2;
            entityPickup.Price = itemConfig.GetCollectible(entityPickup.SubType)?.DevilPrice ?? PickupPrice.TWO_HEARTS;
            entityPickup.AutoUpdatePrice = true;
        });
    }
}

export class MomentuumCards extends ModFeature {
    v = v;

    @Callback(ModCallback.EVALUATE_CACHE)
    EvaluateCache(player: EntityPlayer, cacheFlag: CacheFlag) {
        if (mapHasPlayer(v.run.Empress, player)) {
            if (cacheFlag == CacheFlag.DAMAGE) player.Damage *= 1 + (defaultMapGetPlayer(v.run.Empress, player) * 0.1);
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
    ResetValues() {
        v.run.WheelOfFortune.clear();
    }

    @Callback(ModCallback.POST_USE_CARD)
    UseMomentuumCard(cardType: CardType, player: EntityPlayer, useFlags: BitFlags<UseFlag>) {
        let rng = player.GetCardRNG(cardType);
        let hasTarotCloth = player.HasCollectible(CollectibleType.TAROT_CLOTH);
        if (hasFlag(useFlags, UseFlag.CAR_BATTERY)) return;
        let entity: Entity;
        switch (cardType) {
            case ModEnums.CARD_MOMENTUUM_FOOL:
                v.run.Fool = true;
                break
            case ModEnums.CARD_MOMENTUUM_MAGICIAN:
                for (let i = 0; i < 10; i++) {
                    if (getRandomInt(1, 10, rng) == 1) player.UseActiveItem(CollectibleType.LEMEGETON, UseFlag.NO_ANIMATION);
                    else player.AddWisp(getRandomArrayElement(ActiveItems, rng), player.Position);
                }
                break;
            case ModEnums.CARD_MOMENTUUM_PRIESTESS:
                v.run.Priestess = true;
                game.GetLevel().InitializeDevilAngelRoom(true, false);
                if (getRoomGridIndex() == GridRoom.DEVIL) MomentuumPriestess();
                else teleport(GridRoom.DEVIL);
                break;
            case ModEnums.CARD_MOMENTUUM_EMPRESS:
                if (player.GetPlayerType() == PlayerType.BETHANY && player.GetBoneHearts() == 0) {
                    game.GetHUD().ShowItemText("Bro why...");
                    break;
                }
                let hearts = player.GetMaxHearts();
                player.AddMaxHearts(-hearts, true);
                player.AddBrokenHearts(hearts / 2);
                if (player.GetBoneHearts() + player.GetSoulHearts() == 0) player.AddBlackHearts(2);
                Utils.defaultMapSetPlayerPred(v.run.Empress, player, n => n + hearts);
                break;
            case ModEnums.CARD_MOMENTUUM_EMPEROR:
                const possibleBosses = [[EntityType.DINGLE], [EntityType.DINGLE, DingleVariant.DANGLE], [EntityType.DUKE_OF_FLIES], [EntityType.GEMINI], [EntityType.GEMINI, GeminiVariant.STEVEN],
                    [EntityType.LARRY_JR], [EntityType.MONSTRO], [EntityType.GURGLING, GurglingVariant.GURGLING, EntityType.GURGLING], [EntityType.GURGLING, GurglingVariant.TURDLING, EntityType.GURGLING],
                    [EntityType.FAMINE], [EntityType.FALLEN], [EntityType.HEADLESS_HORSEMAN, 0, EntityType.HORSEMAN_HEAD], [EntityType.LITTLE_HORN], [EntityType.RAG_MAN], [EntityType.BABY_PLUM]];
                let boss = getRandomArrayElement(possibleBosses, rng);
                let bossTypes = [boss[0] as EntityType];
                if (boss.length > 2) bossTypes.push(boss[2] as EntityType);
                let bossVariant = boss[1] ?? 0;
                for (let bossType of bossTypes) {
                    let boss = spawnNPC(bossType as EntityType, bossVariant, 0, player.Position);
                    boss.HitPoints = 48 + (hasTarotCloth ? 24 : 0);
                    boss.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY, EntityFlag.PERSISTENT));
                    if (hasTarotCloth) boss.MakeChampion(boss.InitSeed);
                }
                v.run.Emperor.push(boss[0] as EntityType);
                break;
            case ModEnums.CARD_MOMENTUUM_HIEROPHANT: break;
            case ModEnums.CARD_MOMENTUUM_LOVERS:
                getEntities().forEach(entity => {
                    if (entity.IsVulnerableEnemy() && !entity.IsBoss()) {
                        entity.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY, EntityFlag.PERSISTENT));
                        if (hasTarotCloth && getRandomInt(1, 2, rng) == 1) entity.ToNPC()?.MakeChampion(entity.InitSeed);
                    }
                });
                break;
            case ModEnums.CARD_MOMENTUUM_CHARIOT:
                mapSetPlayer(v.level.Chariot, player, true);
                player.UseActiveItem(CollectibleType.DARK_ARTS);
                break;
            case ModEnums.CARD_MOMENTUUM_JUSTICE: break;
            case ModEnums.CARD_MOMENTUUM_HERMIT:
                v.run.Hermit = true;
                player.AddCoins(99);
                break;
            case ModEnums.CARD_MOMENTUUM_WHEEL:
                let metronomUsesMult = hasTarotCloth ? 2 : 1;
                mapSetPlayer(v.run.WheelOfFortune, player, {remainingUses: getRandomInt(6 * metronomUsesMult, 12 * metronomUsesMult, rng), passedSinceLastUse: 0});
                player.AnimateCollectible(CollectibleType.METRONOME, PlayerItemAnimation.USE_ITEM);
                break;
            case ModEnums.CARD_MOMENTUUM_STRENGTH:
                player.UseActiveItem(CollectibleType.MEGA_MUSH);
                if (hasTarotCloth) player.UseActiveItem(CollectibleType.MEGA_MUSH);
                break;
            case ModEnums.CARD_MOMENTUUM_HANGED: break;
            case ModEnums.CARD_MOMENTUUM_DEATH:
                entity = spawnNPC(EntityType.BEAST, BeastVariant.ULTRA_DEATH, 0, game.GetRoom().GetCenterPos());
                entity.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY));
                sfxManager.Play(SoundEffect.SATAN_GROW);
                break;
            case ModEnums.CARD_MOMENTUUM_TEMPERANCE:
                let room = game.GetRoom();
                spawnCollectible(CollectibleType.BREAKFAST, room.FindFreePickupSpawnPosition(player.Position, 20), undefined);
                InnateItems.AddItemForRoom(player, CollectibleType.BINGE_EATER);
                let bingeItems = [CollectibleType.LUNCH, CollectibleType.DINNER, CollectibleType.DESSERT, CollectibleType.BREAKFAST,
                    CollectibleType.ROTTEN_MEAT, CollectibleType.SNACK, CollectibleType.MIDNIGHT_SNACK, CollectibleType.SUPPER];
                getEntities(EntityType.PICKUP, PickupVariant.COLLECTIBLE).forEach(item => {
                    if (bingeItems.includes(item.SubType)) item.ToPickup()?.Morph(EntityType.PICKUP, PickupVariant.COLLECTIBLE, getRandomArrayElement(bingeItems, rng));
                });
                if (hasTarotCloth) spawnCollectible(CollectibleType.APPLE, room.FindFreePickupSpawnPosition(player.Position, 20), undefined);
                break;
            case ModEnums.CARD_MOMENTUUM_DEVIL:
                v.run.Devil = true;
                if (getRoomGridIndex() == GridRoom.DEVIL) game.GetLevel().InitializeDevilAngelRoom(false, true);
                else teleport(GridRoom.DEVIL);
                break;
            case ModEnums.CARD_MOMENTUUM_TOWER: break;
            case ModEnums.CARD_MOMENTUUM_STARS:
                v.room.Stars = true;
                getEntities().forEach(entity => {
                    if (entity.IsVulnerableEnemy() && !entity.IsBoss()) {
                        entity.AddEntityFlags(EntityFlag.ICE);
                        entity.TakeDamage(entity.HitPoints, DamageFlagZero, EntityRef(undefined), 0);
                    }
                    if (entity.Type == EntityType.FIREPLACE && [FireplaceVariant.NORMAL, FireplaceVariant.RED].includes(entity.Variant)) {
                        entity.Remove();
                        spawn(EntityType.FIREPLACE, FireplaceVariant.BLUE, 0, entity.Position);
                    }
                });
                getGridEntities(GridEntityType.ROCK).forEach(gridEnity => {
                    if (getRandomInt(1, 20, rng) == 1) {
                        gridEnity.SetType(GridEntityType.ROCK_TINTED);
                        gridEnity.Init(gridEnity.GetSaveState().SpawnSeed);
                    }
                });
                break;
            case ModEnums.CARD_MOMENTUUM_MOON:
                v.run.Moon = true;
                teleport(GridRoom.ERROR);
                break;
            case ModEnums.CARD_MOMENTUUM_SUN: break;
            case ModEnums.CARD_MOMENTUUM_JUDGEMENT:
                player.UseActiveItem(CollectibleType.DAMOCLES);
                if (hasTarotCloth) smeltTrinket(player, TrinketType.WOODEN_CROSS);
                else player.UseCard(CardType.HOLY, addFlag(UseFlag.NO_ANIMATION, UseFlag.NO_ANNOUNCER_VOICE));
                break;
            case ModEnums.CARD_MOMENTUUM_WORLD:
                v.level.World = true;
                player.AddCollectible(CollectibleType.MIND);
                player.RemoveCollectible(CollectibleType.MIND);
                getRooms().forEach(room => {
                    if (room.Data?.Type == RoomType.ULTRA_SECRET) room.DisplayFlags = bitFlags(DisplayFlag.SHOW_ICON);
                });
                game.GetLevel().UpdateVisibility();
                break;
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
    CardsPlayerUpdate(player: EntityPlayer) {
        if (mapHasPlayer(v.run.WheelOfFortune, player)) {
            let wheelData = defaultMapGetPlayer(v.run.WheelOfFortune, player);
            if (wheelData.remainingUses > 1) {
                if (wheelData.passedSinceLastUse >= 30) {
                    player.UseActiveItem(CollectibleType.METRONOME);
                    wheelData.passedSinceLastUse = 0;
                    wheelData.remainingUses--;
                } else wheelData.passedSinceLastUse++;
                mapSetPlayer(v.run.WheelOfFortune, player, wheelData);
            } else mapDeletePlayer(v.run.WheelOfFortune, player);
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
    CardsNewRoom() {
        v.run.FoolRoomTime = game.TimeCounter;
        if (v.run.Priestess) {
            MomentuumPriestess();
        }
        if (v.level.Chariot.size > 0) {
            getPlayers().forEach(player => {
                if (mapHasPlayer(v.level.Chariot, player)) player.UseActiveItem(CollectibleType.DARK_ARTS);
            });
        }
        if (v.run.Devil) {
            MomentuumDevil();
        }
        if (v.run.Moon) {
            v.run.Moon = false;
            let room = game.GetRoom();
            spawnPickup(PickupVariant.CARD, CardType.FOOL, room.FindFreePickupSpawnPosition(room.GetCenterPos()));
            if (anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH)) {
                let player = Isaac.GetPlayer();
                player.AddCollectible(CollectibleType.TMTRAINER);
                spawnCollectible(CollectibleType.SAD_ONION, room.FindFreePickupSpawnPosition(room.GetCenterPos()), undefined);
                player.RemoveCollectible(CollectibleType.TMTRAINER);
            }
        }
        if (v.level.World) {
            if (anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) && !isRoomType(getRoomData(), RoomType.ERROR, RoomType.DEVIL, RoomType.ANGEL, RoomType.DUNGEON, RoomType.BOSS_RUSH, RoomType.GREED_EXIT, RoomType.ULTRA_SECRET) && !hasFlag(getRoomDescriptorReadOnly().Flags, RoomDescriptorFlag.RED_ROOM)) {
                let level = game.GetLevel();
                let gridIndex = level.GetCurrentRoomDesc().SafeGridIndex;
                for (const doorSlot of getUnusedDoorSlots()) level.MakeRedRoomDoor(gridIndex, doorSlot);
            }
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_LEVEL_REORDERED)
    CardsNewLevel() {
        if (v.run.Fool) {
            v.run.Fool = false;
        }
        if (v.run.Hermit) {
            v.run.Hermit = false;
            let player = Isaac.GetPlayer();
            player.AddCoins(anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) ? -50 : -player.GetNumCoins());
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_ROOM_CLEAR_CHANGED, true)
    CardsRoomCleared() {
        if (v.level.World) {
            if (hasFlag(getRoomDescriptorReadOnly().Flags, RoomDescriptorFlag.RED_ROOM) && getRandomInt(1, 5, Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_WORLD)) == 1) {
                let level = game.GetLevel();
                let gridIndex = level.GetCurrentRoomDesc().SafeGridIndex;
                for (const doorSlot of getUnusedDoorSlots()) level.MakeRedRoomDoor(gridIndex, doorSlot);
            }
        }
    }

    @Callback(ModCallback.POST_UPDATE)
    PostUpdate() {

    }

    @CallbackCustom(ModCallbackCustom.POST_GRID_ENTITY_INIT)
    CardsOnGridEntityInit(gridEntity: GridEntity) {
        if (v.run.Fool) {
            let room = game.GetRoom();
            if (gridEntity.GetType() == GridEntityType.POOP && gridEntity.GetVariant() != PoopGridEntityVariant.RAINBOW && (room.IsFirstVisit() || game.TimeCounter != v.run.FoolRoomTime)) {
                if (getRandomInt(1, 10, Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_FOOL)) <= 8) {
                    gridEntity.SetVariant(PoopGridEntityVariant.RAINBOW);
                    gridEntity.Init(gridEntity.GetSaveState().SpawnSeed);
                }
            }
        }
    }

    @Callback(ModCallback.POST_NPC_INIT)
    CardsPostNpcInit(npc: EntityNPC) {
        if (v.run.Fool) {
            let ref = EntityRef(undefined), duration = 3 * 30, damage = 3.5;
            if (npc.IsVulnerableEnemy()) {
                switch (getRandomInt(1, 8, Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_FOOL))) {
                    case 1: npc.AddBurn(ref, duration, damage); break;
                    case 2: npc.AddCharmed(ref, duration); break;
                    case 3: npc.AddConfusion(ref, duration); break;
                    case 4: npc.AddFear(ref, duration); break;
                    case 5: npc.AddFreeze(ref, duration); break;
                    case 6: npc.AddMidasFreeze(ref, duration); break;
                    case 7: npc.AddPoison(ref, duration, damage); break;
                    case 8: npc.AddShrink(ref, duration); break;
                    case 8: npc.AddSlowing(ref, duration, 0.5, COLORS.White); break;
                }
            }
        }
    }

    @Callback(ModCallback.POST_ENTITY_KILL)
    CardsPostNpcDeath(entity: Entity) {
        if (v.run.Emperor.length > 0) {
            let ind = v.run.Emperor.indexOf(entity.Type);
            if (ind >= 0 && entity.HasEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY, EntityFlag.PERSISTENT))) {
                v.run.Emperor.splice(ind, 1);
                spawnCollectibleFromPool(ItemPoolType.BOSS, game.GetRoom().FindFreePickupSpawnPosition(entity.Position), undefined);
            }
        }
        if (v.room.Stars) {
            if (entity.Type == EntityType.FROZEN_ENEMY && getRandomInt(1, 5, Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_STARS)) == 1)
                spawnPickup(PickupVariant.CARD, 0, entity.Position);
        }
    }
}