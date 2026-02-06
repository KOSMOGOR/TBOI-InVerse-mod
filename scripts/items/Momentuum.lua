local mod = InVerse
local callbacks = {}

local function PrepareEntity(ent)
    ent:ToNPC().CanShutDoors = false
    ent:ClearEntityFlags(EntityFlag.FLAG_APPEAR)
    ent:AddEntityFlags(EntityFlag.FLAG_NO_BLOOD_SPLASH)
    ent.EntityCollisionClass = EntityCollisionClass.ENTCOLL_NONE;
    ent.GridCollisionClass = --[[GridCollisionClass.COLLISION_PIT and
                            GridCollisionClass.COLLISION_WALL and
                            GridCollisionClass.COLLISION_OBJECT and]] --
    GridCollisionClass.COLLISION_WALL_EXCEPT_PLAYER
end
local function IsMomentuumCard(card)
    return Isaac.GetCardIdByName("mom_fool") <= card and card <= Isaac.GetCardIdByName("mom_world")
end

mod.COLLECTIBLE_MOMENTUUM = Isaac.GetItemIdByName("Momentuum")
mod.COLLECTIBLE_GLITCHED_DECK = Isaac.GetItemIdByName("Glitched Deck")
mod.SOUND_MOMENTUUM_EXPLOSION = Isaac.GetSoundIdByName("MomentuumExplosion")
local DinfBreakVariant = Isaac.GetEntityVariantByName("DinfinityBreak")
local Momentuum = {
    Active = {},
    EntityType = Isaac.GetEntityTypeByName("Momentuum"),
    EntityVariant = Isaac.GetEntityVariantByName("Momentuum"),
    ExplosionVariant = Isaac.GetEntityVariantByName("MomentuumExplosion"),
    holdingTimer = {},
    lastFrameHolded = {}
}
local delayedPlay = {}
local needHold = 60
local chargeBars = {}
function callbacks:SDVMomentuum(player)
    local num = mod.GetPlayerNum(player)
    if Momentuum.holdingTimer[num] == nil then Momentuum.holdingTimer[num] = 0 end
    if chargeBars[num] == nil then
        chargeBars[num] = Sprite()
        chargeBars[num]:Load("gfx/chargebar.anm2", true)
        chargeBars[num].PlaybackSpeed = 0.5
    end
end
mod:AddCallback(ModCallbacks.MC_POST_PLAYER_UPDATE, callbacks.SDVMomentuum)

mod.TRINKET_MAGICIAN = Isaac.GetTrinketIdByName("Momentuum: I - The Magician")
mod.TRINKET_EMPRESS = Isaac.GetTrinketIdByName("Momentuum: III - The Empress")
local TrinketEmpress = {}
mod.TRINKET_HERMIT = Isaac.GetTrinketIdByName("Momentuum: IX - The Hermit")
mod.NULL_STRENGTH = Isaac.GetItemIdByName("MomentuumStrengthNull")
mod.TRINKET_DEVIL = Isaac.GetTrinketIdByName("Momentuum: XV - The Devil")
mod.COLLECTIBLE_MOON = Isaac.GetItemIdByName("Momentuum-Moon")
mod.TRINKET_SUN = Isaac.GetTrinketIdByName("Momentuum: XIX - The Sun")
local deaths = {}

local function FindRooms(roomType, isClear)
    local arr = {}
    local idxs = {}
    local rooms = Game():GetLevel():GetRooms()
    for i = 0, #rooms - 1 do
        for _, j in pairs({ 0, 1, 13, 14 }) do
            local room = Game():GetLevel():GetRoomByIdx(rooms:Get(i).SafeGridIndex + j)
            if room and room.ListIndex ~= -1 and rooms:Get(room.ListIndex) and rooms:Get(room.ListIndex).Data.Type == roomType and (isClear == nil or isClear == rooms:Get(room.ListIndex).Clear) and not idxs[room.SafeGridIndex] then
                table.insert(arr, room)
                idxs[room.SafeGridIndex] = true
            end
        end
    end
    return arr
end

function callbacks:EvaluateItems(player, cacheFlag)
    local num = mod.GetPlayerNum(player)
    if cacheFlag == CacheFlag.CACHE_DAMAGE then
        if player:HasCollectible(mod.NULL_STRENGTH) then
            player.Damage = player.Damage * mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH), 2.5, 2)
        end
    elseif cacheFlag == CacheFlag.CACHE_TEARCOLOR then
        if player:HasTrinket(mod.TRINKET_MAGICIAN) then
            player.TearColor = Color(0.4, 0.15, 0.38, 1, 0.27843, 0, 0.4549)
        end
        if mod.Data.Players[num].HangedMan then
            player.TearColor = Color(1.5, 2, 2, 0.5, 0, 0, 0)
        end
    elseif cacheFlag == CacheFlag.CACHE_TEARFLAG then
        if player:HasTrinket(mod.TRINKET_MAGICIAN) then
            player.TearFlags = player.TearFlags | TearFlags.TEAR_HOMING
        end
        if mod.Data.Players[num].HangedMan then
            player.TearFlags = player.TearFlags | TearFlags.TEAR_SPECTRAL
            if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
                player.TearFlags = player.TearFlags | TearFlags.TEAR_PIERCING
            end
        end
    end
end
mod:AddCallback(ModCallbacks.MC_EVALUATE_CACHE, callbacks.EvaluateItems)

function callbacks:MomentuumUse(_type, RNG, player)
    local num = mod.GetPlayerNum(player)
    if not Momentuum.Active[num] then
        player:AnimateCollectible(mod.COLLECTIBLE_MOMENTUUM, "LiftItem", "PlayerPickupSparkle")
        Momentuum.Active[num] = true
        return { Discharge = false }
    else
        player:AnimateCollectible(mod.COLLECTIBLE_MOMENTUUM, "HideItem", "PlayerPickupSparkle")
        Momentuum.Active[num] = false
        return { Discharge = false }
    end
end
function callbacks:MomentuumHolding(player)
    local num = mod.GetPlayerNum(player)
    if Momentuum.Active[num] and player:HasCollectible(mod.COLLECTIBLE_MOMENTUUM) and Input.IsActionPressed(ButtonAction.ACTION_ITEM, player.ControllerIndex) and player:GetCard(0) ~= 0 and not IsMomentuumCard(player:GetCard(0)) then
        if Momentuum.lastFrameHolded[num] then
            Momentuum.holdingTimer[num] = Momentuum.holdingTimer[num] + 1
        else
            Momentuum.lastFrameHolded[num] = true
            Momentuum.holdingTimer[num] = 0
        end
    elseif not Input.IsButtonPressed(ButtonAction.ACTION_ITEM, player.ControllerIndex) then
        Momentuum.holdingTimer[num] = 0
        Momentuum.lastFrameHolded[num] = false
    end
    if Momentuum.holdingTimer[num] == needHold then
        player:RemoveCollectible(mod.COLLECTIBLE_MOMENTUUM)
        AbsorbCard(player)
        if player:HasCollectible(CollectibleType.COLLECTIBLE_BOOK_OF_VIRTUES) then
            player:AddWisp(mod.COLLECTIBLE_MOMENTUUM, player.Position)
        end
        player:AnimateCollectible(mod.COLLECTIBLE_MOMENTUUM, "HideItem", "PlayerPickupSparkle")
        Momentuum.Active[num] = false
        Momentuum.holdingTimer[num] = 0
    end
