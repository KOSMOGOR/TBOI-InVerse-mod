import { CacheFlag, CardType, CollectibleType, DamageFlag, EntityFlag, EntityType, ModCallback, UseFlag, PlayerItemAnimation, SoundEffect, GridRoom, PickupVariant, RoomType, DisplayFlag, RoomDescriptorFlag, GeminiVariant, BeastVariant, DingleVariant, GurglingVariant, ItemPoolType, TrinketType, GridEntityType, PoopGridEntityVariant, PlayerType, PickupPrice, BombSubType, LevelStage, StageTransitionType, DarkEsauSubType, PillEffect, HeartSubType, FamiliarVariant, ChubVariant, DukeOfFliesVariant, PeepVariant, LokiVariant, FistulaVariant, WidowVariant, DaddyLongLegsVariant, PinVariant, PolycephalusVariant } from "isaac-typescript-definitions";
import { addFlag, anyPlayerHasCollectible, bitFlags, Callback, CallbackCustom, changeRoom, COLORS, DefaultMap, defaultMapGetPlayer, game, getBosses, getEntities, getEntityFromPtrHash, getHorsePillColor, getPickups, getPillColorFromEffect, getPlayerFromIndex, getPlayerIndex, getPlayers, getRandomArrayElement, getRandomArrayIndex, getRandomInt, getRandomVector, getRoomDescriptorReadOnly, getRoomGridIndex, getRooms, getStage, getStageType, getUnusedDoorSlots, hasFlag, inRoomType, itemConfig, mapDeletePlayer, mapHasPlayer, mapSetPlayer, ModCallbackCustom, ModFeature, PickupIndex, repeat, sfxManager, smeltTrinket, spawn, spawnCollectible, spawnCollectibleFromPool, spawnHeart, spawnNPC, spawnPickup, teleport, type PlayerIndex } from "isaacscript-common";
import { ModEnums } from "../ModEnums";
import { Utils } from "../misc/Utils";
import { InnateItems } from "../misc/InnateItems";
import { TeegroData } from "../characters/Teegro";
import { mod } from "../mod";
import { CallbackOnGlowingHourglassRewind, OnGlowingHourglassRewind } from "../misc/AdditionalCallbacks";

const v = {
    run: {
        Fool: false,
        FoolRoomTime: 0,
        Priestess: false,
        Empress: new DefaultMap<PlayerIndex, int>(0),
        Emperor: {
            Boss: [EntityType.NULL] as [EntityType, int?, EntityType?],
            ActiveRoom: undefined as undefined | int,
            RemoveItems: new Array<PickupIndex>()
        },
        Hermit: false,
        Hanged: new Set<PlayerIndex>(),
        Devil: false,
        Moon: false,
        Sun: new Set<PtrHash>()
    },
    level: {
        Lovers: new DefaultMap<PlayerIndex, int>(0),
        Chariot: new Map<PlayerIndex, boolean>(),
        World: false
    },
    room: {
        Hierophant: new Map<PlayerIndex, boolean>(),
        WheelOfFortune: new DefaultMap<PlayerIndex, {remainingUses: int, passedSinceLastUse: int}>(() => { return {remainingUses: 0, passedSinceLastUse: 0}; }),
        Stars: false
    }
}

const ActiveItems = Utils.getAllActiveItems();

