#pragma once
#include <stdint.h>
#include "esp_netif_ip_addr.h"

typedef struct {
    const char *ssid;
    const char *password;    /* vide = réseau ouvert (ouvert aussi si moins de 8 caractères) */
    uint8_t channel;
    uint8_t max_connections;
} wifi_ap_settings_t;

/* Démarre l'ESP32 en point d'accès Wi-Fi (192.168.4.1). */
void wifi_ap_start(const wifi_ap_settings_t *settings);

/* Adresse IP du point d'accès (après wifi_ap_start). */
esp_ip4_addr_t wifi_ap_ip(void);