end
function callbacks:RenderChargeBar(player, offset)
    local num = mod.GetPlayerNum(player)
    if not Momentuum.holdingTimer[num] then return end
    if Momentuum.holdingTimer[num] > 10 and Momentuum.holdingTimer[num] < needHold then
        local perc = math.floor(100.0 * Momentuum.holdingTimer[num] / needHold)
        if perc < 99 then
            chargeBars[num]:SetFrame("Charging", perc)
        end
    elseif not Momentuum.lastFrameHolded[num] and --[[holdingTimer[num] == needHold and]] not chargeBars[num]:IsPlaying("Disappear") and not chargeBars[num]:IsFinished("Disappear") then
        chargeBars[num]:Play("Disappear", true)
    end
    chargeBars[num]:Render(Isaac.WorldToRenderPosition(player.Position) + Vector(20, -30) + offset, Vector.Zero, Vector.Zero)
    chargeBars[num]:Update()
end
mod:AddCallback(ModCallbacks.MC_POST_PLAYER_RENDER, callbacks.RenderChargeBar)
function AbsorbCard(player)
    local itemConfig = Isaac.GetItemConfig()
    local card = player:GetCard(0)
    local num = mod.GetPlayerNum(player)
    if card then
        if card >= 56 and card <= 77 then
            card = card - 55
        elseif card > 22 then
            card = mod.rand(1, 22)
        end
        SFXManager():Play(SoundEffect.SOUND_POWERUP1)
        local newCard = 0
        for i = 1, #itemConfig:GetCards() do
            local el = itemConfig:GetCard(i)
            local cards = {
                [Card.CARD_FOOL] = "Momentuum: 0 - The Fool",
                [Card.CARD_HIGH_PRIESTESS] = "Momentuum: II - The High Priestess",
                [Card.CARD_EMPEROR] = "Momentuum: IV - The Emperor",
                [Card.CARD_HIEROPHANT] = "Momentuum: V - The Hierophant",
                [Card.CARD_LOVERS] = "Momentuum: VI - The Lovers",
                [Card.CARD_CHARIOT] = "Momentuum: VII - The Chariot",
                [Card.CARD_JUSTICE] = "Momentuum: VIII - Justice",
                [Card.CARD_WHEEL_OF_FORTUNE] = "Momentuum: X - Wheel of Fortune",
                [Card.CARD_STRENGTH] = "Momentuum: XI - Strength",
                [Card.CARD_HANGED_MAN] = "Momentuum: XII - The Hanged Man",
                [Card.CARD_DEATH] = "Momentuum: XIII - Death",
                [Card.CARD_TEMPERANCE] = "Momentuum: XIV - Temperance",
                [Card.CARD_TOWER] = "Momentuum: XVI - The Tower",
                [Card.CARD_STARS] = "Momentuum: XVII - The Stars",
                [Card.CARD_MOON] = "Momentuum: XVIII - The Moon",
                [Card.CARD_JUDGEMENT] = "Momentuum: XX - Judgement",
                [Card.CARD_WORLD] = "Momentuum: XXI - The World"
            }
            if el and cards[card] == el.Name then
                newCard = el.ID
                mod.Data.GlobalData.CardsCanSpawn[el.HudAnim] = true
                break
            end
        end
        if newCard == 0 then
            if card == Card.CARD_MAGICIAN then
                player:DropTrinket(player.Position, true)
                player:AddTrinket(mod.TRINKET_MAGICIAN)
                mod.Data.GlobalData.TrinketsCanSpawn["Momentuum: I - The Magician"] = true
            elseif card == Card.CARD_EMPRESS then
                player:DropTrinket(player.Position, true)
                player:AddTrinket(mod.TRINKET_EMPRESS)
                mod.Data.GlobalData.TrinketsCanSpawn["Momentuum: III - The Empress"] = true
            elseif card == Card.CARD_HERMIT then
                player:DropTrinket(player.Position, true)
                player:AddTrinket(mod.TRINKET_HERMIT)
                if player:HasTrinket(mod.TRINKET_HERMIT) then
                    local rooms = FindRooms(RoomType.ROOM_SHOP, false)
                    for i = 1, #rooms do
                        rooms[i].DisplayFlags = 5
                    end
                    Game():GetLevel():UpdateVisibility()
                end
                mod.Data.GlobalData.TrinketsCanSpawn["Momentuum: IX - The Hermit"] = true
            elseif card == Card.CARD_DEVIL then
                player:DropTrinket(player.Position, true)
                player:AddTrinket(mod.TRINKET_DEVIL)
                player:UseActiveItem(CollectibleType.COLLECTIBLE_BOOK_OF_BELIAL, UseFlag.USE_NOANIM)
                player:UseActiveItem(CollectibleType.COLLECTIBLE_BOOK_OF_BELIAL, UseFlag.USE_NOANIM)
                if player:HasCollectible(CollectibleType.COLLECTIBLE_MOMS_BOX) then
                    player:UseActiveItem(CollectibleType.COLLECTIBLE_BOOK_OF_BELIAL, UseFlag.USE_NOANIM)
                end
                SFXManager():Stop(SoundEffect.SOUND_DEVIL_CARD)
                mod.Data.GlobalData.TrinketsCanSpawn["Momentuum: XV - The Devil"] = true
            elseif card == Card.CARD_SUN then
                player:DropTrinket(player.Position, true)
                player:AddTrinket(mod.TRINKET_SUN)
                mod.Data.GlobalData.TrinketsCanSpawn["Momentuum: XIX - The Sun"] = true
            end
        end
        player:SetCard(0, newCard)
    end
