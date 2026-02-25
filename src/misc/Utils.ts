import { CollectibleType, ItemPoolType, ItemType, type TrinketType } from "isaac-typescript-definitions";
import { defaultMapGetPlayer, game, getRandomArrayElement, getRandomInt, isRNG, itemConfig, mapSetPlayer, newRNG, type DefaultMap, type PlayerIndex } from "isaacscript-common";

export class Utils {
    static getItemFromPool(pools: ItemPoolType | ItemPoolType[], rngOrSeed: RNG | Seed, minimumQuality: int = 0): CollectibleType {
        let itemPool = game.GetItemPool();
        let items: CollectibleType[] = [];
        // if (pools == undefined) pools = [0, 1, 2, 3, 4, 5, 6, 26];
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

    static getRandomGlitchedItem(rng: RNG) {
        return getRandomInt(4294960001, 4294967295, rng);
    }

    static arraysEqual(arr1: any[], arr2: any[]): boolean {
        if (arr1.length !== arr2.length) return false;
        let length = arr1.length;
        for (let i = 0; i < length; i++) if (arr1[i] !== arr2[i]) return false;
        return true;
    }

    static clamp(n: number, min: number, max: number): number {
        return math.max(math.min(n, max), min);
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
}