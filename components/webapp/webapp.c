#include <string.h>
#include "webapp.h"

/* Table générée à la compilation (webapp_assets.c, voir gen_assets.py). */
extern const webapp_asset_t webapp_assets[];
extern const size_t webapp_asset_count;

const webapp_asset_t *webapp_find(const char *uri)
{
    size_t len = strcspn(uri, "?#");
    if (len == 1 && uri[0] == '/') {
        uri = "/index.html";
        len = strlen(uri);
    }
    for (size_t i = 0; i < webapp_asset_count; i++) {
        const char *path = webapp_assets[i].path;
        if (strlen(path) == len && strncmp(path, uri, len) == 0) return &webapp_assets[i];
    }
    return NULL;
}