end
function callbacks:MomentuumThrow(player)
    if Momentuum.Active[mod.GetPlayerNum(player)] and player:HasCollectible(mod.COLLECTIBLE_MOMENTUUM) and player:GetShootingJoystick():Length() > 0.1 then
        Momentuum.Active[mod.GetPlayerNum(player)] = false
        local throwVec = player:GetShootingJoystick():Normalized() * 20 + player.Velocity
        local ThrowEntity = Isaac.Spawn(Momentuum.EntityType, Momentuum.EntityVariant, 0, player.Position, throwVec, player)
        PrepareEntity(ThrowEntity)
        ThrowEntity:ToNPC():PlaySound(38, 0.8, 0, false, 1)
        player:AnimateCollectible(mod.COLLECTIBLE_MOMENTUUM, "HideItem", "Idle")
        ThrowEntity:ToNPC().V1 = throwVec
        ThrowEntity:ToNPC().I1 = 15
        ThrowEntity:ToNPC().SpriteOffset = Vector(0, -20)
        ThrowEntity:ToNPC():GetSprite().PlaybackSpeed = 0.5
        ThrowEntity:ToNPC().Parent = player
        if player:HasCollectible(CollectibleType.COLLECTIBLE_BOOK_OF_VIRTUES) then
            player:AddWisp(mod.COLLECTIBLE_MOMENTUUM, player.Position, false, true)
        end
        for slot = 0, 3 do
            if player:GetActiveItem(slot) == mod.COLLECTIBLE_MOMENTUUM then
                player:RemoveCollectible(mod.COLLECTIBLE_MOMENTUUM, false, slot)
                break
            end
        end
    end
end
local function MomentuumWallDeath(npc)
    local exp = Isaac.Spawn(1000, Momentuum.ExplosionVariant, 0, npc.Position + npc.Velocity * 0.8, Vector.Zero, nil)
    exp:GetSprite():Play('Up', true)
    exp:GetSprite().PlaybackSpeed = 0.6
    if math.abs(npc.Velocity.Y) > math.abs(npc.Velocity.X) then
        if npc.Velocity.Y >= 0 then exp:GetSprite().Rotation = 180 end
    else
        exp:GetSprite().Rotation = exp:GetSprite().Rotation + 90
        if npc.Velocity.X < 0 then exp:GetSprite().Rotation = exp:GetSprite().Rotation + 180 end
    end
    SFXManager():Play(mod.SOUND_MOMENTUUM_EXPLOSION)
    npc:Remove()
end
function callbacks:MomentuumDeath(npc)
    local exp = Isaac.Spawn(1000, Momentuum.ExplosionVariant, 0, npc.Position, Vector.Zero, nil)
    exp:GetSprite().PlaybackSpeed = 0.8
    SFXManager():Play(mod.SOUND_MOMENTUUM_EXPLOSION)
end
function callbacks:MomentuumBehavior(npc)
    if npc.I1 > 0 then
        npc.I1 = npc.I1 - 1
        npc.SpriteOffset = Vector(0, -npc.I1)
        npc.RenderZOffset = npc.I1
        npc.Velocity = npc.V1

        local dis = 30
        local enemies = Isaac.FindInRadius(npc.Position, dis, EntityPartition.ENEMY)
        for i = 1, #enemies do
            if enemies[i].Type == EntityType.ENTITY_GIDEON then
                Isaac.Spawn(EntityType.ENTITY_TEAR, TearVariant.CHAOS_CARD, 0, npc.Position, Vector.Zero, nil)
                return npc:Die()
            elseif not enemies[i]:HasEntityFlags(EntityFlag.FLAG_FRIENDLY) and enemies[i].Type ~= EntityType.ENTITY_SHOPKEEPER then
                enemies[i]:Kill()
                Isaac.GetPlayer(1):UseCard(Card.CARD_DEATH, UseFlag.USE_NOANIM | UseFlag.USE_NOANNOUNCER)
                return npc:Die()
            elseif enemies[i]:HasEntityFlags(EntityFlag.FLAG_FRIENDLY) then
                Isaac.GetPlayer(1):UseActiveItem(CollectibleType.COLLECTIBLE_DELIRIOUS, UseFlag.USE_NOANIM | UseFlag.USE_NOCOSTUME)
                return npc:Die()
            end
        end
        local pickups = Isaac.FindInRadius(npc.Position, dis, EntityPartition.PICKUP)
        for i = 1, #pickups do
            if pickups[i].Type == EntityType.ENTITY_PICKUP then
                pickups[i] = pickups[i]:ToPickup()
                if pickups[i].Price and pickups[i].Price ~= 0 then
                    local allPickups = Isaac.FindByType(EntityType.ENTITY_PICKUP)
                    for j = 1, #allPickups do
                        if allPickups[j]:ToPickup().Price ~= 0 then
                            allPickups[j]:ToPickup().Price = 0
                        end
                    end
                    return npc:Die()
                elseif pickups[i].Variant == PickupVariant.PICKUP_COLLECTIBLE then
                    if pickups[i].SubType == mod.COLLECTIBLE_DREAMS_DREAM_BOOK_ACTIVE then
                        pickups[i]:Morph(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_COLLECTIBLE, mod.COLLECTIBLE_DREAMS_DREAM_BOOK_PASSIVE)
                    elseif mod.trueTable({CollectibleType.COLLECTIBLE_DECK_OF_CARDS, CollectibleType.COLLECTIBLE_STARTER_DECK, CollectibleType.COLLECTIBLE_BOOSTER_PACK})[pickups[i].SubType] and mod.Data.GlobalData.ItemsCanSpawn["Glitched Deck"] then
                        pickups[i]:Morph(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_COLLECTIBLE, mod.COLLECTIBLE_GLITCHED_DECK)
                        --mod.Data.GlobalData.ItemsCanSpawn["Glitched Deck"] = true
                    elseif Isaac.GetItemConfig():GetCollectible(pickups[i].SubType).Quality == 0 then
                        Isaac.GetPlayer(1):UseCard(Card.RUNE_BLACK, UseFlag.USE_NOANIM | UseFlag.USE_NOANNOUNCER)
                    elseif Isaac.GetItemConfig():GetCollectible(pickups[i].SubType).Quality == 1 then
                        Isaac.Spawn(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_COLLECTIBLE, pickups[i].SubType, pickups[i].Position, Vector.Zero, pickups[i])
                        Isaac.GetPlayer(1):UseCard(Card.RUNE_BLACK, UseFlag.USE_NOANIM | UseFlag.USE_NOANNOUNCER)
                    else
                        Isaac.Spawn(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_COLLECTIBLE, pickups[i].SubType,
                            Game():GetRoom():FindFreePickupSpawnPosition(pickups[i].Position, dis, false, false), Vector.Zero, pickups[i])
                    end
                    return npc:Die()
                end
            end
        end
        local entities = Isaac.FindInRadius(npc.Position, dis)
        for i = 1, #entities do
            if entities[i].Type == EntityType.ENTITY_SHOPKEEPER then
                local player = Isaac.GetPlayer(1)
                mod.AddTrinketAsItem(player, TrinketType.TRINKET_RIB_OF_GREED)
                entities[i]:Kill()
                return npc:Die()
            elseif entities[i].Type == EntityType.ENTITY_PLAYER and entities[i]:ToPlayer():GetPlayerType() == mod.PLAYER_DREAM and not npc:HasCommonParentWithEntity(entities[i])
                and (entities[i]:ToPlayer():GetActiveItem() == 0 or entities[i]:ToPlayer():HasCollectible(CollectibleType.COLLECTIBLE_SCHOOLBAG) and entities[i]:ToPlayer():GetActiveItem(ActiveSlot.SLOT_SECONDARY) == 0) and not entities[i]:ToPlayer():IsCoopGhost() then
                entities[i]:ToPlayer():AddCollectible(mod.COLLECTIBLE_MOMENTUUM)
                entities[i]:ToPlayer():AnimateCollectible(mod.COLLECTIBLE_MOMENTUUM)
                return npc:Remove()
            elseif entities[i].Type == EntityType.ENTITY_PLAYER and not npc:HasCommonParentWithEntity(entities[i]) and not entities[i]:ToPlayer():IsCoopGhost() then
                entities[i]:ToPlayer():AddCollectible(CollectibleType.COLLECTIBLE_1UP)
                return npc:Die()
            end
        end
        for i = 0, 7 do
            local door = Game():GetRoom():GetDoor(i)
            if door and not door:IsOpen() and door.Position:Distance(npc.Position) <= dis * 1.5 then
                door:SetLocked(false)
                door:Open()
                return MomentuumWallDeath(npc)
            elseif Game():GetRoom():IsDoorSlotAllowed(i) and not door and
                Game():GetRoom():GetDoorSlotPosition(i):Distance(npc.Position) <= dis * 1.5 then
                if Game():GetLevel():MakeRedRoomDoor(Game():GetLevel():GetCurrentRoomIndex(), i) then
                    return MomentuumWallDeath(npc)
                end
            end
        end
        for i = 1, Game():GetRoom():GetGridSize() do
            local gent = Game():GetRoom():GetGridEntity(i)
            if gent and (gent:ToRock() ~= nil or gent:GetType() == GridEntityType.GRID_LOCK) and gent.State ~= 2 and gent.Position:Distance(npc.Position) <= dis then
                for j = 1, Game():GetRoom():GetGridSize() do
                    local gent1 = Game():GetRoom():GetGridEntity(j)
                    if gent1 and gent1:ToRock() and gent1.State ~= 2 then
                        gent1:SetType(2)
                        gent1:Destroy(false)
                    elseif gent1 and gent1:GetType() == GridEntityType.GRID_LOCK then
                        Game():GetRoom():RemoveGridEntity(j, 2, true)
                    end
                end
                return npc:Die()
            elseif gent and gent:GetType() == GridEntityType.GRID_TRAPDOOR and gent.Position:Distance(npc.Position) <= dis then
                Game():GetPlayer(0):UseActiveItem(CollectibleType.COLLECTIBLE_FORGET_ME_NOW)
                return npc:Die()
            end
        end
        if Game():GetRoom():GetGridCollisionAtPos(npc.Position + npc.Velocity / 2) == GridCollisionClass.COLLISION_WALL then
            Game():GetRoom():MamaMegaExplosion(npc.Position)
            return MomentuumWallDeath(npc)
        end
    else
        local pos = npc.Position
        if pos.X > Game():GetRoom():GetGridWidth() * 37 then
            pos = pos - Vector(20, 0)
        end
        if pos.X <= 60 then
            pos = pos + Vector(20, 0)
        end
        if pos.Y > Game():GetRoom():GetGridHeight() * 37 then
            pos = pos - Vector(0, 20)
        end
        if pos.Y <= 60 then
            pos = pos + Vector(0, 20)
        end
        Game():GetRoom():SpawnGridEntity(Game():GetRoom():GetGridIndex(pos), GridEntityType.GRID_STAIRS, 0, 0, 0)
        npc:Die()
    end
