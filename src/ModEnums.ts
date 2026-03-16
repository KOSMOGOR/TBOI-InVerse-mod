export class ModEnums {
    static PLAYER_DREAM = Isaac.GetPlayerTypeByName("Dream");
    // static PLAYER_DREAMB = Isaac.GetPlayerTypeByName("DreamB", true);
    // static PLAYER_DREAMBBODY = Isaac.GetPlayerTypeByName("DreamBBody", true);
    static PLAYER_TEEGRO = Isaac.GetPlayerTypeByName("Teegro");

    static COLLECTIBLE_DREAMS_DREAM_BOOK = Isaac.GetItemIdByName("Dream's Dream Book");
    static COLLECTIBLE_MOMENTUUM = Isaac.GetItemIdByName("Momentuum");

    static TRINKET_DREAMSHANDBAG = Isaac.GetTrinketIdByName("Dream's Handbag");

    static CARD_MOMENTUUM_FOOL = Isaac.GetCardIdByName("momentuum_fool");
    static CARD_MOMENTUUM_MAGICIAN = Isaac.GetCardIdByName("momentuum_magician");
    static CARD_MOMENTUUM_PRIESTESS = Isaac.GetCardIdByName("momentuum_priestess");
    static CARD_MOMENTUUM_EMPRESS = Isaac.GetCardIdByName("momentuum_empress");
    static CARD_MOMENTUUM_EMPEROR = Isaac.GetCardIdByName("momentuum_emperor");
    static CARD_MOMENTUUM_HIEROPHANT = Isaac.GetCardIdByName("momentuum_hierophant");
    static CARD_MOMENTUUM_LOVERS = Isaac.GetCardIdByName("momentuum_lovers");
    static CARD_MOMENTUUM_CHARIOT = Isaac.GetCardIdByName("momentuum_chariot");
    static CARD_MOMENTUUM_JUSTICE = Isaac.GetCardIdByName("momentuum_justice");
    static CARD_MOMENTUUM_HERMIT = Isaac.GetCardIdByName("momentuum_hermit");
    static CARD_MOMENTUUM_WHEEL = Isaac.GetCardIdByName("momentuum_wheel");
    static CARD_MOMENTUUM_STRENGTH = Isaac.GetCardIdByName("momentuum_strength");
    static CARD_MOMENTUUM_HANGED = Isaac.GetCardIdByName("momentuum_hanged");
    static CARD_MOMENTUUM_DEATH = Isaac.GetCardIdByName("momentuum_death");
    static CARD_MOMENTUUM_TEMPERANCE = Isaac.GetCardIdByName("momentuum_temperance");
    static CARD_MOMENTUUM_DEVIL = Isaac.GetCardIdByName("momentuum_devil");
    static CARD_MOMENTUUM_TOWER = Isaac.GetCardIdByName("momentuum_tower");
    static CARD_MOMENTUUM_STARS = Isaac.GetCardIdByName("momentuum_stars");
    static CARD_MOMENTUUM_MOON = Isaac.GetCardIdByName("momentuum_moon");
    static CARD_MOMENTUUM_SUN = Isaac.GetCardIdByName("momentuum_sun");
    static CARD_MOMENTUUM_JUDGEMENT = Isaac.GetCardIdByName("momentuum_judgement");
    static CARD_MOMENTUUM_WORLD = Isaac.GetCardIdByName("momentuum_world");

    static PICKUP_HUNTER_KEY_VARIANT = Isaac.GetEntityVariantByName("HunterKey");
    static PICKIP_HUNTER_KEY_SUBTYPE = {
        Shard: 1,
        Half: 2,
        Full: 3,
        Double: 4,
    };
    static PICKUP_HUNTER_CHEST = Isaac.GetEntityVariantByName("HunterChest");

    static FAMILIAR_MOMENTUUM = Isaac.GetEntityVariantByName("MomentuumFamiliar");

    static CALLBACK_POST_PLAYER_RENDER_ABOVE = 1000;
}