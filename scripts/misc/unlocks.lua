local mod = InVerse

local callbacks = {}

local function ShowAchievment(text)
    Game():GetHUD():ShowItemText(text, "Has appeared in the basement")
    SFXManager():Play(SoundEffect.SOUND_GOLDENKEY)
end

function callbacks:OnUpdate()
    if not mod.Data.GlobalData.ItemsCanSpawn["Glitched Deck"] and #mod.keys(mod.Data.GlobalData.CardsCanSpawn) >= 3 then
        mod.Data.GlobalData.ItemsCanSpawn["Glitched Deck"] = true
        ShowAchievment("Glitched Deck")
    end
end
mod:AddCallback(ModCallbacks.MC_POST_UPDATE, callbacks.OnUpdate)

function callbacks:OnPickupInit(pickup)
    local itemConfig = Isaac.GetItemConfig()
    local shouldReroll = true
    local drem = false
    local hasDeck = false
    for i = 0, Game():GetNumPlayers() - 1 do
        local player = Isaac.GetPlayer(i)
        if player:GetPlayerType() == mod.PLAYER_DREAM then drem = true end
        if player:HasCollectible(mod.COLLECTIBLE_GLITCHED_DECK) then hasDeck = true end
        if drem or player:HasCollectible(mod.COLLECTIBLE_GLITCHED_DECK) and mod.rand(1, 2) == 1 then
            shouldReroll = false
            break
        end
    end
    if pickup.Variant == PickupVariant.PICKUP_TAROTCARD and itemConfig:GetCard(pickup.SubType).Name and itemConfig:GetCard(pickup.SubType).Name:match("Momentuum: ") then
        local pool = Game():GetItemPool()
        local newItem = pool:GetCard(pickup.InitSeed, false, false, false)
        pickup:GetSprite():ReplaceSpritesheet(0, "gfx/items/pickups/Momentuum_Card.png")
        pickup:GetSprite():LoadGraphics()
        if itemConfig:GetCard(pickup.SubType).Name == "Momentuum: 0 - The Fool" and mod.Data.Cards.TheFool and mod.Data.Cards.TheFool == Game():GetLevel():GetCurrentRoomDesc().SafeGridIndex then
            mod.Data.Cards.TheFool = nil
        elseif shouldReroll or not mod.Data.GlobalData.CardsCanSpawn[itemConfig:GetCard(pickup.SubType).HudAnim] then
            pickup:Morph(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_TAROTCARD, newItem, true, false, true)
            pickup:Update()
        end
    elseif pickup.Variant == PickupVariant.PICKUP_TAROTCARD and 1 <= pickup.SubType and pickup.SubType <= 97 and drem and hasDeck and mod.rand(1, 8) == 1 and #mod.keys(mod.Data.GlobalData.CardsCanSpawn) > 1 then
        local cards = mod.keys(mod.Data.GlobalData.CardsCanSpawn)
        local newCard = cards[mod.rand(1, #cards)]
        pickup:Morph(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_TAROTCARD, Isaac.GetCardIdByName(newCard), true, false, true)
    elseif pickup.Variant == PickupVariant.PICKUP_COLLECTIBLE and pickup.SubType == mod.COLLECTIBLE_GLITCHED_DECK and not mod.Data.GlobalData.ItemsCanSpawn["Glitched Deck"] then
        local seed = Game():GetSeeds():GetStartSeed()
        local pool = Game():GetItemPool():GetPoolForRoom(Game():GetRoom():GetType(), seed)
        if pool == ItemPoolType.POOL_NULL then pool = ItemPoolType.POOL_TREASURE end
        local newItem = Game():GetItemPool():GetCollectible(pool, true, pickup.InitSeed)
        pickup:Morph(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_COLLECTIBLE, newItem, true, false, true)
    elseif pickup.Variant == PickupVariant.PICKUP_TRINKET and (not drem or not mod.Data.GlobalData.TrinketsCanSpawn[itemConfig:GetTrinket(pickup.SubType).Name])
    and ({
        [mod.TRINKET_DEVIL] = true,
        [mod.TRINKET_EMPRESS] = true,
        [mod.TRINKET_HERMIT] = true,
        [mod.TRINKET_MAGICIAN] = true,
        [mod.TRINKET_SUN] = true
    })[pickup.SubType] then
        pickup:Morph(EntityType.ENTITY_PICKUP, PickupVariant.PICKUP_TRINKET, Game():GetItemPool():GetTrinket(), true, false, true)
    end
end
mod:AddCallback(ModCallbacks.MC_POST_PICKUP_INIT, callbacks.OnPickupInit)

function SpawnLayingDreamB()
    local drem
    for _, ent in pairs(Isaac.FindByType(17)) do
        ent:Remove()
        drem = Isaac.Spawn(6, 14, 0, ent.Position, Vector.Zero, nil)
    end
    for _, ent in pairs(Isaac.FindByType(5, 100)) do
        ent:Remove()
        drem = Isaac.Spawn(6, 14, 0, ent.Position, Vector.Zero, nil)
    end
    if drem then
        drem:GetSprite():ReplaceSpritesheet(0, "gfx/characters/costumes/t_dre.png")
        drem:GetSprite():LoadGraphics()
    end
end

function callbacks:SpawnDreamBLaying()
    local room = Game():GetRoom()
    if Game():GetLevel():GetStage() == 13 and Isaac.GetPlayer(0):GetPlayerType() == mod.PLAYER_DREAM and Game():GetLevel():GetCurrentRoomDesc().SafeGridIndex == 94 and room:IsFirstVisit() then
        SpawnLayingDreamB()
    end
end
mod:AddCallback(ModCallbacks.MC_POST_NEW_ROOM, callbacks.SpawnDreamBLaying)

function callbacks:CheckDreamBUnlock()
    local room = Game():GetRoom()
    local entities = Isaac.FindByType(6, 14)
    if Game():GetLevel():GetStage() == 13 and Isaac.GetPlayer():GetPlayerType() == mod.PLAYER_DREAM and Game():GetLevel():GetCurrentRoomDesc().SafeGridIndex == 94 and room:IsFirstVisit() and #entities > 0 then
        if entities[1]:GetSprite():IsFinished("PayPrize") and not mod.Data.GlobalData.Unlocked["DreamBSoul"] then
            mod.Data.GlobalData.Unlocked["DreamBSoul"] = true
            -- ShowAchievment("Tainted Dream")
        end
    end
end
mod:AddCallback(ModCallbacks.MC_POST_UPDATE, callbacks.CheckDreamBUnlock)

--[[ mod:AddCallback(ModCallbacks.MC_POST_PLAYER_INIT, function(self, player)
    if player:GetPlayerType() == mod.PLAYER_DREAMBSOUL and not mod.Data.GlobalData.Unlocked["DreamBSoul"] then
        player.Visible = false
        Game():GetHUD():SetVisible(false)
        Game():GetLevel():SetStage(LevelStage.STAGE8, 0)
    end
end)
mod:AddCallback(ModCallbacks.MC_POST_PLAYER_UPDATE, function(self, player)
    if player:GetPlayerType() == mod.PLAYER_DREAMBSOUL and not mod.Data.GlobalData.Unlocked["DreamBSoul"] then
        player.ControlsEnabled = false
    end
end)
mod:AddCallback(ModCallbacks.MC_POST_NEW_LEVEL, function()
    if Isaac.GetPlayer():GetPlayerType() == mod.PLAYER_DREAMBSOUL and not mod.Data.GlobalData.Unlocked["DreamBSoul"] and Game():GetLevel():GetStage() == 13 then
        local player = Isaac.GetPlayer()
        local level = Game():GetLevel()
        local room = Game():GetRoom()
        level:ChangeRoom(95)
        player.Position = Vector(245, 280)
        player:SetPocketActiveItem(CollectibleType.COLLECTIBLE_RED_KEY, ActiveSlot.SLOT_POCKET2)
        player:UseActiveItem(CollectibleType.COLLECTIBLE_RED_KEY, UseFlag.USE_OWNED + UseFlag.USE_NOANIM, ActiveSlot.SLOT_POCKET2)
        player:RemoveCollectible(CollectibleType.COLLECTIBLE_RED_KEY)
        level:ChangeRoom(94)
        room:RemoveGridEntity(room:GetDoor(2):GetGridIndex(), 0)
        SpawnLayingDreamB()
    end
end) ]]

mod:AddCallback(ModCallbacks.MC_POST_NPC_DEATH, function(npc)
    if npc.Type == EntityType.ENTITY_DELIRIUM and mod.CharacterInGame(mod.PLAYER_DREAM) then
        mod.Data.GlobalData.ItemsCanSpawn["Dream's Handbag"] = true
        ShowAchievment("Dream's Handbag")
    end
end)