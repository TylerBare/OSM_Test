import { select as d3_select } from 'd3-selection';
import { Tiler } from '@rapid-sdk/math';

import { AbstractSystem } from '../core/AbstractSystem';
import { Graph, Tree } from '../core/lib';
import { osmNode, osmRelation, osmWay } from '../osm';
import { utilFetchResponse } from '../util';


const APIROOT = 'https://geo4.stage.511mobility.org/api/v2';
const TILEZOOM = 5;


/**
 * `GeonodeService`
 *
 * Events available:
 *   `loadedData`
 */
export class GeonodeService extends AbstractSystem {

  /**
   * @constructor
   * @param  `context`  Global shared application context
   */
  constructor(context) {
    super(context);
    this.id = 'geonode';
    this.context = context;

    this._tiler = new Tiler().zoomRange(TILEZOOM);
    this._datasets = {};
    this._gotDatasets = false;

    // Ensure methods used as callbacks always have `this` bound correctly.
    this._parseDataset = this._parseDataset.bind(this);

    this._map = context.systems.map;
  }


  /**
   * initAsync
   * Called after all core objects have been constructed.
   * @return {Promise} Promise resolved when this component has completed initialization
   */
  initAsync() {
    return this.resetAsync();
  }


  /**
   * startAsync
   * Called after all core objects have been initialized.
   * @return {Promise} Promise resolved when this component has completed startup
   */
  startAsync() {
    this._started = true;
    return Promise.resolve();
  }


  /**
   * resetAsync
   * Called after completing an edit session to reset any internal state
   * @return {Promise} Promise resolved when this component has completed resetting
   */
  resetAsync() {
    for (const ds of Object.values(this._datasets)) {
      if (ds.cache.inflight) {
        Object.values(ds.cache.inflight).forEach(controller => this._abortRequest(controller));
      }
      ds.graph = new Graph();
      ds.tree = new Tree(ds.graph);
      ds.cache = { inflight: {}, loaded: {}, seen: {} };
    }

    return Promise.resolve();
  }

  /**
   * getData
   * Get already loaded data that appears in the current map view
   * @param   {string}  datasetID - datasetID to get data for
   * @return  {Array}   Array of data (OSM Entities)
   */
  getData(datasetID) {
    const ds = this._datasets[datasetID];
    if (!ds || !ds.tree || !ds.graph) return [];

    const extent = this.context.systems.map.extent();
    const entities = ds.tree.intersects(extent, ds.graph);
    return entities;
  }

  graph(datasetID) {
    const ds = this._datasets[datasetID];
    return ds?.graph;
  }

  loadDatasetsAsync() {
    if (this._gotDatasets) {
      return Promise.resolve(this._datasets);

    } else {
      const that = this;
      return new Promise((resolve, reject) => {
        let page = 1;
        fetchMore(page);

        function fetchMore(pageNumber) {
          fetch(that._datasetsURL(pageNumber))
            .then(utilFetchResponse)
            .then(json => {
              for (const ds of json.datasets ?? []) {
                that._parseDataset(ds);
              }
              if (json.links.next) {
                page++;
                fetchMore(page);
              } else {
                that._gotDatasets = true;
                resolve(that._datasets);
              }
            })
            .catch(e => {
              that._gotDatasets = false;
              reject(e);
            });
        }
      });
    }
  }

  loadLayerAsync(datasetID) {
    let ds = this._datasets[datasetID];
    if (!ds || !ds.url) {
      return Promise.reject(`Unknown datasetID: ${datasetID}`);
    } else if (ds.layer) {
      return Promise.resolve(ds.layer);
    }

    return fetch(ds.url)
      .then(utilFetchResponse)
      .then(json => {
        if (!json.features || !json.features.length) {
          throw new Error(`Missing features for datasetID: ${datasetID}`);
        }

        ds.layer = json;  // should return a single layer

        // Use the field metadata to map to OSM tags
        let tagmap = {};
        // for (const f of ds.layer.fields) {
        //   if (f.type === 'esriFieldTypeOID') {  // this is an id field, remember it
        //     ds.layer.idfield = f.name;
        //   }
        //   if (!f.editable) continue;   // 1. keep "editable" fields only
        //   tagmap[f.name] = f.alias;    // 2. field `name` -> OSM tag (stored in `alias`)
        // }
        ds.layer.tagmap = tagmap;

        // ds.graph.rebase(results, [ds.graph], true);
        // ds.tree.rebase(results, true);

        this._parseGeonodeLayer(ds, ds.layer, (err, results) => {
          if (err) throw new Error(err);
          ds.graph.rebase(results, [ds.graph], true);
          ds.tree.rebase(results, true);
        });
        console.log('ds.layer', ds.layer);  // eslint-disable-line
        return ds.layer;
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        console.error(e);  // eslint-disable-line
      });
  }

