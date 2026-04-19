import { CallbackPriority, CollectibleType, ModCallback, type UseFlag } from "isaac-typescript-definitions";
import { Callback, CallbackCustom, getPlayers, ModCallbackCustom, ModFeature, PriorityCallbackCustom } from "isaacscript-common";

export class PostPlayerRenderAbove extends ModFeature {
    v = {
        run: {
            shouldRender: 0
        }
    };

    static callbacks = new Array();

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_EARLY)
    NewRoomEarly() {
        // Stop render UI on transition and start on the second POST_PLAYER_RENDER (it is called after transition ended)
        this.v.run.shouldRender = 0;
    }

    @Callback(ModCallback.POST_RENDER)
    Render() {
        if (this.v.run.shouldRender < 2) return;
        getPlayers().forEach(player => {
            PostPlayerRenderAbove.callbacks.forEach(callback => callback(player));
        })
    }

    @CallbackCustom(ModCallbackCustom.POST_PLAYER_RENDER_REORDERED)
    StartRender(player: EntityPlayer) {
        this.v.run.shouldRender = math.min(++this.v.run.shouldRender, 2);
    }
}

export function CallbackPostPlayerRenderAbove() {
    return (target: ModFeature, propertyKey: string): void => {
        const methodName = propertyKey as keyof ModFeature;
        const method = target[methodName] as (player: EntityPlayer) => void;
        const boundMethod = method.bind(target);
        PostPlayerRenderAbove.callbacks.push(boundMethod);
    }
}

export class OnGlowingHourglassRewind extends ModFeature {
    static staticV = {
        run: {
            usedHourglass: false,
            customData: new Map<string, int>(),
            __ignoreGlowingHourGlass: true
        }
    }

    v = OnGlowingHourglassRewind.staticV;

    static callbacks = new Array();

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_REORDERED)
    NewRoomOnGlowingHourglassRewind() {
        if (this.v.run.usedHourglass) {
            this.v.run.usedHourglass = false;
            OnGlowingHourglassRewind.callbacks.forEach(callback => callback());
        }
    }

    @Callback(ModCallback.POST_USE_ITEM, CollectibleType.GLOWING_HOUR_GLASS)
    OnUseGlowingHourglass(collectibleType: CollectibleType, rng: RNG, player: EntityPlayer, useFlags: BitFlags<UseFlag>, activeSlot: int, customVarData: int): any {
        this.v.run.usedHourglass = true;
        return;
    }

    static setData(key: string, value: int) {
        this.staticV.run.customData.set(key, value);
    }
    static hasData(key: string) {
        return this.staticV.run.customData.has(key);
    }
    static getData(key: string) {
        return this.staticV.run.customData.get(key);
    }
    static deleteData(key: string) {
        this.staticV.run.customData.delete(key);
    }
}

export function CallbackOnGlowingHourglassRewind(callEarly: boolean) {
    return (target: ModFeature, propertyKey: string): void => {
        const methodName = propertyKey as keyof ModFeature;
        const method = target[methodName] as () => void;
        const boundMethod = method.bind(target);
        OnGlowingHourglassRewind.callbacks.push(boundMethod);
    }
}