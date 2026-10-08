import { CacheFlag, CardType, CollectibleType, DamageFlag, EntityFlag, EntityType, ModCallback, UseFlag, PlayerItemAnimation, SoundEffect, GridRoom, PickupVariant, RoomType, DisplayFlag, RoomDescriptorFlag, GeminiVariant, BeastVariant, DingleVariant, GurglingVariant, ItemPoolType, TrinketType, GridEntityType, PoopGridEntityVariant, PlayerType, PickupPrice, BombSubType, DarkEsauSubType, HeartSubType, FamiliarVariant, ChubVariant, DukeOfFliesVariant, PeepVariant, LokiVariant, FistulaVariant, WidowVariant, DaddyLongLegsVariant, PinVariant, PolycephalusVariant, EffectVariant, Music } from "isaac-typescript-definitions";
import { addFlag, anyPlayerHasCollectible, bitFlags, Callback, CallbackCustom, COLORS, DefaultMap, defaultMapGetPlayer, game, getBosses, getEntities, getEntityFromPtrHash, getEntityID, getPickups, getPlayers, getPocketItems, getRandomArrayElement, getRandomArrayIndex, getRandomFloat, getRandomFromWeightedArray, getRandomInt, getRandomVector, getRoomDescriptorReadOnly, getRoomGridIndex, getRooms, getUnusedDoorSlots, hasCard, hasFlag, inRoomType, isCardPickup, isCharacter, isStoryBoss, itemConfig, mapDeletePlayer, mapHasPlayer, mapSetPlayer, ModCallbackCustom, ModFeature, musicManager, PickupIndex, PocketItemType, repeat, setAddPlayer, setHasPlayer, sfxManager, smeltTrinket, spawn, spawnCollectible, spawnCollectibleFromPool, spawnEffect, spawnEntityID, spawnHeart, spawnNPC, spawnPickup, teleport, type EntityID, type PlayerIndex } from "isaacscript-common";
import { ModEnums } from "../ModEnums";
import { Utils } from "../misc/Utils";
import { InnateItems } from "../misc/InnateItems";
import { TeegroData } from "../characters/Teegro";
import { mod } from "../mod";
import { Unlocks } from "../misc/Unlocks";

Unlocks.AddLockedCardRange(ModEnums.CARD_MOMENTUUM_FOOL, ModEnums.CARD_MOMENTUUM_WORLD, () => 1 - Utils.getAllPlayersTrinketMultiplier(ModEnums.TRINKET_ACE_OF_HISTORY) * .2);

const v = {
    run: {
        Fool: 0,
        FoolRoomTime: 0,
        CurrentFoolSound: SoundEffect.NULL,
        Priestess: false,
        Empress: new DefaultMap<PlayerIndex, int>(0),
        Emperor: {
            Boss: {bossType: EntityType.NULL} as {bossType: EntityType, bossVariant?: int, bossCount?: int},
            ActiveRoom: undefined as undefined | int,
            RemoveItems: new Array<PickupIndex>()
        },
        Hermit: false,
        Hanged: new Array<{entityID: EntityID, price: int}>(),
        Devil: false,
        Moon: false,
        Sun: new Set<PtrHash>()
    },
    level: {
        Hierophant: new Set<PlayerIndex>(),
        Lovers: new DefaultMap<PlayerIndex, int>(0),
        LoversTimers: new DefaultMap<PlayerIndex, int>(0),
        Chariot: new Set<PlayerIndex>(),
        World: false
    },
    room: {
        WheelOfFortune: new DefaultMap<PlayerIndex, {remainingUses: int, passedSinceLastUse: int}>(() => { return {remainingUses: 0, passedSinceLastUse: 0}; }),
        Death: false,
        Stars: false
    }
}