end
function callbacks:MomentuumRevive(player)
    for slot = 0, 3 do
        if player:IsDead() and player:GetActiveItem(slot) == mod.COLLECTIBLE_MOMENTUUM and player:GetSprite():IsFinished(player:GetSprite():GetAnimation()) then
            player:Revive()
            player:AddHearts(player:GetEffectiveMaxHearts() - player:GetHearts())
            player:UseActiveItem(CollectibleType.COLLECTIBLE_BOOK_OF_SHADOWS, UseFlag.USE_NOANIM)
            player:AnimateCollectible(mod.COLLECTIBLE_MOMENTUUM)
            player.Visible = true
            player:RemoveCollectible(mod.COLLECTIBLE_MOMENTUUM, false, slot)
            break
        end
    end
end
mod:AddCallback(ModCallbacks.MC_USE_ITEM, callbacks.MomentuumUse, mod.COLLECTIBLE_MOMENTUUM)
mod:AddCallback(ModCallbacks.MC_POST_PLAYER_UPDATE, callbacks.MomentuumHolding)
mod:AddCallback(ModCallbacks.MC_POST_PLAYER_UPDATE, callbacks.MomentuumThrow)
mod:AddCallback(ModCallbacks.MC_NPC_UPDATE, callbacks.MomentuumBehavior, Momentuum.EntityType)
mod:AddCallback(ModCallbacks.MC_POST_NPC_DEATH, callbacks.MomentuumDeath, Momentuum.EntityType)
mod:AddCallback(ModCallbacks.MC_POST_PLAYER_UPDATE, callbacks.MomentuumRevive)
mod:AddCallback(ModCallbacks.MC_ENTITY_TAKE_DMG, function(_, player, damageAmount, damageFlags, damageSource, damageCountdownFrames)
    Momentuum.Active[mod.GetPlayerNum(player)] = false
end, EntityType.ENTITY_PLAYER)
mod:AddCallback(ModCallbacks.MC_POST_NEW_ROOM, function()
    for i = 1, 8 do Momentuum.Active[i] = false end
end, EntityType.ENTITY_PLAYER)

function callbacks:MomentuumWisps(player, damageAmount, damageFlags, damageSource, damageCountdownFrames)
    player = player:ToPlayer()
    --[[for i = 1, 32 do
        if damageFlags & (1 << i) == 1 << i then
            print(i)
        end
    end]]
    if damageFlags & DamageFlag.DAMAGE_NO_MODIFIERS == DamageFlag.DAMAGE_NO_MODIFIERS then
        return
    end
    if damageAmount > 1 then
        local wisps = Isaac.FindByType(EntityType.ENTITY_FAMILIAR, FamiliarVariant.WISP)
        for _, wisp in pairs(wisps) do
            if wisp.SubType == mod.COLLECTIBLE_MOMENTUUM and wisp:ToFamiliar().Player.Index == player.Index then
                player:TakeDamage(1, damageFlags | DamageFlag.DAMAGE_NO_MODIFIERS, damageSource, damageCountdownFrames)
                return false
            end
        end
    end
end
mod:AddCallback(ModCallbacks.MC_ENTITY_TAKE_DMG, callbacks.MomentuumWisps, EntityType.ENTITY_PLAYER)

