import { CardType, CollectibleType, EntityFlag, EntityType, ModCallback, UseFlag, PlayerItemAnimation, SoundEffect, GridRoom, PickupVariant, RoomType, DisplayFlag, RoomDescriptorFlag, GeminiVariant, BeastVariant, DingleVariant, GurglingVariant, ItemPoolType, TrinketType } from "isaac-typescript-definitions";
import { addFlag, anyPlayerHasCollectible, bitFlags, Callback, CallbackCustom, DefaultMap, defaultMapGetPlayer, game, getEntities, getRandomArrayElement, getRandomInt, getRoomData, getRoomDescriptorReadOnly, getRooms, getUnusedDoorSlots, hasFlag, isRoomType, mapDeletePlayer, mapHasPlayer, mapSetPlayer, ModCallbackCustom, ModFeature, sfxManager, smeltTrinket, spawnCollectible, spawnCollectibleFromPool, spawnNPC, spawnPickup, teleport, type PlayerIndex } from "isaacscript-common";
import { ModEnums } from "../ModEnums";
import { Utils } from "../misc/Utils";

const v = {
    run: {
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
            case ModEnums.CARD_MOMENTUUM_FOOL: break
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
                entity = spawnNPC(boss[0] as EntityType, boss[1] ?? 0, 0, player.Position);
                entity.HitPoints = 50;
                entity.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY));
                if (boss.length > 1) {
                    entity = spawnNPC(boss[2] as EntityType, boss[1] ?? 0, 0, player.Position);
                    entity.HitPoints = 48;
                    entity.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY));
                }
                v.run.Emperor.push(boss[0] as EntityType);
                break;
            case ModEnums.CARD_MOMENTUUM_HIEROPHANT: break;
            case ModEnums.CARD_MOMENTUUM_LOVERS:
                getEntities().forEach(entity => {
                    if (entity.IsVulnerableEnemy() && !entity.IsBoss()) {
                        entity.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY, EntityFlag.PERSISTENT));
                        if (hasTarotCloth && getRandomInt(1, 4, rng) == 1) entity.ToNPC()?.MakeChampion(entity.InitSeed);
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
                break;
            case ModEnums.CARD_MOMENTUUM_HANGED: break;
            case ModEnums.CARD_MOMENTUUM_DEATH:
                entity = spawnNPC(EntityType.BEAST, BeastVariant.ULTRA_DEATH, 0, game.GetRoom().GetCenterPos());
                entity.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY));
                sfxManager.Play(SoundEffect.SATAN_GROW);
                break;
            case ModEnums.CARD_MOMENTUUM_TEMPERANCE: break;
            case ModEnums.CARD_MOMENTUUM_DEVIL: break;
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
        if (v.run.Hermit) {
            v.run.Hermit = false;
            let player = Isaac.GetPlayer();
            player.AddCoins(anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) ? -50 : -player.GetNumCoins());
        }
    }

    @Callback(ModCallback.POST_NPC_DEATH)
    CardsPostNpcDeath(npc: EntityNPC) {
        let ind = v.run.Emperor.indexOf(npc.Type);
        if (ind >= 0) {
            v.run.Emperor.slice(ind);
            spawnCollectibleFromPool(ItemPoolType.BOSS, game.GetRoom().FindFreePickupSpawnPosition(npc.Position), undefined);
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
}