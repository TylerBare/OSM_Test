// Just a few core components that we could use to
// support a headless (no browser) Rapid for testing

export * from './actions/index.js';
export * from './core/lib/index.js';
export * from './geo/index.js';
export * from './osm/index.js';

// Reexport only what our tests use, see iD#4379
import * as D3 from 'd3';
export const d3 = {
  polygonArea: D3.polygonArea,
  polygonCentroid: D3.polygonCentroid,
  select: D3.select,
  selectAll: D3.selectAll,
  timerFlush: D3.timerFlush
};

// Reexport the sdk things that our tests use too
import * as SDKMATH from '@rapid-sdk/math';
import * as SDKUTIL from '@rapid-sdk/util';
export const sdk = {
  Projection: SDKMATH.Projection,
  Extent: SDKMATH.Extent,
  geoSphericalDistance: SDKMATH.geoSphericalDistance,
  geoZoomToScale: SDKMATH.geoZoomToScale,
  vecLength: SDKMATH.vecLength,
  utilQsString: SDKUTIL.utilQsString,
  utilStringQs: SDKUTIL.utilStringQs
};
