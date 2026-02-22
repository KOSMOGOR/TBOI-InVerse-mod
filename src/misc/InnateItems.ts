import { CollectibleType, EntityCollisionClass, EntityFlag, FamiliarVariant, SoundEffect } from "isaac-typescript-definitions";
import { CallbackCustom, DefaultMap, defaultMapGetPlayer, getFamiliars, getPlayers, itemConfig, mapHasPlayer, ModCallbackCustom, ModFeature, repeat, sfxManager, type PlayerIndex } from "isaacscript-common";
import { Utils } from "./Utils";

function HideWisp(wisp: EntityFamiliar) {
    let itemConfigItem = itemConfig.GetCollectible(wisp.SubType); if (!itemConfigItem) return;
    wisp.RemoveFromOrbit();
    wisp.ClearEntityFlags(EntityFlag.APPEAR);
    wisp.Visible = false;
    wisp.CollisionDamage = 0;
    wisp.EntityCollisionClass = EntityCollisionClass.NONE;
    wisp.Player.RemoveCostume(itemConfigItem);
}

const v = {
    run: {
        Items: new DefaultMap<PlayerIndex, DefaultMap<CollectibleType, int>>(() => new DefaultMap(0)),
        RoomItems: new DefaultMap<PlayerIndex, DefaultMap<CollectibleType, int>>(() => new DefaultMap(0)),
        LevelItems: new DefaultMap<PlayerIndex, DefaultMap<CollectibleType, int>>(() => new DefaultMap(0)),
    }
}

export class InnateItems extends ModFeature {
    v = v;

    @CallbackCustom(ModCallbackCustom.POST_GAME_STARTED_REORDERED_LAST, true)
    HideWispsOnContinue() {
        getPlayers().forEach(player => {
            if (!mapHasPlayer(v.run.Items, player)) return;
            let playerInnateItems = defaultMapGetPlayer(v.run.Items, player);
            let playerInnateItemsArr = new Array<int>();
            playerInnateItems.forEach((n, item) => repeat(n, () => playerInnateItemsArr.push(item)));
            for (const familiar of getFamiliars(FamiliarVariant.ITEM_WISP)) {
                if (familiar.Player.Index != player.Index || !familiar.IsVisible()) continue;
                let index = playerInnateItemsArr.indexOf(familiar.SubType);
                if (index != -1) {
                    HideWisp(familiar);
                    playerInnateItemsArr = playerInnateItemsArr.splice(index, 1);
                }
            }
        });
    }

    static AddItem(player: EntityPlayer, item: CollectibleType) {
        let itemConfigItem = itemConfig.GetCollectible(item); if (!itemConfigItem) return;
        let itemWisp = player.AddItemWisp(item, player.Position);
        HideWisp(itemWisp);
        let playerInnateItems = defaultMapGetPlayer(v.run.Items, player);
        Utils.defaultMapSetPred(playerInnateItems, item, n => n + 1);
    }

    static RemoveItem(player: EntityPlayer, item: CollectibleType) {
        let itemConfigItem = itemConfig.GetCollectible(item); if (!itemConfigItem) return;
        if (!mapHasPlayer(v.run.Items, player)) return;
        let playerInnateItems = defaultMapGetPlayer(v.run.Items, player);
        if (!playerInnateItems.has(item)) return;
        for (const familiar of getFamiliars(FamiliarVariant.ITEM_WISP)) {
            if (familiar.Player.Index != player.Index || familiar.SubType != item) continue;
            let numItems = playerInnateItems.get(item); if (numItems == undefined) return;
            if (numItems > 0) {
                familiar.Position = Vector(-500, -500);
                familiar.Kill();
                sfxManager.Stop(SoundEffect.STEAM_HALF_SEC);
                numItems--;
            }
            if (numItems > 0) playerInnateItems.set(item, numItems);
            else playerInnateItems.delete(item);
            break;
        }
    }

    static AddItemForRoom(player: EntityPlayer, item: CollectibleType) {
        let itemConfigItem = itemConfig.GetCollectible(item); if (!itemConfigItem) return;
        this.AddItem(player, item)
        let playerInnateRoomItems = defaultMapGetPlayer(v.run.RoomItems, player);
        Utils.defaultMapSetPred(playerInnateRoomItems, item, n => n + 1);
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
    RemoveInnateRoomItems() {
        getPlayers().forEach(player => {
            if (!mapHasPlayer(v.run.RoomItems, player)) return;
            let playerInnateRoomItems = defaultMapGetPlayer(v.run.RoomItems, player);
            if (playerInnateRoomItems.size == 0) return;
            for (const familiar of getFamiliars(FamiliarVariant.ITEM_WISP)) {
                if (familiar.Player.Index != player.Index) continue;
                let item = familiar.SubType;
                let num = playerInnateRoomItems.get(item) ?? 0;
                if (num > 0) {
                    InnateItems.RemoveItem(player, item);
                    playerInnateRoomItems.set(item, num - 1);
                }
            }
            playerInnateRoomItems.clear();
        });
    }

    static AddItemForLevel(player: EntityPlayer, item: CollectibleType) {
        let itemConfigItem = itemConfig.GetCollectible(item); if (!itemConfigItem) return;
        this.AddItem(player, item)
        let playerInnateLevelItems = defaultMapGetPlayer(v.run.LevelItems, player);
        Utils.defaultMapSetPred(playerInnateLevelItems, item, n => n + 1);
    }

    @CallbackCustom(ModCallbackCustom.POST_NEW_LEVEL_REORDERED)
    RemoveInnateLevelItems() {
        getPlayers().forEach(player => {
            if (!mapHasPlayer(v.run.LevelItems, player)) return;
            let playerInnateLevelItems = defaultMapGetPlayer(v.run.LevelItems, player);
            if (playerInnateLevelItems.size == 0) return;
            for (const familiar of getFamiliars(FamiliarVariant.ITEM_WISP)) {
                if (familiar.Player.Index != player.Index) continue;
                let item = familiar.SubType;
                let num = playerInnateLevelItems.get(item) ?? 0;
                if (num > 0) {
                    InnateItems.RemoveItem(player, item);
                    playerInnateLevelItems.set(item, num - 1);
                }
            }
            playerInnateLevelItems.clear();
        });
    }
}