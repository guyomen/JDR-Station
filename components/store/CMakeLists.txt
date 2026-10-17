idf_component_register(SRCS "store.c"
                       INCLUDE_DIRS "include"
                       REQUIRES json
                       PRIV_REQUIRES spiffs)
