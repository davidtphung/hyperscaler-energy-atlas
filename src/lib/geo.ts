import { feature, mesh } from "topojson-client";
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiLineString,
} from "geojson";
import usTopoRaw from "us-atlas/states-10m.json";
import worldTopoRaw from "world-atlas/countries-110m.json";

// us-atlas / world-atlas ship TopoJSON. We convert once at module load into the
// GeoJSON that d3-geo's path generator consumes. Bundling the geometry (rather
// than fetching from a CDN at runtime) keeps the atlas self-contained: no API
// keys, no third-party uptime dependency, deterministic offline rendering.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const usTopo = usTopoRaw as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const worldTopo = worldTopoRaw as any;

export const usStates: FeatureCollection<Geometry> = feature(
  usTopo,
  usTopo.objects.states
) as unknown as FeatureCollection<Geometry>;

export const usStateBorders: MultiLineString = mesh(
  usTopo,
  usTopo.objects.states,
  (a, b) => a !== b
);

export const usNation: Feature<Geometry> = feature(
  usTopo,
  usTopo.objects.nation
) as Feature<Geometry>;

export const worldCountries: FeatureCollection<Geometry> = feature(
  worldTopo,
  worldTopo.objects.countries
) as unknown as FeatureCollection<Geometry>;

export const worldBorders: MultiLineString = mesh(
  worldTopo,
  worldTopo.objects.countries,
  (a, b) => a !== b
);