function callbacks:OnPlayerUpdate(player)
    local num = mod.GetPlayerNum(player)
    if mod.Data.Players[num].Priestess and Game():GetFrameCount() - mod.Data.Players[num].Priestess >= 60 then
        player:UseCard(Card.CARD_HIGH_PRIESTESS, UseFlag.USE_NOANIM | UseFlag.USE_NOANNOUNCER)
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            player:UseCard(Card.CARD_HIGH_PRIESTESS, UseFlag.USE_NOANIM | UseFlag.USE_NOANNOUNCER)
        end
        mod.Data.Players[num].Priestess = Game():GetFrameCount()
    end
    if player:HasTrinket(mod.TRINKET_EMPRESS) and (player:GetHearts() + player:GetSoulHearts() <= 1 or player:HasCollectible(CollectibleType.COLLECTIBLE_MOMS_BOX)) then
        if TrinketEmpress[num] == nil or TrinketEmpress[num][1]:IsDead() or TrinketEmpress[num][2]:IsDead() or TrinketEmpress[num][3]:IsDead() then
            if TrinketEmpress[num] ~= nil then
                TrinketEmpress[num][1]:Die()
                TrinketEmpress[num][2]:Die()
                TrinketEmpress[num][3]:Die()
            end
            TrinketEmpress[num] = {
                Isaac.Spawn(EntityType.ENTITY_FAMILIAR, FamiliarVariant.INCUBUS, 0, player.Position, Vector(0, 0), player),
                Isaac.Spawn(EntityType.ENTITY_FAMILIAR, FamiliarVariant.TWISTED_BABY, 0, player.Position, Vector(0, 0), player),
                Isaac.Spawn(EntityType.ENTITY_FAMILIAR, FamiliarVariant.TWISTED_BABY, 0, player.Position, Vector(0, 0), player)
            }
        end
    end
    if player:HasTrinket(mod.TRINKET_HERMIT) then
        if Game():GetRoom():IsClear() then
            for i = 1, Game():GetRoom():GetGridSize() do
                local gent = Game():GetRoom():GetGridEntity(i)
                if gent and gent:ToDoor() and gent:ToDoor():IsRoomType(RoomType.ROOM_SHOP) and gent:ToDoor():IsLocked() then
                    gent:ToDoor():SetLocked(false)
                    gent:ToDoor():Open()
                end
            end
        end
    end
    if mod.Data.Players[num].Temperance and not player:HasCollectible(CollectibleType.COLLECTIBLE_IV_BAG) then
        local entities = Game():GetRoom():GetEntities()
        for i = 0, #entities - 1 do
            local ent = entities:Get(i)
            if ent and ent.Type == EntityType.ENTITY_PICKUP and ent.Variant == PickupVariant.PICKUP_COLLECTIBLE and ent.SubType == CollectibleType.COLLECTIBLE_IV_BAG then
                ent:Remove()
                break
            end
        end
        player:TryRemoveTrinket(TrinketType.TRINKET_PANIC_BUTTON)
        local hearts = mod.rand(2, 20) * mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_CAR_BATTERY), 2, 1)
        for i = 1, hearts do
            local pos = Vector(1, 0):Resized(mod.rand(40, 100)):Rotated(mod.rand(0, 360))
            local heart = Isaac.Spawn(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_HEART, HeartSubType.HEART_HALF, player.Position + pos, Vector.Zero, player):ToPickup()
            heart.Timeout = 60
        end
        mod.Data.Players[num].Temperance = nil
    end
    if mod.Data.Players[num].Tower ~= nil then
        mod.Data.Players[num].Tower = mod.Data.Players[num].Tower + 1
        if mod.Data.Players[num].Tower == 30 then
            local flags = {TearFlags.TEAR_HOMING, TearFlags.TEAR_POISON, TearFlags.TEAR_SPLIT, TearFlags.TEAR_SAD_BOMB, TearFlags.TEAR_BUTT_BOMB, TearFlags.TEAR_GLITTER_BOMB, TearFlags.TEAR_SCATTER_BOMB, TearFlags.TEAR_CROSS_BOMB, TearFlags.TEAR_JACOBS, TearFlags.TEAR_BLOOD_BOMB, TearFlags.TEAR_BRIMSTONE_BOMB, TearFlags.TEAR_GHOST_BOMB, TearFlags.TEAR_GIGA_BOMB, TearFlags.TEAR_FAST_BOMB}
            local flagInd = mod._if(mod.rand(1, 20) <= mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH), 4, 1), mod.rand(1, #flags), 0)
            local variant = 0
            if flags[flagInd] == TearFlags.TEAR_GIGA_BOMB then
                variant = BombVariant.BOMB_GIGA
            end
            local bomb = Isaac.Spawn(EntityType.ENTITY_BOMB, variant, 0, player.Position, Vector.Zero, player):ToBomb()
            bomb:AddTearFlags(mod._if(flagInd == 0, 0, flags[flagInd]))
            mod.Data.Players[num].Tower = 0
        end
    end
    if num == 1 then
        for sound in pairs(delayedPlay) do
            delayedPlay[sound] = delayedPlay[sound] - 1
            if delayedPlay[sound] == 0 then
                SFXManager():Play(sound)
                delayedPlay[sound] = nil
            end
        end
        for i, death in pairs(deaths) do
            if death and death:Exists() and death.HitPoints > 0 then
                death.HitPoints = death.HitPoints - 0.2
            else
                if death and death:Exists() then
                    death:Die()
                end
                deaths[i] = nil
            end
        end
    end
end

mod:AddCallback(ModCallbacks.MC_POST_PLAYER_UPDATE, callbacks.OnPlayerUpdate)

function callbacks:OnNewRoom()
    if mod.Data.Cards.TheFool and mod.Data.Cards.TheFool == Game():GetLevel():GetCurrentRoomDesc().SafeGridIndex then
        Isaac.Spawn(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_TAROTCARD, Isaac.GetCardIdByName("mom_fool"),
            Game():GetRoom():FindFreePickupSpawnPosition(Game():GetRoom():GetRandomPosition(0), 0, false, false), Vector.Zero, nil)
    end
    for i = 0, Game():GetNumPlayers() - 1 do
        local player = Isaac.GetPlayer(i)
        local num = mod.GetPlayerNum(player)
        if player:HasTrinket(mod.TRINKET_EMPRESS) and player:GetHearts() + player:GetSoulHearts() > 1 or not player:HasTrinket(mod.TRINKET_EMPRESS) then
            if TrinketEmpress[num] then
                TrinketEmpress[num][1]:Die()
                TrinketEmpress[num][2]:Die()
                TrinketEmpress[num][3]:Die()
                TrinketEmpress[num] = nil
            end
        end
        if mod.Data.Players[num].Chariot and Game():GetRoom():GetAliveEnemiesCount() > 0 then
            player:UseActiveItem(CollectibleType.COLLECTIBLE_UNICORN_STUMP, UseFlag.USE_NOANIM)
        end
        if player:HasTrinket(mod.TRINKET_HERMIT) then
            local room = Game():GetRoom()
            if room:GetType() == RoomType.ROOM_SHOP and room:IsFirstVisit() then
                player:AddCollectible(CollectibleType.COLLECTIBLE_CHAOS, 0, false)
                player:UseActiveItem(CollectibleType.COLLECTIBLE_D6, UseFlag.USE_NOANIM)
                player:RemoveCollectible(CollectibleType.COLLECTIBLE_CHAOS)
                local cards = {}
                for j, _ in pairs(mod.Data.GlobalData.CardsCanSpawn) do table.insert(cards, Isaac.GetCardIdByName(j)) end
                if player:HasCollectible(CollectibleType.COLLECTIBLE_MOMS_BOX) and #cards ~= 0 then
                    local entities = Game():GetRoom():GetEntities()
                    for i1 = 0, #entities - 1 do
                        local ent = entities:Get(i1)
                        if ent.Type == EntityType.ENTITY_PICKUP and ent.Variant == PickupVariant.PICKUP_TAROTCARD and not IsMomentuumCard(ent.SubType) then
                            ent:ToPickup():Morph(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_TAROTCARD, cards[mod.rand(1, #cards)], true, false, true)
                            Isaac.Spawn(1000, EffectVariant.POOF01, 0, ent.Position, Vector.Zero, nil)
                        end
                    end
                end
            end
        end
        if mod.Data.Players[num].Strength then
            local hearts
            if player:GetMaxHearts() >= mod.Data.Players[num].Strength then
                hearts = math.max(mod.Data.Players[num].Strength, player:GetMaxHearts() - mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH), 6, 4))
            else
                hearts = player:GetMaxHearts()
            end
            player:AddMaxHearts(hearts - player:GetMaxHearts(), true)
            if player.SpriteScale.Y >= 1.5 then
                player.SpriteScale = player.SpriteScale - Vector(1, 1)
            end
            mod.Data.Players[num].Strength = nil
        end
        if player:HasTrinket(mod.TRINKET_DEVIL) and Game():GetRoom():GetAliveEnemiesCount() > 0 then
            player:UseActiveItem(CollectibleType.COLLECTIBLE_BOOK_OF_BELIAL, UseFlag.USE_NOANIM)
            player:UseActiveItem(CollectibleType.COLLECTIBLE_BOOK_OF_BELIAL, UseFlag.USE_NOANIM)
            if player:HasCollectible(CollectibleType.COLLECTIBLE_MOMS_BOX) then
                player:UseActiveItem(CollectibleType.COLLECTIBLE_BOOK_OF_BELIAL, UseFlag.USE_NOANIM)
            end
            SFXManager():Stop(SoundEffect.SOUND_DEVIL_CARD)
        end
        mod.Data.Players[num].Priestess = nil
        mod.Data.Players[num].Tower = nil
    end
end
mod:AddCallback(ModCallbacks.MC_POST_NEW_ROOM, callbacks.OnNewRoom)

function callbacks:OnUseCard(card, player, flags)
    if flags & UseFlag.USE_CARBATTERY == UseFlag.USE_CARBATTERY then
        return
    end
    local cardName = Isaac.GetItemConfig():GetCard(card).Name
    local num = mod.GetPlayerNum(player)
    if cardName == "Momentuum: 0 - The Fool" then
        player:UseActiveItem(CollectibleType.COLLECTIBLE_TELEPORT_2, false)
        if mod.rand(1, 10) <= mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH), 8, 6) then
            local room = Game():GetLevel():GetRandomRoomIndex(false, Random())
            mod.Data.Cards.TheFool = Game():GetLevel():GetRoomByIdx(room).SafeGridIndex
        else
            mod.Data.Cards.TheFool = nil
        end
    elseif cardName == "Momentuum: II - The High Priestess" then
        mod.Data.Players[num].Priestess = Game():GetFrameCount()
    elseif cardName == "Momentuum: IV - The Emperor" then
        mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_THERES_OPTIONS)
        mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_EUCHARIST)
        mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_DUALITY)
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            --[[player:AddCollectible(CollectibleType.COLLECTIBLE_SOL)
            table.insert(mod.Data.Players[num].ItemsRemoveNextFloor, CollectibleType.COLLECTIBLE_SOL)]]
        mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_SOL)
        end
        local rooms = FindRooms(RoomType.ROOM_BOSS, false)
        for _, room in pairs(rooms) do
            room.DisplayFlags = 5
        end
        Game():GetLevel():UpdateVisibility()
    elseif cardName == "Momentuum: V - The Hierophant" then
        local enemies = {}
        local entities = Game():GetRoom():GetEntities()
        for i = 0, #entities - 1 do
            local ent = entities:Get(i)
            if ent:IsEnemy() then
                table.insert(enemies, ent)
            end
        end
        if #enemies >= 4 then
            for i = 1, #enemies do
                local ent = enemies[i]
                ent:Remove()
                local hst = mod._if(mod.rand(1, 2) == 1, HeartSubType.HEART_SOUL, HeartSubType.HEART_HALF_SOUL)
                Isaac.Spawn(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_HEART, hst, ent.Position, Vector.Zero, nil)
            end
        else
            player:AddSoulHearts(6)
        end
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            player:AddSoulHearts(4)
        end
    elseif cardName == "Momentuum: VI - The Lovers" then
        if player:GetSoulHearts() <= 1 then
            player:AddSoulHearts(2)
        end
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            player:AddSoulHearts(2)
        end
        if player:GetMaxHearts() == 0 then
            player:AddSoulHearts(6)
        end
        local count = math.floor(player:GetSoulHearts() / 2)
        for i = 1, count do
            player:UseActiveItem(CollectibleType.COLLECTIBLE_CONVERTER, UseFlag.USE_NOANIM)
        end
        player:SetFullHearts()
    elseif cardName == "Momentuum: VII - The Chariot" then
        --[[player:AddCollectible(CollectibleType.COLLECTIBLE_SACRIFICIAL_DAGGER)
        table.insert(mod.Data.Players[num].ItemsRemoveNextFloor, CollectibleType.COLLECTIBLE_SACRIFICIAL_DAGGER)]]
        mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_SACRIFICIAL_DAGGER)
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            --[[player:AddCollectible(CollectibleType.COLLECTIBLE_SACRIFICIAL_DAGGER)
            table.insert(mod.Data.Players[num].ItemsRemoveNextFloor, CollectibleType.COLLECTIBLE_SACRIFICIAL_DAGGER)]]
            mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_SACRIFICIAL_DAGGER)
        end
        mod.Data.Players[num].Chariot = true
    elseif cardName == "Momentuum: VIII - Justice" then
        local m = math.max(player:GetNumCoins(), player:GetNumBombs(), player:GetNumKeys(), mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH), player:GetHearts(), 0))
        player:AddCoins(m - player:GetNumCoins())
        player:AddBombs(m - player:GetNumBombs())
        player:AddKeys(m - player:GetNumKeys())
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            player:AddHearts(m - player:GetHearts())
        end
    elseif cardName == "Momentuum: X - Wheel of Fortune" then
        player:AddCollectible(CollectibleType.COLLECTIBLE_D_INFINITY)
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then player:AddCollectible(CollectibleType.COLLECTIBLE_BATTERY) end
        player:FullCharge()
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then player:RemoveCollectible(CollectibleType.COLLECTIBLE_BATTERY) end
        mod.Data.Players[num].WheelOfFortune = true
    elseif cardName == "Momentuum: XI - Strength" then
        mod.Data.Players[num].Strength = player:GetMaxHearts()
        local h = mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH), 6, 4)
        player:AddMaxHearts(h, true)
        player:AddHearts(h)
        mod.AddItemForRoom(player, mod.NULL_STRENGTH)
        mod.AddItemForRoom(player, CollectibleType.COLLECTIBLE_WAFER)
        mod.AddItemForRoom(player, CollectibleType.COLLECTIBLE_BLOODY_LUST)
        player.SpriteScale = player.SpriteScale + Vector(1, 1)
    elseif cardName == "Momentuum: XII - The Hanged Man" then
        mod.AddTrinketAsItem(player, TrinketType.TRINKET_FLAT_FILE)
        table.insert(mod.Data.Players[num].TrinketsRemoveNextFloor, TrinketType.TRINKET_FLAT_FILE)
        mod.AddItemForRoom(player, CollectibleType.COLLECTIBLE_TRANSCENDENCE)
        mod.Data.Players[num].HangedMan = true
        player:AddCacheFlags(CacheFlag.CACHE_TEARFLAG | CacheFlag.CACHE_TEARCOLOR)
    elseif cardName == "Momentuum: XIII - Death" then
        local ent = Isaac.Spawn(EntityType.ENTITY_DEATH, 0, 0, player.Position, Vector.Zero, player)
        ent:AddEntityFlags(EntityFlag.FLAG_FRIENDLY | EntityFlag.FLAG_PERSISTENT)
        table.insert(deaths, ent)
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            local ent2 = Isaac.Spawn(EntityType.ENTITY_DEATH, 0, 0, player.Position, Vector.Zero, player)
            ent2:AddEntityFlags(EntityFlag.FLAG_FRIENDLY | EntityFlag.FLAG_PERSISTENT)
            table.insert(deaths, ent2)
        end
    elseif cardName == "Momentuum: XIV - Temperance" then
        player:AddCollectible(CollectibleType.COLLECTIBLE_IV_BAG)
        mod.AddTrinketAsItem(player, TrinketType.TRINKET_PANIC_BUTTON)
        mod.Data.Players[num].Temperance = true
    elseif cardName == "Momentuum: XVI - The Tower" then
        mod.Data.Players[num].Tower = 0
        mod.AddItemForRoom(player, CollectibleType.COLLECTIBLE_HOST_HAT)
    elseif cardName == "Momentuum: XVII - The Stars" then
        mod.AddItemForRoom(player, CollectibleType.COLLECTIBLE_SACRED_ORB)
        mod.AddItemForRoom(player, CollectibleType.COLLECTIBLE_GLITCHED_CROWN)
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            mod.AddItemForRoom(player, CollectibleType.COLLECTIBLE_MORE_OPTIONS)
        end
        player:UseCard(Card.CARD_STARS, UseFlag.USE_NOANIM | UseFlag.USE_NOANNOUNCER)
    elseif cardName == "Momentuum: XVIII - The Moon" then
        player:AddCollectible(mod.COLLECTIBLE_MOON)
        --mod.Data.GlobalData.ItemsCanSpawn["Momentuum-Moon"] = true
    elseif cardName == "Momentuum: XX - Judgement" then
        if not player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            for _, beg in pairs({4, 5, 7, 9, 13, 18}) do
                local place = Game():GetRoom():FindFreePickupSpawnPosition(player.Position - Vector(0, 60), 30, true)
                Isaac.Spawn(EntityType.ENTITY_SLOT, beg, 0, place, Vector.Zero, nil)
                Isaac.Spawn(1000, EffectVariant.POOF01, 0, place, Vector.Zero, nil)
            end
        else
            local room = Game():GetRoom()
            local doors = {}
            local entities = Isaac.GetRoomEntities()
            for i = 0, 7 do
                local door = Game():GetRoom():GetDoor(i)
                if door and (door:IsOpen() or not door:IsRoomType(RoomType.ROOM_SECRET) and not door:IsRoomType(RoomType.ROOM_SUPERSECRET)) then
                    table.insert(doors, door.Position)
                end
            end
            for i = 1, #entities do
                if entities[i].Type == 1000 then
                    entities[i] = nil
                else
                    entities[i] = entities[i].Position
                end
            end
            for i = 1, Game():GetRoom():GetGridSize() do
                local pos = room:GetGridPosition(i - 1)
                local pos1 = room:FindFreePickupSpawnPosition(pos, 15, true)
                local f = true
                for j = 1, #doors do
                    if pos:Distance(doors[j]) <= 40 then
                        f = false
                    end
                end
                for j = 1, #entities do
                    if entities[j] and pos:Distance(entities[j]) <= 30 then
                        f = false
                    end
                end
                if pos.X == pos1.X and pos.Y == pos1.Y and f then
                    Isaac.Spawn(EntityType.ENTITY_SLOT, ({4, 5, 7, 9, 13, 18})[mod.rand(1, 6)], 0, pos, Vector.Zero, nil)
                    Isaac.Spawn(1000, EffectVariant.POOF01, 0, pos, Vector.Zero, nil)
                end
            end
        end
    elseif cardName == "Momentuum: XXI - The World" then
        mod.AddTrinketAsItem(player, TrinketType.TRINKET_SHINY_ROCK)
        table.insert(mod.Data.Players[num].TrinketsRemoveNextFloor, TrinketType.TRINKET_SHINY_ROCK)
        mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_MIND)
        mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_XRAY_VISION)
        if player:HasCollectible(CollectibleType.COLLECTIBLE_TAROT_CLOTH) then
            mod.AddItemForFloor(player, CollectibleType.COLLECTIBLE_BLACK_CANDLE)
        end
    end
