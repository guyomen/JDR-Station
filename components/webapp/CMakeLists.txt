idf_component_register(SRCS "webapp.c"
                       INCLUDE_DIRS "include")

# L'appli web (www/) est assemblée selon bundles.json, compressée en gzip et convertie
# en tableau C à la compilation (voir gen_assets.py).
idf_build_get_property(python PYTHON)
file(GLOB_RECURSE WWW_FILES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/www/*")
# Documents de l'Espace Règles (voir bundles.json).
file(GLOB RULES_FILES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/../../references/COFv2/*.md")
set(ASSETS_C "${CMAKE_CURRENT_BINARY_DIR}/webapp_assets.c")
add_custom_command(OUTPUT ${ASSETS_C}
    COMMAND ${python} ${CMAKE_CURRENT_SOURCE_DIR}/gen_assets.py --out ${ASSETS_C}
    DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/gen_assets.py ${CMAKE_CURRENT_SOURCE_DIR}/bundles.json ${WWW_FILES} ${RULES_FILES}
    COMMENT "Assemblage de l'appli web"
    VERBATIM)
target_sources(${COMPONENT_LIB} PRIVATE ${ASSETS_C})
