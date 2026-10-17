idf_component_register(SRCS "wifi_ap.c" "dns_server.c"
                       INCLUDE_DIRS "include"
                       REQUIRES esp_netif
                       PRIV_REQUIRES esp_wifi esp_event lwip)
