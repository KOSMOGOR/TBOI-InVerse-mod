import { CardType, CollectibleType, EntityFlag, EntityType, ModCallback, UseFlag, PlayerItemAnimation, SoundEffect, GridRoom, PickupVariant, RoomType, DisplayFlag, RoomDescriptorFlag, GeminiVariant, BeastVariant, DingleVariant, GurglingVariant, ItemPoolType, TrinketType, GridEntityType, PoopGridEntityVariant } from "isaac-typescript-definitions";
import { addFlag, anyPlayerHasCollectible, bitFlags, Callback, CallbackCustom, COLORS, DefaultMap, defaultMapGetPlayer, game, getEntities, getRandomArrayElement, getRandomArrayElementAndRemove, getRandomInt, getRoomData, getRoomDescriptorReadOnly, getRooms, getUnusedDoorSlots, hasFlag, isRoomType, mapDeletePlayer, mapHasPlayer, mapSetPlayer, ModCallbackCustom, ModFeature, repeat, sfxManager, smeltTrinket, spawnCollectible, spawnCollectibleFromPool, spawnGridEntityWithVariant, spawnNPC, spawnPickup, teleport, type PlayerIndex } from "isaacscript-common";
import { ModEnums } from "../ModEnums";
import { Utils } from "../misc/Utils";
import { InnateItems } from "../misc/InnateItems";

const v = {
    run: {
        Fool: false,
        FoolRoomTime: 0,
        Emperor: new Array<EntityType>(),
        Hermit: false,
        WheelOfFortune: new DefaultMap<PlayerIndex, {remainingUses: int, passedSinceLastUse: int}>(() => { return {remainingUses: 0, passedSinceLastUse: 0}; }),
        Moon: false
    },
    level: {
        World: false
    }
}

const ActiveItems = Utils.getAllActiveItems();

export class MomentuumCards extends ModFeature {
    v = v;

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
            case ModEnums.CARD_MOMENTUUM_PRIESTESS: break;
            case ModEnums.CARD_MOMENTUUM_EMPRESS: break;
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
            case ModEnums.CARD_MOMENTUUM_CHARIOT: break;
            case ModEnums.CARD_MOMENTUUM_JUSTICE: break;
            case ModEnums.CARD_MOMENTUUM_HERMIT:
                player.AddCoins(99);
                v.run.Hermit = true;
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
            case ModEnums.CARD_MOMENTUUM_TEMPERANCE: break;
            case ModEnums.CARD_MOMENTUUM_DEVIL:
                let leviathanItems = [CollectibleType.PENTAGRAM, CollectibleType.MARK, CollectibleType.PACT, CollectibleType.LORD_OF_THE_PIT, CollectibleType.BRIMSTONE,
                    CollectibleType.SPIRIT_OF_THE_NIGHT, CollectibleType.ABADDON, CollectibleType.MAW_OF_THE_VOID, CollectibleType.EYE_OF_THE_OCCULT];
                repeat(3, () => {
                    let item = getRandomArrayElementAndRemove(leviathanItems, rng);
                    InnateItems.AddItemForLevel(player, item);
                });
                break;
            case ModEnums.CARD_MOMENTUUM_TOWER: break;
            case ModEnums.CARD_MOMENTUUM_STARS: break;
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
        if (v.run.Moon) {
            v.run.Moon = false;
            let room = game.GetRoom();
            spawnPickup(PickupVariant.CARD, CardType.FOOL, room.FindFreePickupSpawnPosition(room.GetCenterPos()));
            if (anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH)) spawnCollectible(Utils.getRandomGlitchedItem(Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_MOON)), room.FindFreePickupSpawnPosition(room.GetCenterPos()), undefined);
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

    @Callback(ModCallback.POST_NPC_DEATH)
    CardsPostNpcDeath(npc: EntityNPC) {
        if (v.run.Emperor.length > 0) {
            let ind = v.run.Emperor.indexOf(npc.Type);
            if (ind >= 0 && npc.HasEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY, EntityFlag.PERSISTENT))) {
                v.run.Emperor.splice(ind, 1);
                spawnCollectibleFromPool(ItemPoolType.BOSS, game.GetRoom().FindFreePickupSpawnPosition(npc.Position), undefined);
            }
        }
    }
}