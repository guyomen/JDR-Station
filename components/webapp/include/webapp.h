#pragma once
#include <stddef.h>
#include <stdint.h>

/* Fichier de l'appli web embarqué dans le firmware (généré depuis www/, voir bundles.json). */
typedef struct {
    const char *path;    /* URL, ex. "/app.js" */
    const char *mime;    /* type MIME (Content-Type) */
    const uint8_t *data; /* contenu, toujours compressé en gzip */
    size_t len;
} webapp_asset_t;

/* Fichier correspondant à l'URI (« / » = index.html, paramètres « ?… » ignorés), ou NULL. */
const webapp_asset_t *webapp_find(const char *uri);
