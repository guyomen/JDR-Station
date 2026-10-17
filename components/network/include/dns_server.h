#pragma once
#include "esp_netif_ip_addr.h"

/* Mini serveur DNS de portail captif : toute requête A renvoie ip (l'adresse du point d'accès),
 * ce qui ouvre automatiquement l'appli sur les téléphones. */
void dns_server_start(esp_ip4_addr_t ip);
