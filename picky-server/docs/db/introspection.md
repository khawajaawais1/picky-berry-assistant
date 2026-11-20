# Database introspection status

Database-specific Phase 0 queries have not yet been run from this workspace:
there is no Supabase connection string or PostgreSQL credential in the
environment. No live row counts, table/view inventory, PostGIS extension schema,
or habitat JSON key output is asserted here. Run the Section 5.2 queries in
`../../backend-api-brief.md` in the Supabase SQL editor and record their results
before applying migrations.

## Facts already verified in the finalized brief

- `zones.geom`, `zones.centroid`, and `weather_stations.geom` use SRID 4326.
- The `zones` table has `zones_pkey`, `zones_h3_key`, `zones_h3_ix`,
  `zones_geom_gix`, and `zones_parent_ix`.
- A geography GiST index on `zones.centroid` was absent when the brief was
  finalized; migration `0002` adds it.

## Required follow-up

- Run the table/view, complete index, geometry, PostGIS schema, count, and
  habitat-key queries from section 5.2.
- Confirm that the data engineer enabled RLS without policies on the existing
  ingest tables; the API migration only enables RLS on API-owned tables.
- Generate `baseline_ingest.sql` from the source database. Do not apply that
  dump to Supabase.
- Confirm with the data engineer whether `weather_daily` is a view or table;
  this API does not query it.
