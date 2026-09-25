import { CardType, CollectibleType, ModCallback, type ItemPoolType } from "isaac-typescript-definitions";
import { Callback, game, getRandomFloat, getRoomItemPoolType, isCardPickup, isCollectible, itemConfig, ModFeature, PickupIndex } from "isaacscript-common";
import { mod } from "../mod";

const lockedItems: Set<string> = new Set();
const lockedCards: Set<{cardName: string, rerollChance: () => float}> = new Set();

const v = {
    persistent: {
        unlockedItems: new Set<string>(),
        unlockedCards: new Set<string>()
    },
    level: {
        checkedPickups: new Set<PickupIndex>()
    }
}

function needRerollCard(lockedCard: {cardName: string, rerollChance: () => float}, rng: RNG): boolean {
    if (!v.persistent.unlockedCards.has(lockedCard.cardName)) return true;
    let rerollChance = lockedCard.rerollChance();
    if (rerollChance > 0 || getRandomFloat(0, 1, rng) <= rerollChance) return true;
    return false;
}

export class Unlocks extends ModFeature {
    v = v;

    public static AddLockedItem(item: CollectibleType) {
        let itemConfigItem = itemConfig.GetCollectible(item); if (!itemConfigItem) return;
        lockedItems.add(itemConfigItem.Name);
    }

    public static AddLockedCard(card: CardType, rerollChance: () => float = () => 0) {
        let cardConfig = itemConfig.GetCard(card); if (!cardConfig) return;
        lockedCards.add({cardName: cardConfig.Name, rerollChance});
    }

    public static AddLockedCardRange(cardStart: CardType, cardEnd: CardType, rerollChance: () => float = () => 0) {
        for (let card = cardStart; card <= cardEnd; card++) Unlocks.AddLockedCard(card, rerollChance);
    }

    public static UnlockItem(item: CollectibleType) {
        let itemConfigItem = itemConfig.GetCollectible(item); if (!itemConfigItem) return;
        v.persistent.unlockedItems.add(itemConfigItem.Name);
    }

    public static UnlockCard(card: CardType) {
        let cardConfig = itemConfig.GetCard(card); if (!cardConfig) return;
        v.persistent.unlockedCards.add(cardConfig.Name);
    }

    @Callback(ModCallback.POST_GET_COLLECTIBLE)
    OnGetItem(collectibleType: CollectibleType, itemPoolType: ItemPoolType, decrease: boolean, seed: Seed): CollectibleType | undefined {
        let itemConfigItem = itemConfig.GetCollectible(collectibleType); if (!itemConfigItem) return;
        if (!lockedItems.has(itemConfigItem.Name) || v.persistent.unlockedItems.has(itemConfigItem.Name)) return;
        let itemPool = game.GetItemPool();
        itemPool.RemoveCollectible(collectibleType);
        let newItem = itemPool.GetCollectible(itemPoolType, decrease, seed);
        return newItem;
    }

    @Callback(ModCallback.GET_CARD)
    OnGetCard(rng: RNG, cardType: CardType, includePlayingCards: boolean, includeRunes: boolean, onlyRunes: boolean): CardType | undefined {
        let cardConfig = itemConfig.GetCard(cardType); if (!cardConfig) return;
        let lockedCard = [...lockedCards].find(lc => lc.cardName == cardConfig.Name);
        if (!lockedCard) return;
        if (!needRerollCard(lockedCard, rng)) return;
        let newCard = game.GetItemPool().GetCard(rng.Next(), includePlayingCards, includeRunes, onlyRunes);
        return newCard;
    }
}