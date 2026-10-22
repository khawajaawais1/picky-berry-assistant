# Postgres 17 + PostGIS 3.5 + h3-pg (D4).
# The postgis image is Debian-based with the PGDG apt repo already configured,
# which ships h3-pg as postgresql-17-h3.
FROM postgis/postgis:17-3.5

RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-17-h3 \
 && rm -rf /var/lib/apt/lists/*

# Stub if this build ever fails: use the plain postgis/postgis:17-3.5 image and
# compute H3 ids in Python (data/ already does); zones.h3 then becomes text.