const ActiveItems = Utils.getAllActiveItems();
const ClownHairCostume = Isaac.GetCostumeIdByPath("gfx/characters/Clown_Hair.anm2");
const FoolSounds: [string, SoundEffect, float?][] = [
    ["6am", Isaac.GetSoundIdByName("Fool6am")],
    ["A", Isaac.GetSoundIdByName("FoolA")],
    ["Amerikaya", Isaac.GetSoundIdByName("FoolAmerikaya")],
    ["Amongus", Isaac.GetSoundIdByName("FoolAmongus")],
    ["Barinfart", Isaac.GetSoundIdByName("FoolBarinfart")],
    ["Blackspiderman", Isaac.GetSoundIdByName("FoolBlackspiderman")],
    ["Blya", Isaac.GetSoundIdByName("FoolBlya")],
    ["Bodydiscovery", Isaac.GetSoundIdByName("FoolBodydiscovery")],
    ["Bogosbinted", Isaac.GetSoundIdByName("FoolBogosbinted")],
    ["Bone", Isaac.GetSoundIdByName("FoolBone")],
    ["Bruh", Isaac.GetSoundIdByName("FoolBruh")],
    ["Caramelldancen", Isaac.GetSoundIdByName("FoolCaramelldancen")],
    ["Cave1", Isaac.GetSoundIdByName("FoolCave1")],
    ["Cave10", Isaac.GetSoundIdByName("FoolCave10")],
    ["Cave12", Isaac.GetSoundIdByName("FoolCave12")],
    ["Cave15", Isaac.GetSoundIdByName("FoolCave15")],
    ["Cave2", Isaac.GetSoundIdByName("FoolCave2")],
    ["Cave5", Isaac.GetSoundIdByName("FoolCave5")],
    ["Cave8", Isaac.GetSoundIdByName("FoolCave8")],
    ["Chickenjockey", Isaac.GetSoundIdByName("FoolChickenjockey")],
    ["Cooked", Isaac.GetSoundIdByName("FoolCooked")],
    ["Dexter-meme", Isaac.GetSoundIdByName("FoolDexter-meme")],
    ["Dor", Isaac.GetSoundIdByName("FoolDor")],
    ["Fah", Isaac.GetSoundIdByName("FoolFah")],
    ["Fart", Isaac.GetSoundIdByName("FoolFart")],
    ["Fish", Isaac.GetSoundIdByName("FoolFish")],
    ["Fith", Isaac.GetSoundIdByName("FoolFith")],
    ["Flashbang", Isaac.GetSoundIdByName("FoolFlashbang")],
    ["Funkytown", Isaac.GetSoundIdByName("FoolFunkytown")],
    ["Gay", Isaac.GetSoundIdByName("FoolGay")],
    ["Goku", Isaac.GetSoundIdByName("FoolGoku")],
    ["GokuFirst", Isaac.GetSoundIdByName("FoolGokuFirst")],
    ["Goodbye", Isaac.GetSoundIdByName("FoolGoodbye")],
    ["Gtfo", Isaac.GetSoundIdByName("FoolGtfo")],
    ["Guts", Isaac.GetSoundIdByName("FoolGuts")],
    ["Hellnah", Isaac.GetSoundIdByName("FoolHellnah")],
    ["Huh", Isaac.GetSoundIdByName("FoolHuh")],
    ["Hurhur", Isaac.GetSoundIdByName("FoolHurhur")],
    ["Intheend", Isaac.GetSoundIdByName("FoolIntheend")],
    ["Jumpscare", Isaac.GetSoundIdByName("FoolJumpscare")],
    ["Legobreak", Isaac.GetSoundIdByName("FoolLegobreak")],
    ["Letmeknow", Isaac.GetSoundIdByName("FoolLetmeknow")],
    ["Lobotomy", Isaac.GetSoundIdByName("FoolLobotomy")],
    ["Lobster", Isaac.GetSoundIdByName("FoolLobster")],
    ["Metalpipe", Isaac.GetSoundIdByName("FoolMetalpipe")],
    ["Nonono", Isaac.GetSoundIdByName("FoolNonono")],
    ["Number15", Isaac.GetSoundIdByName("FoolNumber15")],
    ["Oiiai1", Isaac.GetSoundIdByName("FoolOiiai1")],
    ["Oiiai2", Isaac.GetSoundIdByName("FoolOiiai2")],
    ["Oioeoi", Isaac.GetSoundIdByName("FoolOioeoi")],
    ["Oof", Isaac.GetSoundIdByName("FoolOof")],
    ["Ph", Isaac.GetSoundIdByName("FoolPh")],
    ["Ping", Isaac.GetSoundIdByName("FoolPing"), 0.3],
    ["Prowler", Isaac.GetSoundIdByName("FoolProwler")],
    ["Rizzx", Isaac.GetSoundIdByName("FoolRizzx")],
    ["Scarypiano", Isaac.GetSoundIdByName("FoolScarypiano")],
    ["Sisyphus", Isaac.GetSoundIdByName("FoolSisyphus")],
    ["Snap", Isaac.GetSoundIdByName("FoolSnap")],
    ["Snore", Isaac.GetSoundIdByName("FoolSnore")],
    ["Sorting", Isaac.GetSoundIdByName("FoolSorting")],
    ["Spotifyad", Isaac.GetSoundIdByName("FoolSpotifyad")],
    ["Sugoma", Isaac.GetSoundIdByName("FoolSugoma")],
    ["Tiktok", Isaac.GetSoundIdByName("FoolTiktok")],
    ["Vineboom", Isaac.GetSoundIdByName("FoolVineboom")],
    ["Whathow", Isaac.GetSoundIdByName("FoolWhathow")],
    ["Winning", Isaac.GetSoundIdByName("FoolWinning")],
    ["Yippee", Isaac.GetSoundIdByName("FoolYippee")],
];
const FoolSoundsWeighted = Utils.arrayToWeighted(FoolSounds, sound => sound[2] ?? 1);
const BloodOathSprite = Sprite();
BloodOathSprite.Load("gfx/003.203_bloodoath.anm2", true);
BloodOathSprite.SetAnimation("Stab", true);