  _parseDataset(ds) {
    if (this._datasets[ds.uuid]) return;  // unless we've seen it already

    this._datasets[ds.uuid] = ds;
    ds.id = ds.uuid;
    ds.graph = new Graph();
    ds.tree = new Tree(ds.graph);
    ds.cache = { inflight: {}, loaded: {}, seen: {} };

    // cleanup the `licenseInfo` field by removing styles  (not used currently)
    let license = d3_select(document.createElement('div'));
    license.html(ds.license.identifier);       // set innerHtml
    license.selectAll('*')
      .attr('style', null)
      .attr('size', null);
    ds.license_html = license.html();   // get innerHtml

    // generate public link to this item
    ds.itemURL = ds.link;

    // Get link.  NOTE: not sure if this is a hack or not.  More research into the geonode api is needed.
    // `https://development.demo.geonode.org/geoserver/ows
    //   ?service=WFS
    //   &version=1.0.0
    //   &request=GetFeature
    //   &typename=geonode:gref_sistemas_urbanos_rurales_15_nal_aba6ef8631a14
    //   &outputFormat=json
    //   &srs=EPSG:4326
    //   &srsName=EPSG:4326`;
    const link = ds.links.find(l => l.link_type === 'OGC:WMS');
    if (link) {
      ds.url = `${link.url}?service=WFS&version=1.0.0&request=GetFeature&typename=geonode:${ds.name}&outputFormat=json&srs=EPSG:4326&srsName=EPSG:4326`;
    }
  }

  _datasetsURL(page = 1) {
    return `${APIROOT}/datasets?page=${page}`;
  }

  _datasetURL(datasetID) {
    return `${APIROOT}/datasets/${datasetID}`;
  }

  _parseGeonodeLayer(dataset, geojson, callback) {
    if (!geojson) return callback({ message: 'No GeoJSON', status: -1 });

    let results = [];
    for (const f of geojson.features ?? []) {
      const entities = this._parseFeature(f, dataset);
      if (entities) results.push.apply(results, entities);
    }

    callback(null, results);
  }

  _parseFeature(feature, dataset) {
    let geom = feature.geometry;
    const props = feature.properties;
    if (!geom || !props) return null;

    if (geom.type === 'MultiLineString') {
      geom = multiLineStringToLineString(geom);
    }

    const featureID = props[dataset.layer.idfield] || props.OBJECTID || props.FID || props.ogc_fid || props.id;
    if (!featureID) return null;

    // skip if we've seen this feature already on another tile
    if (dataset.cache.seen[featureID]) return null;
    dataset.cache.seen[featureID] = true;

    const id = `${dataset.id}-${featureID}`;
    const metadata = { __fbid__: id, __service__: 'geonode', __datasetid__: dataset.id };
    let entities = [];
    let nodemap = new Map();
    // Point:  make a single node
    if (geom.type === 'Point') {
      return [new osmNode({ loc: geom.coordinates, tags: parseTags(props) }, metadata)];

      // LineString:  make nodes, single way
    } else if (geom.type === 'LineString') {
      const nodelist = parseCoordinates(geom.coordinates);
      if (nodelist.length < 2) return null;

      const w = new osmWay({ nodes: nodelist, tags: parseTags(props) }, metadata);
      entities.push(w);
      return entities;

      // Polygon:  make nodes, way(s), possibly a relation
    } else if (geom.type === 'Polygon') {
      let ways = [];
      for (const ring of geom.coordinates ?? []) {
        const nodelist = parseCoordinates(ring);
        if (nodelist.length < 3) continue;

        const first = nodelist[0];
        const last = nodelist[nodelist.length - 1];
        if (first !== last) nodelist.push(first);   // sanity check, ensure rings are closed

        const w = new osmWay({ nodes: nodelist });
        ways.push(w);
      }

      if (ways.length === 1) {  // single ring, assign tags and return
        entities.push(
          ways[0].update(Object.assign({ tags: parseTags(props) }, metadata))
        );
      } else {  // multiple rings, make a multipolygon relation with inner/outer members
        const members = ways.map((w, i) => {
          entities.push(w);
          return { id: w.id, role: (i === 0 ? 'outer' : 'inner'), type: 'way' };
        });
        const tags = Object.assign(parseTags(props), { type: 'multipolygon' });
        const r = new osmRelation({ members: members, tags: tags }, metadata);
        entities.push(r);
      }

      return entities;
    }
    // no Multitypes for now (maybe not needed)

    function multiLineStringToLineString(multiLineString) {
      if (multiLineString.type !== 'MultiLineString') {
        throw new Error('Input is not a MultiLineString');
      }

      const lineStringCoordinates = multiLineString.coordinates.reduce((acc, line) => {
        return acc.concat(line);
      }, []);

      const lineString = {
        type: 'LineString',
        coordinates: lineStringCoordinates,
      };

      return lineString;
    }

    function parseCoordinates(coords) {
      let nodelist = [];
      for (const coord of coords) {
        const key = coord.toString();
        let n = nodemap.get(key);
        if (!n) {
          n = new osmNode({ loc: coord });
          entities.push(n);
          nodemap.set(key, n);
        }
        nodelist.push(n.id);
      }
      return nodelist;
    }

    function parseTags(props) {
      let tags = {};
      for (const prop of Object.keys(props)) {
        const k = clean(dataset.layer.tagmap[prop]);
        const v = clean(props[prop]);
        if (k && v) {
          tags[k] = v;
        }
      }

      tags.source = `nysdot/${dataset.name}`;
      return tags;
    }

    function clean(val) {
      return val ? val.toString().trim() : null;
    }
  }

}
