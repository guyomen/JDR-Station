idf_component_register(SRCS "sysinfo.c"
                       INCLUDE_DIRS "include"
                       REQUIRES cjson
                       PRIV_REQUIRES store esp_timer esp_wifi esp_driver_tsens esp_app_format spi_flash)