end
mod:AddCallback(ModCallbacks.MC_USE_CARD, callbacks.OnUseCard)

function callbacks:OnNewLevel()
    mod.Data.Cards.TheFool = nil
    for i = 0, Game():GetNumPlayers() - 1 do
        local player = Isaac.GetPlayer(i)
        local num = mod.GetPlayerNum(player)
        if mod.rand(1, 10) <= mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_MOMS_BOX), 2, 4) then
            player:TryRemoveTrinket(mod.TRINKET_MAGICIAN)
        end
        if player:HasTrinket(mod.TRINKET_EMPRESS) then
            player:AddRottenHearts(-player:GetRottenHearts())
            if player:GetHearts() ~= 0 then
                player:AddSoulHearts(-player:GetSoulHearts())
                player:AddHearts(-player:GetHearts() + 1)
            else
                player:AddSoulHearts(-player:GetSoulHearts() + 1)
            end
            if player:GetHearts() + player:GetSoulHearts() == 0 then
                player:AddHearts(1)
            end
        end
        if player:HasTrinket(mod.TRINKET_HERMIT) then
            local rooms = FindRooms(RoomType.ROOM_SHOP, false)
            for j = 1, #rooms do
                rooms[j].DisplayFlags = 5
            end
            Game():GetLevel():UpdateVisibility()
        end
        mod.Data.Players[num].Chariot = nil
        mod.Data.Players[num].HangedMan = nil
    end
