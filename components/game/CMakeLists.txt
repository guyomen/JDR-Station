idf_component_register(SRCS "game.c" "util.c" "party.c" "messages.c"
                            "characters.c" "dice.c" "peers.c" "combat.c" "lieux.c"
                       INCLUDE_DIRS "include"
                       PRIV_REQUIRES store json esp_timer)
