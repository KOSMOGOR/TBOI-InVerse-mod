import { CollectibleType, ItemPoolType, ItemType, type TrinketType } from "isaac-typescript-definitions";
import { defaultMapGetPlayer, game, getPickups, getPlayers, getRandomArrayElement, getRandomInt, isRNG, itemConfig, mapSetPlayer, newRNG, type DefaultMap, type PlayerIndex } from "isaacscript-common";

export class Utils {
    static getItemFromPool(pools: ItemPoolType | ItemPoolType[], rngOrSeed: RNG | Seed, minimumQuality: int = 0): CollectibleType {
        let itemPool = game.GetItemPool();
        let items: CollectibleType[] = [];
        let roomSeed = game.GetRoom().GetAwardSeed();
        if (!Array.isArray(pools)) pools = [pools];
        pools.forEach(pool => {
            itemPool.ResetRoomBlacklist();
            while (true) {
                let itemType = itemPool.GetCollectible(pool, false, roomSeed, CollectibleType.DADS_NOTE);
                if (itemType == CollectibleType.DADS_NOTE) break;
                if (itemConfig.GetCollectible(itemType)?.Quality ?? -1 >= minimumQuality) items.push(itemType);
                itemPool.AddRoomBlacklist(itemType);
            }
            itemPool.ResetRoomBlacklist();
            if (items.length == 0) items = [CollectibleType.BREAKFAST];
        });
        let rng = isRNG(rngOrSeed) ? rngOrSeed : newRNG(rngOrSeed);
        let item = getRandomArrayElement(items, rng);
        itemPool.RemoveCollectible(item);
        return item;
    }

    static getAllActiveItems(): CollectibleType[] {
        let items = [];
        let size = itemConfig.GetCollectibles().Size;
        for (let i = 1; i <= size; i++) {
            let item = itemConfig.GetCollectible(i);
            if (item?.Type == ItemType.ACTIVE) items.push(i);
        }
        return items;
    }

    static defaultMapSetPlayerPred<T>(map: DefaultMap<PlayerIndex, T>, player: EntityPlayer, pred: (value: T) => T) {
        let value = defaultMapGetPlayer(map, player);
        mapSetPlayer(map, player, pred(value));
    }

    static defaultMapSetPred<T1, T2>(map: DefaultMap<T1, T2>, key: T1, pred: (value: T2) => T2) {
        let value = map.getAndSetDefault(key);
        map.set(key, pred(value));
    }

    static getAllPlayerTrinkets(player: EntityPlayer): TrinketType[] {
        let trinkets = [];
        let size = itemConfig.GetTrinkets().Size;
        for (let i = 1; i <= size; i++) if (player.HasTrinket(i)) trinkets.push(i);
        return trinkets;
    }

    // Returns world coordinates and mirrors it in mirrored world
    static worldToMirrorScreen(world: Vector): Vector {
        let screen = Isaac.WorldToScreen(world);
        if (game.GetRoom().IsMirrorWorld()) screen.X = Isaac.GetScreenWidth() - screen.X;
        return screen;
    }

    static getAllPlayersTrinketMultiplier(trinket: TrinketType): int {
        let mult = 0;
        getPlayers().forEach(player => mult += player.GetTrinketMultiplier(trinket));
        return mult;
    }

    static EqualPtrHash(ent1: Entity, ent2: Entity) {
        return GetPtrHash(ent1) == GetPtrHash(ent2);
    }

    static moveTowards(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) return target;
        if (current < target) return current + maxDelta;
        else return current - maxDelta;
    }

    static getFreePickupOptionsIndex() {
        let pickedOptionsIndexes = new Set<int>();
        getPickups().forEach(pickup => pickedOptionsIndexes.add(pickup.OptionsPickupIndex));
        let optionsIndex = 1;
        while (pickedOptionsIndexes.has(optionsIndex)) optionsIndex++;
        return optionsIndex;
    }
}