end

mod:AddCallback(ModCallbacks.MC_POST_NEW_LEVEL, callbacks.OnNewLevel)

function callbacks:DInfUse(_type, RNG, player)
    local num = mod.GetPlayerNum(player)
    if mod.Data.Players[num].WheelOfFortune and mod.rand(1, 10) <= 2 then
        player:RemoveCollectible(CollectibleType.COLLECTIBLE_D_INFINITY)
        mod.Data.Players[num].WheelOfFortune = nil
        SFXManager():Play(SoundEffect.SOUND_MIRROR_BREAK)
        local ent = Isaac.Spawn(1000, DinfBreakVariant, 0, player.Position - Vector(0, 28), Vector.Zero, nil)
        ent.DepthOffset = 100
    end
end
mod:AddCallback(ModCallbacks.MC_USE_ITEM, callbacks.DInfUse, CollectibleType.COLLECTIBLE_D_INFINITY)

function callbacks:OnTakeDmg(player, damageAmount, damageFlags, damageSource, damageCountdownFrames)
    player = player:ToPlayer()
    if player:HasTrinket(mod.TRINKET_DEVIL) then
        if mod.rand(1, 20) <= mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_MOMS_BOX), 1, 2) then
            player:TryRemoveTrinket(mod.TRINKET_DEVIL)
        end
    end
    if player:HasTrinket(mod.TRINKET_SUN) then
        if player:GetHearts() + player:GetSoulHearts() <= 2 then
            player:UseCard(Card.CARD_SUN)
            player:AddBrokenHearts(1)
            if mod.rand(1, 10) <= mod._if(player:HasCollectible(CollectibleType.COLLECTIBLE_MOMS_BOX), 2, 4) then
                player:TryRemoveTrinket(mod.TRINKET_SUN)
            end
        end
    end
