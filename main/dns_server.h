#pragma once

/* Mini serveur DNS de portail captif : toute requête A renvoie l'IP du point d'accès,
 * ce qui ouvre automatiquement l'appli sur les téléphones. */
void dns_server_start(void);
