idf_component_register(SRCS "store.c"
                       INCLUDE_DIRS "include"
                       REQUIRES cjson
                       PRIV_REQUIRES spiffs)