function MomentuumPriestess() {
    v.run.Priestess = false;
    if (inRoomType(RoomType.ANGEL)) {
        let room = game.GetRoom();
        let centerPos = room.GetCenterPos();
        let times = anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) ? 2 : 1
        repeat(times, () => {
            let pos = room.GetRandomPosition(10);
            spawnCollectibleFromPool(ItemPoolType.ANGEL, room.FindFreePickupSpawnPosition(pos.add(centerPos.sub(pos).Resized(60))), Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_PRIESTESS));
        });
    }
}
function MomentuumDevil() {
    v.run.Devil = false;
    if (inRoomType(RoomType.DEVIL)) {
        let room = game.GetRoom();
        let centerPos = room.GetCenterPos();
        let times = anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) ? 4 : 2
        repeat(times, () => {
            let pos = room.GetRandomPosition(10);
            let entityPickup = spawnCollectibleFromPool(ItemPoolType.DEVIL, room.FindFreePickupSpawnPosition(pos.add(centerPos.sub(pos).Resized(60))), Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_PRIESTESS))
            entityPickup.ShopItemId = -2;
            entityPickup.Price = itemConfig.GetCollectible(entityPickup.SubType)?.DevilPrice ?? PickupPrice.TWO_HEARTS;
            entityPickup.AutoUpdatePrice = true;
        });
    }
}
function MomentuumWorld() {
    if (!inRoomType(RoomType.ERROR, RoomType.DEVIL, RoomType.ANGEL, RoomType.DUNGEON, RoomType.BOSS_RUSH, RoomType.GREED_EXIT, RoomType.ULTRA_SECRET) && !hasFlag(getRoomDescriptorReadOnly().Flags, RoomDescriptorFlag.RED_ROOM)) {
        let level = game.GetLevel();
        let gridIndex = level.GetCurrentRoomDesc().SafeGridIndex;
        for (const doorSlot of getUnusedDoorSlots()) level.MakeRedRoomDoor(gridIndex, doorSlot);
    }
}
const MomentuumEmperor: [CollectibleType, EntityType, int?, int?][] = [
    [CollectibleType.MONSTROS_TOOTH, EntityType.MONSTRO],
    [CollectibleType.LITTLE_CHUBBY, EntityType.CHUB],
    [CollectibleType.LIL_GURDY, EntityType.GURDY],
    [CollectibleType.MONSTROS_LUNG, EntityType.MONSTRO_2],
    [CollectibleType.HALO_OF_FLIES, EntityType.DUKE_OF_FLIES],
    [CollectibleType.FREE_LEMONADE, EntityType.PEEP],
    [CollectibleType.LOKIS_HORNS, EntityType.LOKI],
    [CollectibleType.LIL_SPEWER, EntityType.BLASTOCYST_BIG],
    [CollectibleType.GEMINI, EntityType.GEMINI],
    [CollectibleType.LEPROSY, EntityType.FISTULA_BIG],
    [CollectibleType.BRIMSTONE_BOMBS, EntityType.FALLEN],
    [CollectibleType.BONE_SPURS, EntityType.CHUB, ChubVariant.CARRION_QUEEN],
    [CollectibleType.INFESTATION, EntityType.DUKE_OF_FLIES, DukeOfFliesVariant.HUSK],
    [CollectibleType.PEEPER, EntityType.PEEP, PeepVariant.BLOAT],
    [CollectibleType.LIL_LOKI, EntityType.LOKI, LokiVariant.LOKII],
    [CollectibleType.LOST_SOUL, EntityType.GEMINI, GeminiVariant.BLIGHTED_OVUM],
    [CollectibleType.TINYTOMA, EntityType.FISTULA_BIG, FistulaVariant.TERATOMA],
    [CollectibleType.SPIDERBABY, EntityType.WIDOW],
    [CollectibleType.INFAMY, EntityType.MASK_OF_INFAMY],
    [CollectibleType.JUICY_SACK, EntityType.WIDOW, WidowVariant.WRETCHED],
    [CollectibleType.DADDY_LONGLEGS, EntityType.DADDY_LONG_LEGS],
    [CollectibleType.SPIDER_BITE, EntityType.DADDY_LONG_LEGS, DaddyLongLegsVariant.TRIACHNID],
    [CollectibleType.LIL_HAUNT, EntityType.HAUNT],
    [CollectibleType.POOP, EntityType.DINGLE],
    [CollectibleType.CONTINUUM, EntityType.MEGA_MAW],
    [CollectibleType.HOST_HAT, EntityType.GATE],
    [CollectibleType.THUNDER_THIGHS, EntityType.MEGA_FATTY],
    [CollectibleType.BIRD_CAGE, EntityType.CAGE],
    [CollectibleType.DARK_MATTER, EntityType.DARK_ONE],
    [CollectibleType.EYE_OF_THE_OCCULT, EntityType.ADVERSARY],
    [CollectibleType.GIANT_CELL, EntityType.POLYCEPHALUS],
    [CollectibleType.WORM_FRIEND, EntityType.STAIN],
    [CollectibleType.DIRTY_MIND, EntityType.BROWNIE],
    [CollectibleType.BOOK_OF_THE_DEAD, EntityType.FORSAKEN],
    [CollectibleType.LITTLE_HORN, EntityType.BIG_HORN],
    [CollectibleType.BOX_OF_SPIDERS, EntityType.RAG_MAN],
    [CollectibleType.MONTEZUMAS_REVENGE, EntityType.DINGLE, DingleVariant.DANGLE],
    [CollectibleType.NUMBER_TWO, EntityType.GURGLING, GurglingVariant.TURDLING],
    [CollectibleType.BRITTLE_BONES, EntityType.PIN, PinVariant.FRAIL],
    [CollectibleType.SPOON_BENDER, EntityType.RAG_MEGA],
    [CollectibleType.GIMPY, EntityType.SISTERS_VIS],
    [CollectibleType.BIG_CHUBBY, EntityType.MATRIARCH],
    [CollectibleType.COMPOUND_FRACTURE, EntityType.POLYCEPHALUS, PolycephalusVariant.PILE],
    [CollectibleType.WIZ, EntityType.REAP_CREEP],
    [CollectibleType.AQUARIUS, EntityType.LIL_BLUB],
    [CollectibleType.DEPRESSION, EntityType.RAINMAKER],
    [CollectibleType.EMPTY_HEART, EntityType.VISAGE],
    [CollectibleType.CEREMONIAL_ROBES, EntityType.HERETIC],
    [CollectibleType.MAGIC_SKIN, EntityType.SCOURGE],
    [CollectibleType.DECAP_ATTACK, EntityType.CHIMERA],
    [CollectibleType.SMART_FLY, EntityType.MIN_MIN],
    [CollectibleType.FLUSH, EntityType.CLOG],
    [CollectibleType.BIRDS_EYE, EntityType.SINGE],
    [CollectibleType.BUTT_BOMBS, EntityType.COLOSTOMIA],
    [CollectibleType.BROWN_NUGGET, EntityType.TURDLET],
    [CollectibleType.ASTRAL_PROJECTION, EntityType.CLUTCH],
];

