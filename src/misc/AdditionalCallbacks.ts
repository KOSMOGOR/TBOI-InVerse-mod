import { ModCallback } from "isaac-typescript-definitions";
import { Callback, CallbackCustom, game, getPlayers, ModCallbackCustom, ModFeature } from "isaacscript-common";

export class PostPlayerRenderAbove extends ModFeature {
    v = {
        run: {
            shouldRender: 0
        }
    };

    static callbacks = new Array();

    @CallbackCustom(ModCallbackCustom.POST_NEW_ROOM_EARLY)
    NewRoomEarly() {
        // Stop render UI on transition and start on the second POST_PLAYER_RENDER (it called after transition)
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