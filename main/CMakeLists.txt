idf_component_register(SRCS "main.c" "wifi_ap.c" "dns_server.c" "store.c" "game.c" "web_server.c"
                       INCLUDE_DIRS "."
                       EMBED_FILES "www/index.html" "www/app.js" "www/cof2.js" "www/style.css"
                       REQUIRES esp_wifi esp_netif esp_event esp_timer nvs_flash
                                esp_http_server spiffs json lwip)

# Les données du DRS (~320 Ko) sont embarquées compressées en gzip (~95 Ko)
# et servies avec « Content-Encoding: gzip ».
idf_build_get_property(python PYTHON)
set(DRS_JS ${CMAKE_CURRENT_SOURCE_DIR}/www/cof2_drs.js)
set(DRS_GZ ${CMAKE_CURRENT_BINARY_DIR}/cof2_drs.js.gz)
add_custom_command(OUTPUT ${DRS_GZ}
    COMMAND ${python} -c "import gzip,sys; open(sys.argv[2],'wb').write(gzip.compress(open(sys.argv[1],'rb').read(), 9, mtime=0))" ${DRS_JS} ${DRS_GZ}
    DEPENDS ${DRS_JS}
    VERBATIM)
add_custom_target(drs_gz DEPENDS ${DRS_GZ})
add_dependencies(${COMPONENT_LIB} drs_gz)
target_add_binary_data(${COMPONENT_LIB} ${DRS_GZ} BINARY)