end
mod:AddCallback(ModCallbacks.MC_ENTITY_TAKE_DMG, callbacks.OnTakeDmg, EntityType.ENTITY_PLAYER)

function callbacks:OnUseMoon(_type, RNG, player, flags)
    if flags & UseFlag.USE_CARBATTERY == UseFlag.USE_CARBATTERY then
        return
    end
    local num = mod.GetPlayerNum(player)
    local rooms1 = FindRooms(RoomType.ROOM_SECRET)
    for _, room in pairs(rooms1) do
        --print('s', room.VisitedCount, room.Clear, room.Data.Type == RoomType.ROOM_SECRET)
        if room.VisitedCount == 0 then
            player:AnimateTeleport(false)
            delayedPlay[SoundEffect.SOUND_HELL_PORTAL2] = 20
            Game():GetLevel():ChangeRoom(room.SafeGridIndex)
            return
        end
    end
    local rooms2 = FindRooms(RoomType.ROOM_SUPERSECRET)
    for _, room in pairs(rooms2) do
        --print('ss', room.VisitedCount, room.Clear, room.Data.Type == RoomType.ROOM_SUPERSECRET)
        if room.VisitedCount == 0 then
            player:AnimateTeleport(false)
            delayedPlay[SoundEffect.SOUND_HELL_PORTAL2] = 20
            Game():GetLevel():ChangeRoom(room.SafeGridIndex)
            return
        end
    end
    local rooms3 = FindRooms(RoomType.ROOM_ULTRASECRET)
    for _, room in pairs(rooms3) do
        --print('us', room.VisitedCount, room.Clear, room.Data.Type == RoomType.ROOM_ULTRASECRET)
        if room.VisitedCount == 0 then
            player:AnimateTeleport(false)
            delayedPlay[SoundEffect.SOUND_HELL_PORTAL2] = 20
            Game():GetLevel():ChangeRoom(room.SafeGridIndex)
            --Game():GetLevel():ChangeRoom(Game():GetLevel():QueryRoomTypeIndex(RoomType.ROOM_ULTRASECRET, false, RNG))
            if not player:HasCollectible(CollectibleType.COLLECTIBLE_CAR_BATTERY) then
                player:RemoveCollectible(mod.COLLECTIBLE_MOON)
            end
            return
        end
    end
    if player:HasCollectible(CollectibleType.COLLECTIBLE_CAR_BATTERY) then
        player:AnimateTeleport(false)
        delayedPlay[SoundEffect.SOUND_HELL_PORTAL2] = 20
        Game():GetLevel():ChangeRoom(Game():GetLevel():QueryRoomTypeIndex(RoomType.ROOM_ERROR, false, RNG))
        player:RemoveCollectible(mod.COLLECTIBLE_MOON)
    end
    --[[if not mod.Data.Players[num].Moon or mod.Data.Players[num].Moon == 0 then
        local rooms = FindRooms(RoomType.ROOM_SECRET)
        if rooms[1] then
            player:AnimateTeleport(false)
            delayedPlay[SoundEffect.SOUND_HELL_PORTAL2] = 20
            Game():GetLevel():ChangeRoom(rooms[1].GridIndex)
            mod.Data.Players[num].Moon = 1
        end
    elseif mod.Data.Players[num].Moon == 1 then
        local rooms = FindRooms(RoomType.ROOM_SUPERSECRET)
        if rooms[1] then
            player:AnimateTeleport(false)
            delayedPlay[SoundEffect.SOUND_HELL_PORTAL2] = 20
            Game():GetLevel():ChangeRoom(rooms[1].GridIndex)
            mod.Data.Players[num].Moon = 2
        end
    elseif mod.Data.Players[num].Moon == 2 then
        local rooms = FindRooms(RoomType.ROOM_ULTRASECRET)
        if rooms[1] then
            player:AnimateTeleport(false)
            delayedPlay[SoundEffect.SOUND_HELL_PORTAL2] = 20
            Game():GetLevel():ChangeRoom(rooms[1].GridIndex)
            mod.Data.Players[num].Moon = 3
            player:RemoveCollectible(mod.COLLECTIBLE_MOON)
        end
    end]]
end
mod:AddCallback(ModCallbacks.MC_USE_ITEM, callbacks.OnUseMoon, mod.COLLECTIBLE_MOON)