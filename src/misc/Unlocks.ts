import { CardType, CollectibleType, ModCallback } from "isaac-typescript-definitions";
import { Callback, game, getRoomItemPoolType, isCardPickup, isCollectible, ModFeature } from "isaacscript-common";

const lockedItems: Set<CollectibleType> = new Set();
const lockedCards: Set<CardType> = new Set();

const v = {
    persistent: {
        unlockedItems: new Set<CollectibleType>,
        unlockedCards: new Set<CardType>
    }
}

export class Unlocks extends ModFeature {
    v = v;

    public static AddLockedItem(item: CollectibleType) {
        lockedItems.add(item);
    }

    public static AddLockedCard(card: CardType) {
        lockedCards.add(card);
    }

    public static AddLockedCardRange(cardStart: CardType, cardEnd: CardType) {
        for (let card = cardStart; card <= cardEnd; card++) Unlocks.AddLockedCard(card);
    }

    public static UnlockItem(item: CollectibleType) {
        v.persistent.unlockedItems.add(item);
    }

    public static UnlockCard(card: CardType) {
        v.persistent.unlockedCards.add(card);
    }

    @Callback(ModCallback.POST_PICKUP_INIT)
    RerollLockedItems(pickup: EntityPickup) {
        if (isCollectible(pickup) && lockedItems.has(pickup.SubType) && !v.persistent.unlockedItems.has(pickup.SubType)) {
            let pool = getRoomItemPoolType();
            let newItem = game.GetItemPool().GetCollectible(pool, true, pickup.InitSeed);
            pickup.Morph(pickup.Type, pickup.Variant, newItem, true, false, true);
        } else if (isCardPickup(pickup) && lockedCards.has(pickup.SubType) && !v.persistent.unlockedCards.has(pickup.SubType)) {
            let newCard = game.GetItemPool().GetCard(pickup.InitSeed, true, true, false);
            pickup.Morph(pickup.Type, pickup.Variant, newCard, true, false, true);
        }
    }
}