const TargetBlueColor = Color(86 / 255, 108 / 255, 138 / 255);
const IsaacColor = Color(227 / 255, 198 / 255, 197 / 255);
const HierophantColor = Color(TargetBlueColor.R / IsaacColor.R, TargetBlueColor.G / IsaacColor.G, TargetBlueColor.B / IsaacColor.B);

function PlayFoolSound(sound: SoundEffect) {
    if (v.run.CurrentFoolSound != SoundEffect.NULL) sfxManager.Stop(v.run.CurrentFoolSound);
    v.run.CurrentFoolSound = sound;
    sfxManager.Play(sound);
    musicManager.Pause();
}

function StopFoolSound() {
    if (v.run.CurrentFoolSound != SoundEffect.NULL) sfxManager.Stop(v.run.CurrentFoolSound);
    v.run.CurrentFoolSound = SoundEffect.NULL;
    musicManager.Resume();
}
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
        for (const doorSlot of getUnusedDoorSlots())
            if (Utils.canBeRedRoom(doorSlot)) level.MakeRedRoomDoor(gridIndex, doorSlot);
    }
}
const MomentuumEmperor: {item: CollectibleType, bossType: EntityType, bossVariant?: int, bossCount?: int}[] = [
    {item: CollectibleType.MONSTROS_TOOTH, bossType: EntityType.MONSTRO},
    {item: CollectibleType.LITTLE_CHUBBY, bossType: EntityType.CHUB, bossCount: 3},
    {item: CollectibleType.LIL_GURDY, bossType: EntityType.GURDY},
    {item: CollectibleType.MONSTROS_LUNG, bossType: EntityType.MONSTRO_2},
    {item: CollectibleType.HALO_OF_FLIES, bossType: EntityType.DUKE_OF_FLIES},
    {item: CollectibleType.FREE_LEMONADE, bossType: EntityType.PEEP},
    {item: CollectibleType.LOKIS_HORNS, bossType: EntityType.LOKI},
    {item: CollectibleType.LIL_SPEWER, bossType: EntityType.BLASTOCYST_BIG},
    {item: CollectibleType.GEMINI, bossType: EntityType.GEMINI},
    {item: CollectibleType.LEPROSY, bossType: EntityType.FISTULA_BIG},
    {item: CollectibleType.BRIMSTONE_BOMBS, bossType: EntityType.FALLEN},
    {item: CollectibleType.BONE_SPURS, bossType: EntityType.CHUB, bossVariant: ChubVariant.CARRION_QUEEN, bossCount: 3},
    {item: CollectibleType.INFESTATION, bossType: EntityType.DUKE_OF_FLIES, bossVariant: DukeOfFliesVariant.HUSK},
    {item: CollectibleType.PEEPER, bossType: EntityType.PEEP, bossVariant: PeepVariant.BLOAT},
    {item: CollectibleType.LIL_LOKI, bossType: EntityType.LOKI, bossVariant: LokiVariant.LOKII},
    {item: CollectibleType.LOST_SOUL, bossType: EntityType.GEMINI, bossVariant: GeminiVariant.BLIGHTED_OVUM},
    {item: CollectibleType.TINYTOMA, bossType: EntityType.FISTULA_BIG, bossVariant: FistulaVariant.TERATOMA},
    {item: CollectibleType.SPIDERBABY, bossType: EntityType.WIDOW},
    {item: CollectibleType.INFAMY, bossType: EntityType.MASK_OF_INFAMY},
    {item: CollectibleType.JUICY_SACK, bossType: EntityType.WIDOW, bossVariant: WidowVariant.WRETCHED},
    {item: CollectibleType.DADDY_LONGLEGS, bossType: EntityType.DADDY_LONG_LEGS},
    {item: CollectibleType.SPIDER_BITE, bossType: EntityType.DADDY_LONG_LEGS, bossVariant: DaddyLongLegsVariant.TRIACHNID},
    {item: CollectibleType.LIL_HAUNT, bossType: EntityType.HAUNT},
    {item: CollectibleType.POOP, bossType: EntityType.DINGLE},
    {item: CollectibleType.CONTINUUM, bossType: EntityType.MEGA_MAW},
    {item: CollectibleType.HOST_HAT, bossType: EntityType.GATE},
    {item: CollectibleType.THUNDER_THIGHS, bossType: EntityType.MEGA_FATTY},
    {item: CollectibleType.BIRD_CAGE, bossType: EntityType.CAGE},
    {item: CollectibleType.DARK_MATTER, bossType: EntityType.DARK_ONE},
    {item: CollectibleType.EYE_OF_THE_OCCULT, bossType: EntityType.ADVERSARY},
    {item: CollectibleType.GIANT_CELL, bossType: EntityType.POLYCEPHALUS},
    {item: CollectibleType.WORM_FRIEND, bossType: EntityType.STAIN},
    {item: CollectibleType.DIRTY_MIND, bossType: EntityType.BROWNIE},
    {item: CollectibleType.BOOK_OF_THE_DEAD, bossType: EntityType.FORSAKEN},
    {item: CollectibleType.LITTLE_HORN, bossType: EntityType.BIG_HORN},
    {item: CollectibleType.BOX_OF_SPIDERS, bossType: EntityType.RAG_MAN},
    {item: CollectibleType.MONTEZUMAS_REVENGE, bossType: EntityType.DINGLE, bossVariant: DingleVariant.DANGLE},
    {item: CollectibleType.NUMBER_TWO, bossType: EntityType.GURGLING, bossVariant: GurglingVariant.TURDLING},
    {item: CollectibleType.BRITTLE_BONES, bossType: EntityType.PIN, bossVariant: PinVariant.FRAIL},
    {item: CollectibleType.SPOON_BENDER, bossType: EntityType.RAG_MEGA},
    {item: CollectibleType.GIMPY, bossType: EntityType.SISTERS_VIS},
    {item: CollectibleType.BIG_CHUBBY, bossType: EntityType.MATRIARCH},
    {item: CollectibleType.COMPOUND_FRACTURE, bossType: EntityType.POLYCEPHALUS, bossVariant: PolycephalusVariant.PILE},
    {item: CollectibleType.WIZ, bossType: EntityType.REAP_CREEP},
    {item: CollectibleType.AQUARIUS, bossType: EntityType.LIL_BLUB},
    {item: CollectibleType.DEPRESSION, bossType: EntityType.RAINMAKER},
    {item: CollectibleType.EMPTY_HEART, bossType: EntityType.VISAGE},
    {item: CollectibleType.CEREMONIAL_ROBES, bossType: EntityType.HERETIC},
    {item: CollectibleType.MAGIC_SKIN, bossType: EntityType.SCOURGE},
    {item: CollectibleType.DECAP_ATTACK, bossType: EntityType.CHIMERA},
    {item: CollectibleType.SMART_FLY, bossType: EntityType.MIN_MIN},
    {item: CollectibleType.FLUSH, bossType: EntityType.CLOG},
    {item: CollectibleType.BIRDS_EYE, bossType: EntityType.SINGE},
    {item: CollectibleType.BUTT_BOMBS, bossType: EntityType.COLOSTOMIA},
    {item: CollectibleType.BROWN_NUGGET, bossType: EntityType.TURDLET},
    {item: CollectibleType.ASTRAL_PROJECTION, bossType: EntityType.CLUTCH},
];
const MomentuumEmperorNotDespawn: [EntityType] = [
    EntityType.DARK_ESAU,
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
        if (setHasPlayer(v.level.Chariot, player)) {
            if (cacheFlag == CacheFlag.SPEED) player.MoveSpeed = 2;
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
                v.run.Fool = math.max(hasTarotCloth ? 2 : 1, v.run.Fool);
                player.AddNullCostume(ClownHairCostume);
                let foolSound = getRandomFromWeightedArray(FoolSoundsWeighted, undefined);
                PlayFoolSound(foolSound[1]);
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
                for (let itemInd of selectedItemsIndexes) {
                    let emp = MomentuumEmperor[itemInd]; if (!emp) continue;
                    let item = emp.item ?? CollectibleType.NULL;
                    if (item == CollectibleType.NULL) continue;
                    let entityPickup = spawnCollectible(item, room.FindFreePickupSpawnPosition(player.Position, 20), undefined);
                    spawnedPickupIndexes.push(mod.getPickupIndex(entityPickup));
                    entityPickup.OptionsPickupIndex = optionsIndex;
                }
                v.run.Emperor = {
                    Boss: {bossType: EntityType.NULL},
                    ActiveRoom: getRoomGridIndex(),
                    RemoveItems: spawnedPickupIndexes
                };
                break;
            case ModEnums.CARD_MOMENTUUM_HIEROPHANT:
                setAddPlayer(v.level.Hierophant, player);
                break;
            case ModEnums.CARD_MOMENTUUM_LOVERS:
                mapSetPlayer(v.level.LoversTimers, player, 0);
                break;
            case ModEnums.CARD_MOMENTUUM_CHARIOT:
                setAddPlayer(v.level.Chariot, player);
                InnateItems.AddItemForLevel(player, CollectibleType.LEO);
                player.AddCacheFlags(CacheFlag.SPEED);
                player.EvaluateItems();
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
                let maxCap = 10 * (hasTarotCloth ? 2 : 1);
                for (const pickup of getPickups().toSorted(
                    // first - collectibles
                    (a, b) => a.Variant == PickupVariant.COLLECTIBLE && b.Variant != PickupVariant.COLLECTIBLE ? -1 : 0
                )) {
                    if (v.run.Hanged.length >= maxCap) break;
                    if (pickup.Variant == PickupVariant.COLLECTIBLE && pickup.SubType == CollectibleType.NULL) continue;
                    v.run.Hanged.push({
                        entityID: getEntityID(pickup),
                        price: pickup.Price
                    });
                    pickup.Remove();
                    spawnEffect(EffectVariant.POOF_1, 0, pickup.Position);
                }
                if (hasFlag(useFlags, UseFlag.OWNED)) player.AddCard(ModEnums.CARD_MOMENTUUM_HANGED);
                break;
            case ModEnums.CARD_MOMENTUUM_DEATH:
                entity = spawnNPC(EntityType.BEAST, BeastVariant.ULTRA_DEATH, 0, game.GetRoom().GetCenterPos());
                entity.AddEntityFlags(addFlag(EntityFlag.CHARM, EntityFlag.FRIENDLY));
                sfxManager.Play(SoundEffect.SATAN_GROW);
                if (hasTarotCloth) v.room.Death = true;
                break;
            case ModEnums.CARD_MOMENTUUM_TEMPERANCE:
                spawnCollectible(CollectibleType.BREAKFAST, room.FindFreePickupSpawnPosition(player.Position, 20), undefined);
                InnateItems.AddItemForRoom(player, CollectibleType.BINGE_EATER);
                let bingeItems = [CollectibleType.LUNCH, CollectibleType.DINNER, CollectibleType.DESSERT, CollectibleType.BREAKFAST,
                    CollectibleType.ROTTEN_MEAT, CollectibleType.SNACK, CollectibleType.MIDNIGHT_SNACK, CollectibleType.SUPPER];
                getEntities(EntityType.PICKUP, PickupVariant.COLLECTIBLE).forEach(item => {
                    item.ToPickup()?.Morph(EntityType.PICKUP, PickupVariant.COLLECTIBLE, getRandomArrayElement(bingeItems, rng));
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
                game.GetRoom().MamaMegaExplosion(player.Position, player);
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

    @Callback(ModCallback.POST_PICKUP_INIT)
    CardsCustomSprite(pickup: EntityPickup) {
        if (!isCardPickup(pickup) || pickup.SubType < ModEnums.CARD_MOMENTUUM_FOOL || pickup.SubType > ModEnums.CARD_MOMENTUUM_WORLD) return;
        let sprite = pickup.GetSprite();
        sprite.ReplaceSpritesheet(0, "gfx/items/pickups/Momentuum_Card.png");
        sprite.LoadGraphics();
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_UPDATE_REORDERED)
    CardsPlayerUpdate(player: EntityPlayer) {
        if (setHasPlayer(v.level.Hierophant, player)) {
            player.SetColor(HierophantColor, 2, 1);
        }
        if (mapHasPlayer(v.level.LoversTimers, player)) {
            let time = defaultMapGetPlayer(v.level.LoversTimers, player);
            if (time == 40) {
                let isLost = isCharacter(player, PlayerType.LOST, PlayerType.LOST_B);
                let damage;
                if (isLost) damage = 6;
                else damage = player.GetHearts() - player.GetRottenHearts() - (player.GetSoulHearts() + player.GetBoneHearts() > 0 ? 0 : 1);
                if (damage > 0) {
                    if (isLost) player.TakeDamage(1, DamageFlag.FAKE, EntityRef(player), 0);
                    else {
                        player.TakeDamage(damage, addFlag(DamageFlag.RED_HEARTS, DamageFlag.IV_BAG, DamageFlag.NO_PENALTIES), EntityRef(player), 0);
                        player.AddHearts(player.GetMaxHearts() + player.GetBoneHearts() * 2);
                    }
                    Utils.defaultMapSetPlayerPred(v.level.Lovers, player, n => n + damage * (player.GetCollectibleNum(CollectibleType.TAROT_CLOTH) + 1));
                    player.AddCacheFlags(addFlag(CacheFlag.DAMAGE, CacheFlag.SPEED));
                    player.EvaluateItems();
                    sfxManager.Play(SoundEffect.MEATY_DEATHS);
                }
            }
            if (time > 80) mapDeletePlayer(v.level.LoversTimers, player);
            else mapSetPlayer(v.level.LoversTimers, player, time + 1);
        }
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

    @Callback(ModCallback.POST_UPDATE)
    PostUpdate() {
        if (v.run.CurrentFoolSound != SoundEffect.NULL && !sfxManager.IsPlaying(v.run.CurrentFoolSound)) StopFoolSound();
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
    CardsNewRoom() {
        let room = game.GetRoom();
        v.run.FoolRoomTime = game.TimeCounter;
        if (v.run.CurrentFoolSound != null) sfxManager.IsPlaying(v.run.CurrentFoolSound);
        if (v.run.Fool > 0) {
            let foolSound = getRandomFromWeightedArray(FoolSoundsWeighted, undefined);
            mod.runNextGameFrame(() => PlayFoolSound(foolSound[1]));
            // PlayFoolSound(foolSound[1]);
        }
        if (v.run.Priestess) {
            MomentuumPriestess();
        }
        if (v.run.Emperor.Boss.bossType != EntityType.NULL) {
            if (inRoomType(RoomType.BOSS)) {
                let bossFound = false;
                for (const boss of getBosses()) {
                    if (isStoryBoss(boss.Type) || MomentuumEmperorNotDespawn.includes(boss.Type)) continue;
                    bossFound = true;
                    boss.Remove();
                }
                if (bossFound) {
                    repeat(v.run.Emperor.Boss.bossCount ?? 1, () => {
                        spawnNPC(v.run.Emperor.Boss.bossType, v.run.Emperor.Boss.bossVariant ?? 0, 0, room.GetCenterPos());
                    });
                    v.run.Emperor.Boss = {bossType: EntityType.NULL};
                }
            }
        }
        if (v.run.Emperor.ActiveRoom == getRoomGridIndex()) {
            v.run.Emperor.ActiveRoom = undefined;
            getPickups().forEach(pickup => {
                if (v.run.Emperor.RemoveItems.includes(mod.getPickupIndex(pickup))) pickup.Remove();
            });
            v.run.Emperor.RemoveItems = [];
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
        let players = getPlayers();
        let anyHasTarotCloth = anyPlayerHasCollectible(CollectibleType.TAROT_CLOTH);
        if (v.run.Fool != 0) {
            v.run.Fool = 0;
            getPlayers().forEach(player => player.TryRemoveNullCostume(ClownHairCostume));
        }
        for (const foolSound of FoolSounds) sfxManager.Stop(foolSound[1]);
        v.run.Emperor.ActiveRoom = undefined;
        v.run.Emperor.RemoveItems = [];
        if (v.run.Hermit) {
            v.run.Hermit = false;
            let player = Isaac.GetPlayer();
            player.AddCoins(anyHasTarotCloth ? -50 : -player.GetNumCoins());
        }
        if (v.run.Hanged.length > 0) {
            let willConsume = !(anyHasTarotCloth && v.run.Hanged.length < 5);
            for (const player of players) {
                if (!hasCard(player, ModEnums.CARD_MOMENTUUM_HANGED)) continue;
                for (const pid of getPocketItems(player)) {
                    if (pid.type != PocketItemType.CARD || pid.subType != ModEnums.CARD_MOMENTUUM_HANGED) continue;
                    if (willConsume) player.SetCard(pid.slot, CardType.NULL);
                    for (const pickup of v.run.Hanged) {
                        let pos = game.GetRoom().FindFreePickupSpawnPosition(player.Position, 40);
                        let pickupEntity = spawnEntityID(pickup.entityID, pos).ToPickup();
                        if (pickupEntity) {
                            pickupEntity.AutoUpdatePrice = false;
                            pickupEntity.Price = pickup.price;
                        }
                    }
                    v.run.Hanged.splice(0);
                }
                break;
            }
        }
        if (v.run.Sun.size > 0) {
            v.run.Sun.forEach(ptrHash => getEntityFromPtrHash(ptrHash)?.Remove());
            v.run.Sun.clear();
        }
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_RENDER_REORDERED)
    PostPlayerRender(player: EntityPlayer, renderOffset: Vector) {
        if (!mapHasPlayer(v.level.LoversTimers, player)) return;
        let frame = math.floor(defaultMapGetPlayer(v.level.LoversTimers, player) / 2);
        BloodOathSprite.SetFrame(frame);
        BloodOathSprite.Render(Utils.worldToMirrorScreen(player.Position));
    }

    @CallbackCustom(ModCallbackCustom.POST_ROOM_CLEAR_CHANGED, true)
    CardsRoomCleared() {
        if (v.room.Death) {
            Isaac.GetPlayer().UseActiveItem(CollectibleType.NECRONOMICON, UseFlag.NO_ANIMATION);
        }
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
        if (v.run.Fool != 0) {
            let room = game.GetRoom();
            if (gridEntity.GetType() == GridEntityType.POOP && gridEntity.GetVariant() != PoopGridEntityVariant.RAINBOW && (room.IsFirstVisit() || game.TimeCounter != v.run.FoolRoomTime)) {
                if (getRandomInt(1, 10, Isaac.GetPlayer().GetCardRNG(ModEnums.CARD_MOMENTUUM_FOOL)) == 1) {
                    gridEntity.SetVariant(PoopGridEntityVariant.RAINBOW);
                    gridEntity.Init(gridEntity.GetSaveState().SpawnSeed);
                }
            }
        }
    }

    @Callback(ModCallback.POST_NPC_INIT)
    CardsPostNpcInit(npc: EntityNPC) {
        if (v.run.Fool != 0) {
            let ref = EntityRef(undefined), duration = 3 * 30, damage = 3.5;
            if (npc.IsVulnerableEnemy()) {
                repeat(v.run.Fool, () => {
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
                });
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
        if (!setHasPlayer(v.level.Chariot, player)) return;
        if ([DamageFlag.INVINCIBLE, DamageFlag.FAKE, DamageFlag.NO_MODIFIERS].some(flag => hasFlag(damageFlags, flag))) return;
        let chanceToBlockDamage = source.Entity?.ToNPC() ? .5 : .25; // higher chance for contact damage
        if (player.HasCollectible(CollectibleType.TAROT_CLOTH)) chanceToBlockDamage = 2 * chanceToBlockDamage - chanceToBlockDamage * chanceToBlockDamage;
        if (getRandomFloat(0, 1, player.GetCardRNG(ModEnums.CARD_MOMENTUUM_CHARIOT)) <= chanceToBlockDamage) {
            player.TakeDamage(1, DamageFlag.FAKE, EntityRef(player), 0);
            spawnEffect(EffectVariant.SHOCKWAVE, 0, player.Position);
            return false;
        }
        return;
    }

    @Callback(ModCallback.ENTITY_TAKE_DMG)
    CardsPlayerDealDamage(entity: Entity, amount: float, damageFlags: BitFlags<DamageFlag>, source: EntityRef, countdownFrames: int): undefined | boolean {
        let sourceEntity = source.Entity; if (!sourceEntity) return;
        if (sourceEntity.Type == EntityType.FAMILIAR) return;
        let player = sourceEntity.SpawnerEntity?.ToPlayer();
        if (!player) return;
        if (!setHasPlayer(v.level.Hierophant, player)) return;
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
        if (setHasPlayer(v.level.Hierophant, player) && getRandomInt(1, 10, player.GetCardRNG(ModEnums.CARD_MOMENTUUM_HIEROPHANT)) <= (hasTarot ? 2 : 1)) {
            let heart = spawnHeart(HeartSubType.HALF_SOUL, entity.Position);
            heart.Timeout = (hasTarot ? 2 : 1.5) * 30;
            heart.Velocity = getRandomVector(undefined).Resized(5);
        }
        return;
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_COLLECTIBLE_ADDED)
    CardsPlayerCollectibleAdded(player: EntityPlayer, collectibleType: CollectibleType) {
        if (v.run.Emperor.ActiveRoom == getRoomGridIndex()) {
            let emp = MomentuumEmperor.find(x => x.item == collectibleType);
            if (emp) {
                v.run.Emperor.Boss = emp;
                v.run.Emperor.ActiveRoom = undefined;
                v.run.Emperor.RemoveItems = [];
            }
        }
    }
}