export class MomentuumCards extends ModFeature {
    v = v;

    @Callback(ModCallback.EVALUATE_CACHE)
    EvaluateCache(player: EntityPlayer, cacheFlag: CacheFlag) {
        if (mapHasPlayer(v.run.Empress, player)) {
            if (cacheFlag == CacheFlag.DAMAGE) player.Damage *= 1 + (defaultMapGetPlayer(v.run.Empress, player) * 0.1);
        }
        if (mapHasPlayer(v.level.Lovers, player)) {
            let val = defaultMapGetPlayer(v.level.Lovers, player);
            if (cacheFlag == CacheFlag.DAMAGE) player.Damage += val / 23 * val / 23 * 20;
            if (cacheFlag == CacheFlag.SPEED) player.MoveSpeed += val * 0.1;
        }
    }

    @Callback(ModCallback.POST_USE_CARD)
    UseMomentuumCard(cardType: CardType, player: EntityPlayer, useFlags: BitFlags<UseFlag>) {
        let rng = player.GetCardRNG(cardType);
        let hasTarotCloth = player.HasCollectible(CollectibleType.TAROT_CLOTH);
        if (hasFlag(useFlags, UseFlag.CAR_BATTERY)) return;
        let entity: Entity;
        let room = game.GetRoom();
        switch (cardType) {
            case ModEnums.CARD_MOMENTUUM_FOOL:
                v.run.Fool = true;
                break
            case ModEnums.CARD_MOMENTUUM_MAGICIAN:
                let wispCount = hasTarotCloth ? 16 : 8;
                for (let i = 0; i < wispCount; i++) {
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
                if (player.GetPlayerType() == PlayerType.LOST || player.GetPlayerType() == PlayerType.LOST) {
                    Utils.defaultMapSetPlayerPred(v.run.Empress, player, n => n + (hasTarotCloth ? 6 : 3));
                } else {
                    let hearts = player.GetMaxHearts();
                    player.AddMaxHearts(-hearts, true);
                    player.AddBrokenHearts(hearts / 2);
                    if (player.GetBoneHearts() + player.GetSoulHearts() == 0) player.AddBlackHearts(2);
                    Utils.defaultMapSetPlayerPred(v.run.Empress, player, n => n + hearts + (hasTarotCloth ? 1 : 0));
                }
                player.AddCacheFlags(CacheFlag.DAMAGE);
                player.EvaluateItems();
                break;
            case ModEnums.CARD_MOMENTUUM_EMPEROR:
                let targetCount = hasTarotCloth ? 5 : 3;
                let selectedItemsIndexes: int[] = [];
                while (selectedItemsIndexes.length < targetCount)
                    selectedItemsIndexes.push(getRandomArrayIndex(MomentuumEmperor, rng, selectedItemsIndexes));
                let spawnedPickupIndexes: PickupIndex[] = [];
                let optionsIndex = Utils.getFreePickupOptionsIndex();
                for (let ind of selectedItemsIndexes) {
                    let emp = MomentuumEmperor[ind]; if (!emp) continue;
                    let item = emp[0] ?? CollectibleType.NULL;
                    if (item == CollectibleType.NULL) continue;
                    let entityPickup = spawnCollectible(item, room.FindFreePickupSpawnPosition(player.Position, 20), undefined);
                    spawnedPickupIndexes.push(mod.getPickupIndex(entityPickup));
                    entityPickup.OptionsPickupIndex = optionsIndex;
                }
                v.run.Emperor = {
                    Boss: [EntityType.NULL],
                    ActiveRoom: getRoomGridIndex(),
                    RemoveItems: spawnedPickupIndexes
                };
                break;
            case ModEnums.CARD_MOMENTUUM_HIEROPHANT:
                mapSetPlayer(v.room.Hierophant, player, true);
                break;
            case ModEnums.CARD_MOMENTUUM_LOVERS:
                let damage = player.GetHearts() - player.GetRottenHearts() - (player.GetSoulHearts() + player.GetBoneHearts() > 0 ? 0 : 1);
                if (damage <= 0) break;
                player.TakeDamage(damage, addFlag(DamageFlag.RED_HEARTS, DamageFlag.IV_BAG, DamageFlag.NO_PENALTIES), EntityRef(player), 0);
                player.AddHearts(player.GetMaxHearts() + player.GetBoneHearts() * 2);
                Utils.defaultMapSetPlayerPred(v.level.Lovers, player, n => n + damage);
                player.AddCacheFlags(addFlag(CacheFlag.DAMAGE, CacheFlag.SPEED));
                player.EvaluateItems();
                break;
            case ModEnums.CARD_MOMENTUUM_CHARIOT:
                mapSetPlayer(v.level.Chariot, player, true);
                InnateItems.AddItemForLevel(player, hasTarotCloth ? CollectibleType.WHITE_PONY : CollectibleType.PONY, false);
                player.UseActiveItem(CollectibleType.PONY);
                break;
            case ModEnums.CARD_MOMENTUUM_JUSTICE:
                let mult = hasTarotCloth ? 2 : 1;
                let chestCount = getRandomInt(2 * mult, 4 * mult, rng);
                repeat(chestCount, () => {
                    let pos = room.FindFreePickupSpawnPosition(player.Position, 20);
                    spawnPickup(ModEnums.PICKUP_HUNTER_CHEST, 0, pos);
                });
                TeegroData.run.keyShards += chestCount * 4;
                break;
            case ModEnums.CARD_MOMENTUUM_HERMIT:
                v.run.Hermit = true;
                player.AddCoins(99);
                break;
            case ModEnums.CARD_MOMENTUUM_WHEEL:
                let metronomUsesMult = hasTarotCloth ? 2 : 1;
                mapSetPlayer(v.room.WheelOfFortune, player, {remainingUses: getRandomInt(6 * metronomUsesMult, 12 * metronomUsesMult, rng), passedSinceLastUse: 0});
                player.AnimateCollectible(CollectibleType.METRONOME, PlayerItemAnimation.USE_ITEM);
                break;
            case ModEnums.CARD_MOMENTUUM_STRENGTH:
                player.UseActiveItem(CollectibleType.MEGA_MUSH);
                if (hasTarotCloth) player.UseActiveItem(CollectibleType.MEGA_MUSH);
                break;
            case ModEnums.CARD_MOMENTUUM_HANGED:
                let ind = getPlayerIndex(player);
                v.run.Hanged.add(ind);
                break;
            case ModEnums.CARD_MOMENTUUM_DEATH:
                entity = spawnNPC(EntityType.BEAST, BeastVariant.ULTRA_DEATH, 0, game.GetRoom().GetCenterPos());
                entity.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY));
                sfxManager.Play(SoundEffect.SATAN_GROW);
                break;
            case ModEnums.CARD_MOMENTUUM_TEMPERANCE:
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
                game.GetLevel().InitializeDevilAngelRoom(false, true);
                if (getRoomGridIndex() == GridRoom.DEVIL) MomentuumDevil();
                else teleport(GridRoom.DEVIL);
                break;
            case ModEnums.CARD_MOMENTUUM_TOWER:
                repeat(hasTarotCloth ? 2 : 1, () => {
                    let pos = room.FindFreePickupSpawnPosition(player.Position, 20);
                    spawnPickup(PickupVariant.BOMB, BombSubType.GIGA, pos);
                });
                break;
            case ModEnums.CARD_MOMENTUUM_STARS:
                InnateItems.AddItem(player, CollectibleType.SACRED_ORB);
                player.UseActiveItem(CollectibleType.D6, UseFlag.NO_ANIMATION);
                player.UseCard(CardType.SOUL_OF_ISAAC, addFlag(UseFlag.NO_ANIMATION, UseFlag.NO_ANNOUNCER_VOICE));
                if (hasTarotCloth) player.UseCard(CardType.SOUL_OF_ISAAC, addFlag(UseFlag.NO_ANIMATION, UseFlag.NO_ANNOUNCER_VOICE));
                InnateItems.RemoveItem(player, CollectibleType.SACRED_ORB);
                break;
            case ModEnums.CARD_MOMENTUUM_MOON:
                v.run.Moon = true;
                teleport(GridRoom.ERROR);
                break;
            case ModEnums.CARD_MOMENTUUM_SUN:
                let esau = spawn(EntityType.DARK_ESAU, 0, DarkEsauSubType.DARK, room.GetRandomPosition(0));
                esau.Update();
                v.run.Sun.add(GetPtrHash(esau));
                if (hasTarotCloth) {
                    let esau2 = spawn(EntityType.DARK_ESAU, 0, DarkEsauSubType.DARKER, room.GetRandomPosition(0));
                    esau2.Update();
                    v.run.Sun.add(GetPtrHash(esau2));
                }
                break;
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
                MomentuumWorld();
                break;
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
    CardsPlayerUpdate(player: EntityPlayer) {
        if (mapHasPlayer(v.room.WheelOfFortune, player)) {
            let wheelData = defaultMapGetPlayer(v.room.WheelOfFortune, player);
            if (wheelData.remainingUses > 0) {
                if (wheelData.passedSinceLastUse >= 30) {
                    player.UseActiveItem(CollectibleType.METRONOME);
                    sfxManager.Stop(SoundEffect.ITEM_RAISE);
                    sfxManager.Play(SoundEffect.PORTABLE_SLOT_WIN);
                    wheelData.passedSinceLastUse = 0;
                    wheelData.remainingUses--;
                } else wheelData.passedSinceLastUse++;
                mapSetPlayer(v.room.WheelOfFortune, player, wheelData);
            } else mapDeletePlayer(v.room.WheelOfFortune, player);
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
    CardsNewRoom() {
        let room = game.GetRoom();
        v.run.FoolRoomTime = game.TimeCounter;
        if (v.run.Priestess) {
            MomentuumPriestess();
        }
        if (v.run.Emperor.Boss[0] != EntityType.NULL) {
            if (inRoomType(RoomType.BOSS)) {
                getBosses().forEach(boss => boss.Remove());
                spawnNPC(v.run.Emperor.Boss[0], 0, 0, room.GetCenterPos());
                v.run.Emperor.Boss = [EntityType.NULL];
            }
        }
        if (v.run.Emperor.ActiveRoom == getRoomGridIndex()) {
            v.run.Emperor.ActiveRoom = undefined;
            getPickups().forEach(pickup => {
                if (v.run.Emperor.RemoveItems.includes(mod.getPickupIndex(pickup))) pickup.Remove();
            });
            v.run.Emperor.RemoveItems = [];
        }
        if (v.level.Chariot.size > 0) {
            getPlayers().forEach(player => {
                if (mapHasPlayer(v.level.Chariot, player)) mod.runNextGameFrame(() => player.UseActiveItem(player.HasCollectible(CollectibleType.TAROT_CLOTH) ? CollectibleType.WHITE_PONY : CollectibleType.PONY));
            });
        }
        if (v.run.Devil) {
            MomentuumDevil();
        }
        if (v.run.Moon) {
            v.run.Moon = false;
            spawnPickup(PickupVariant.CARD, CardType.FOOL, room.FindFreePickupSpawnPosition(room.GetCenterPos()));
            if (anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH)) {
                let player = Isaac.GetPlayer();
                player.AddCollectible(CollectibleType.TMTRAINER);
                spawnCollectible(CollectibleType.SAD_ONION, room.FindFreePickupSpawnPosition(room.GetCenterPos()), undefined);
                player.RemoveCollectible(CollectibleType.TMTRAINER);
            }
        }
        if (v.level.World) {
            MomentuumWorld();
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_LEVEL_REORDERED)
    CardsNewLevel() {
        if (v.run.Fool) {
            v.run.Fool = false;
        }
        v.run.Emperor.ActiveRoom = undefined;
        v.run.Emperor.RemoveItems = [];
        if (v.run.Hermit) {
            v.run.Hermit = false;
            let player = Isaac.GetPlayer();
            player.AddCoins(anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) ? -50 : -player.GetNumCoins());
        }
        if (v.run.Sun.size > 0) {
            v.run.Sun.forEach(ptrHash => getEntityFromPtrHash(ptrHash)?.Remove());
            v.run.Sun.clear();
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_ROOM_CLEAR_CHANGED, true)
    CardsRoomCleared() {
        if (v.level.World) {
            if (anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH) && hasFlag(getRoomDescriptorReadOnly().Flags, RoomDescriptorFlag.RED_ROOM) && getRandomInt(1, 5, Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_WORLD)) == 1) {
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

    @Callback(ModCallback.POST_ENTITY_KILL)
    CardsPostNpcDeath(entity: Entity) {
        if (v.room.Stars) {
            if (entity.Type == EntityType.FROZEN_ENEMY && getRandomInt(1, 5, Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_STARS)) == 1)
                spawnPickup(PickupVariant.CARD, 0, entity.Position);
        }
    }

    @Callback(ModCallback.ENTITY_TAKE_DMG, EntityType.PLAYER)
    CardsPlayerTakeDamage(entity: Entity, amount: float, damageFlags: BitFlags<DamageFlag>, source: EntityRef, countdownFrames: int): undefined | boolean {
        let player = entity.ToPlayer(); if (!player) return;
        if (!v.level.Chariot.has(getPlayerIndex(player))) return;
        if (getRandomInt(1, 10, player.GetCardRNG(ModEnums.CARD_MOMENTUUM_CHARIOT)) <= 3) player.UseActiveItem(player.HasCollectible(CollectibleType.TAROT_CLOTH) ? CollectibleType.WHITE_PONY : CollectibleType.PONY);
        return;
    }

    @Callback(ModCallback.ENTITY_TAKE_DMG)
    CardsPlayerDealDamage(entity: Entity, amount: float, damageFlags: BitFlags<DamageFlag>, source: EntityRef, countdownFrames: int): undefined | boolean {
        let sourceEntity = source.Entity; if (!sourceEntity) return;
        if (sourceEntity.Type == EntityType.FAMILIAR) return;
        let player = sourceEntity.SpawnerEntity?.ToPlayer();
        if (!player) return;
        if (!v.room.Hierophant.has(getPlayerIndex(player))) return;
        if (getRandomInt(1, 3, player.GetCardRNG(ModEnums.CARD_MOMENTUUM_HIEROPHANT)) <= 2) player.AddBlueFlies(1, player.Position, undefined);
        return;
    }

    @Callback(ModCallback.ENTITY_TAKE_DMG)
    OnBlueFlyDeath(entity: Entity, amount: float, damageFlags: BitFlags<DamageFlag>, source: EntityRef, countdownFrames: int): boolean | undefined {
        let sourceEntity = source.Entity; if (!sourceEntity) return;
        if (sourceEntity.Type != EntityType.FAMILIAR && sourceEntity.Variant != FamiliarVariant.BLUE_FLY) return;
        let player = sourceEntity.SpawnerEntity?.ToPlayer();
        if (!player) return;
        let hasTarot = player.HasCollectible(CollectibleType.TAROT_CLOTH);
        if (mapHasPlayer(v.room.Hierophant, player) && getRandomInt(1, 10, player.GetCardRNG(ModEnums.CARD_MOMENTUUM_HIEROPHANT)) <= (hasTarot ? 2 : 1)) {
            let heart = spawnHeart(HeartSubType.HALF_SOUL, entity.Position);
            heart.Timeout = (hasTarot ? 2 : 1.5) * 30;
            heart.Velocity = getRandomVector(undefined).Resized(5);
        }
        return;
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_COLLECTIBLE_ADDED)
    CardsPlayerCollectibleAdded(player: EntityPlayer, collectibleType: CollectibleType) {
        if (v.run.Emperor.ActiveRoom == getRoomGridIndex()) {
            let emp = MomentuumEmperor.find(x => x[0] == collectibleType);
            if (emp) {
                v.run.Emperor.Boss = [emp[1], emp[2], emp[3]];
                v.run.Emperor.ActiveRoom = undefined;
                v.run.Emperor.RemoveItems = [];
            }
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
    HangedRevivePlayer(player: EntityPlayer) {
        let ind = getPlayerIndex(player);
        if (v.run.Hanged.has(ind) && player.IsDead()) {
            OnGlowingHourglassRewind.setData("Hanged", ind);
            player.UseActiveItem(CollectibleType.GLOWING_HOUR_GLASS, UseFlag.NO_ANIMATION);
        }
    }

    @CallbackOnGlowingHourglassRewind(false)
    GlowingHourglassRewind() {
        let hangedData = OnGlowingHourglassRewind.getData("Hanged")
        if (hangedData) {
            OnGlowingHourglassRewind.deleteData("Hanged");
            let player = getPlayerFromIndex(hangedData as PlayerIndex);
            print(player?.GetBrokenHearts())
            if (player) player.AddBrokenHearts(1);
            let roomInd = getRoomGridIndex()
            changeRoom(GridRoom.ERROR);
            changeRoom(roomInd);
            if (player) player.AddBrokenHearts(1);
        }
    }
}