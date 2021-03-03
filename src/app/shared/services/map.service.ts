import {
	Injectable,
	ɵCompiler_compileModuleSync__POST_R3__,
} from "@angular/core";

import {
	HttpClient,
	HttpErrorResponse,
	HttpParameterCodec,
	HttpParams,
} from "@angular/common/http";
import { Map } from "leaflet";
import {
	Observable,
	throwError,
	BehaviorSubject,
	Subject,
	TimeoutError,
} from "rxjs";
import { map, catchError, timeout, tap } from "rxjs/operators";
import { LoaderService } from "../../shared/services/loader.service";

declare let L;
import "leaflet";
import * as esri from "esri-leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster.freezable";
import * as xml2js from "xml2js";
import { ConfigService } from "./config.service";
import { Config } from "../interfaces/config";
import { CustomQueryEncoderHelper } from "./customEncoder";

@Injectable({
	providedIn: "root",
})
export class MapService {
	public map: Map;
	public legend: any;
	public chosenBaseLayer: string;
	public baseMaps: any;
	public mainLayers: any;
	public geoJson: any;
	public filterJson: any;
	public filterOptions: any;
	public highlightMarkers = [];
	public markerClusters;
	public geoJsonURL;
	public colorJson = []; // for symbolizing sites if site filters applied
	public selectMultSites = false;
	public siglSiteCount: number;
	// for symbolizing by keyword or organization
	public siteColors = [
		"#3cb44b",
		"#9444E0",
		"#4376D3",
		"#E04644",
		"#555E7B",
		"#1F777F",
		"#D608A9",
		"#B7D968",
		"#964b41",
		"#3C69B4",
		"#44DEE0",
		"#B4873C",
		"#68D9C3",
	];
	public siteCategories = [
		"Facility",
		"Atmosphere",
		"Lake, Reservoir, Impoundment",
		"Stream",
		"Well",
		"Land",
		"Estuary",
		"Wetland",
		"Ocean",
	];
	public colorBy = "searchType";
	private configSettings: Config;
	public timeoutTime = 180000; // 3 min timeouts

	public NWISURL: string =
		"https://waterservices.usgs.gov/nwis/iv/?format=json&";
	NWISsites: any;
	public URLparams = {
		request: "GetFeature",
		service: "wfs",
		version: "2.0.0",
		typeNames: "wqp_sites",
		SEARCHPARAMS:
			"statecode:US:26;huc:0408*|0407*;sampleMedia:Water;characteristicName:Nitrate;",
		outputFormat: "application/json",
	};

	public sitesLayer: L.FeatureGroup<any>;
	public nwisLayer: L.FeatureGroup<any>;
	public siglLayer: L.FeatureGroup<any>;
	public selectedSiteLayer: any;
	// send selected sites/characteristics to dataview
	public _selectedSiteSubject = new Subject();

	public get SelectedSite(): Observable<any> {
		return this._selectedSiteSubject.asObservable();
	}

	public _selectMultSubject = new Subject();
	public get MultSelect(): Observable<any> {
		return this._selectMultSubject.asObservable();
	}

	public _characteristicFilterSubject = new BehaviorSubject(["Nitrate"]);
	public get SelectedChar(): Observable<any> {
		return this._characteristicFilterSubject.asObservable();
	}
	// trigger charts in dataview
	public _siteStatsSubject = new Subject();
	public get SiteStats(): Observable<any> {
		return this._siteStatsSubject.asObservable();
	}

	public _siteChangeSubject = new Subject();
	public get SiteChange(): Observable<any> {
		return this._siteChangeSubject.asObservable();
	}
	// send event year to dataview
	public _eventYearSubject = new Subject();
	public get EventYear(): Observable<any> {
		return this._eventYearSubject.asObservable();
	}
	// send min results to dataview
	public _minResultsSubject = new Subject();
	public get MinResults(): Observable<any> {
		return this._minResultsSubject.asObservable();
	}
	// send type of toast to show
	// TODO: if toasts get used more, improve this, maybe make toaster service to update message, etc.
	public _toasterSubject = new Subject();
	public get ToasterSubject(): Observable<any> {
		return this._toasterSubject.asObservable();
	}

	// expand/collapse data panel
	public _dataPanelCollapseSubject = new Subject();
	public get DataPanelCollapse(): Observable<any> {
		return this._dataPanelCollapseSubject.asObservable();
	}

	constructor(
		private _http: HttpClient,
		private _loaderService: LoaderService,
		private _configService: ConfigService
	) {
		this.configSettings = this._configService.getConfiguration();
		this.geoJsonURL = this.configSettings.geoJsonURL;
		this.chosenBaseLayer = "Topo";

		this.baseMaps = {
			// {s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
			OpenStreetMap: L.tileLayer(
				"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
				{
					maxZoom: 20,
					zIndex: 1,
					attribution:
						'Imagery from <a href="https://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a>' +
						'&mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
				}
			),
			Topo: L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
				{
					zIndex: 1,
					attribution:
						"Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL," +
						"Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community",
				}
			),
			CartoDB: L.tileLayer(
				"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
				{
					zIndex: 1,
					attribution:
						'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; ' +
						'<a href="https://cartodb.com/attributions">CartoDB</a>',
				}
			),
			Satellite: L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
				{
					zIndex: 1,
					attribution:
						"Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, " +
						"and the GIS User Community",
					// maxZoom: 10
				}
			),
			Terrain: L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
				{
					zIndex: 1,
					attribution:
						"Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS",
					maxZoom: 13,
				}
			),
			Gray: L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
				{
					zIndex: 1,
					attribution:
						"Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
					maxZoom: 16,
				}
			),
			Nautical: esri.imageMapLayer({
				url:
					"https://seamlessrnc.nauticalcharts.noaa.gov/arcgis/rest/services/RNC/NOAA_RNC/ImageServer",
				zIndex: 1,
			}),
		};

		//TOOOS: Add stream gages as Aux layers

		// if typeScript complains about searchParams, add it to the class in the leaflet@types definition
		this.mainLayers = {
			WQP: L.tileLayer.wms(
				"https://www.waterqualitydata.us/ogcservices/ows?",
				{
					layers: "wqp_sites",
					format: "image/png",
					transparent: true,
					zIndex: 2,
					// searchParams: "characteristicname?text=nitrogen;countycode:US:36:059|US:36:103|US:36:081|US:36:047"
				}
			),
			NWIS: L.tileLayer.wms(
				"https://www.waterqualitydata.us/ogcservices/ows?",
				{
					layers: "qw_portal_map:nwis_sites",
					format: "image/png",
					transparent: true,
					zIndex: 2,
					// searchParams: "countycode:US:36:059|US:36:103"
				}
			),
		};
	}

	/* public getNWIS(): Observable<any> {
		//bBox=-85.3225708,43.1130142,-80.9280396,45.0987303&siteType=&siteStatus=active
		const bbox = this.getBbox();
		const parameterCode = "00065,63160,72214";
		const siteType = "OC,OC-CO,ES,LK,ST,ST-CA,ST-DCH,ST-TS";
		const siteStatus = "active";

		const queryUrl =
			this.NWISURL +
			"bBox=" +
			bbox +
			"&parameterCd=" +
			parameterCode +
			"&siteType=" +
			siteType +
			"&siteStatus=" +
			siteStatus;

		return this._http.get<any>(queryUrl).pipe(
			map((response) => {

				console.log("response from timeseries", response);
			})
		);
	} */

	public getData(): Observable<any> {
		this._loaderService.showFullPageLoad();
		const preparedParams = new HttpParams({
			encoder: new CustomQueryEncoderHelper(),
			fromObject: this.URLparams,
		});
		return this._http
			.get<any>(this.geoJsonURL, { params: preparedParams })
			.pipe(
				timeout(this.timeoutTime),
				map((response) => {
					this.geoJson = response;
					this.filterJson = this.geoJson; // set filtered object to all on init.

					// get unique values for filterOptions
					this.filterOptions = {};

					// remove Dissolved oxygen (DO) site in the middle of the Atlantic
					const toRemove = this.geoJson.features.findIndex(
						(feat) => feat.properties.name === "NALMS-5172"
					);
					this.geoJson.features.splice(toRemove, 1);

					this.geoJson.features.forEach((feature) => {
						for (const property in feature.properties) {
							if (!this.filterOptions.hasOwnProperty(property)) {
								this.filterOptions[property] = [];
							}
							if (
								this.filterOptions[property].indexOf(
									feature.properties[property]
								) === -1 &&
								property !== "bbox"
							) {
								this.filterOptions[property].push(
									feature.properties[property]
								);
							}
						}
					});
					return this.filterOptions;
				}),
				catchError((error) => {
					this._loaderService.hideFullPageLoad();
					return this.handleError(error);
				})
			);
	}

	private handleError(err: HttpErrorResponse) {
		if (err instanceof TimeoutError) {
			console.error(
				"Timeout has occurred after " +
					this.timeoutTime / 60000 +
					" minutes."
			);
			this._toasterSubject.next("error"); // show toast error when request times out
		} else if (err.error instanceof ErrorEvent) {
			// client side
			console.error("An error occurred:", err.error.message);
		} else {
			// server error message
			console.error(
				"Server returned code" +
					err.status +
					", " +
					err.error.error.message
			);
		}
		return throwError("HTTPClient error.");
	}

	public addToSiglLayer(geoJson: any) {
		this.siglSiteCount = 0;
		const self = this;
		if (this.markerClusters) {
			this.markerClusters.remove();
		}
		if (this.selectedSiteLayer) {
			this.highlightMarkers.forEach((marker) =>
				this.selectedSiteLayer.remove(marker)
			);
			this.selectedSiteLayer.eachLayer((lay) => {
				this.selectedSiteLayer.removeLayer(lay);
			});
		}
		this.highlightMarkers = [];
		const layer = L.geoJSON(geoJson, {
			pointToLayer: function (feature, latLng) {
				// only add SIGL Lake Huron sites
				if (feature.properties.lake_type_id == 2) {
					const marker = {
						radius: 4,
						fillColor: "#364e4a",
						weight: 0,
						opacity: 0.5,
						fillOpacity: 0.45,
					};
					return L.circleMarker(latLng, marker);
				}
			},
			onEachFeature: (feature, lay) => {
				//check for sigl description
				this.siglSiteCount++;
				if (feature.properties.description) {
					lay.bindPopup(
						"<b>SiGL Site Name: </b>" +
							feature.properties.name +
							"<br/><b>Site Description: </b>" +
							feature.properties.description
					);
				} else {
					lay.bindPopup(
						"<b>SiGL Site Name: </b>" + feature.properties.name
					);
				}

				lay.on("click", function (e) {
					// check for overlapping sites
					let locSites = 0;
					geoJson.features.forEach((ft) => {
						const coord = ft.geometry.coordinates;
						const featCoord = this._latlng;
						if (
							coord[0].toFixed(3) === featCoord.lng.toFixed(3) &&
							coord[1].toFixed(3) === featCoord.lat.toFixed(3)
						) {
							locSites++;
						}
					});
					if (locSites > 1 && e.target._map._zoom < 15) {
						if (e.target.feature.properties.description) {
							e.target
								.getPopup()
								.setContent(
									"<b>SiGL Site Name: </b>" +
										feature.properties.name +
										"<br/><b>Site Description: </b>" +
										feature.properties.description
								);
						} else {
							e.target
								.getPopup()
								.setContent(
									"<b>SiGL Site Name: </b>" +
										feature.properties.name
								);
						}
					}

					// if site is already selected, just open the popup
					let run = true;
					if (self.selectedSiteLayer) {
						self.selectedSiteLayer.eachLayer((site) => {
							if (
								site._latlng["lat"] === this._latlng["lat"] &&
								site._latlng["lng"] === this._latlng["lng"]
							) {
								run = false;
							}
						});
					}
					if (run) {
						// control key used to select multiple sites
						if (!e.originalEvent.ctrlKey && !self.selectMultSites) {
							if (self.selectedSiteLayer) {
								self.highlightMarkers.forEach((marker) =>
									self.selectedSiteLayer.remove(marker)
								);
							}
							self.highlightMarkers = [];
							self.highlightSelectedSite(e);
							self._selectedSiteSubject.next(
								e.target.feature.properties
							);
						} else {
							self.highlightSelectedSite(e);
							self._selectMultSubject.next(
								e.target.feature.properties
							);
						}
					} else {
						this.openPopup();
					}
				});
			},
		}).addTo(this.siglLayer);
	}

	public addToSitesLayer(geoJson: any) {
		const self = this;
		if (this.markerClusters) {
			this.markerClusters.remove();
		}
		if (this.selectedSiteLayer) {
			this.highlightMarkers.forEach((marker) =>
				this.selectedSiteLayer.remove(marker)
			);
			this.selectedSiteLayer.eachLayer((lay) => {
				this.selectedSiteLayer.removeLayer(lay);
			});
		}
		this.highlightMarkers = [];
		const layer = L.geoJSON(geoJson, {
			pointToLayer: function (feature, latLng) {
				const marker = self.setMarker(feature, self);
				return L.circleMarker(latLng, marker);
			},
			onEachFeature: (feature, lay) => {
				lay.bindPopup(
					"<b>Site Name: </b>" +
						feature.properties.name +
						"<br/><b>Location Name: </b>" +
						feature.properties.locName +
						"<br/><b>Organization Name: </b>" +
						feature.properties.orgName +
						"<br/><b>Site Type: </b>" +
						feature.properties.type +
						"<br/><b>Result Count: </b>" +
						feature.properties.resultCnt
				);

				lay.on("click", function (e) {
					// check for overlapping sites
					let locSites = 0;
					geoJson.features.forEach((ft) => {
						const coord = ft.geometry.coordinates;
						const featCoord = this._latlng;
						if (
							coord[0].toFixed(3) === featCoord.lng.toFixed(3) &&
							coord[1].toFixed(3) === featCoord.lat.toFixed(3)
						) {
							locSites++;
						}
					});
					if (locSites > 1 && e.target._map._zoom < 15) {
						e.target
							.getPopup()
							.setContent(
								"<b>Site Name: </b>" +
									feature.properties.name +
									"<br/><b>Location Name: </b>" +
									feature.properties.locName +
									"<br/><b>Organization Name: </b>" +
									feature.properties.orgName +
									"<br/><b>Site Type: </b>" +
									feature.properties.type +
									"<br/><b>Result Count: </b>" +
									feature.properties.resultCnt +
									'<br><b style="color: red;">WARNING: overlapping sites here. Zoom in to access individual sites</b>'
							);
					}

					// if site is already selected, just open the popup
					let run = true;
					if (self.selectedSiteLayer) {
						self.selectedSiteLayer.eachLayer((site) => {
							if (
								site._latlng["lat"] === this._latlng["lat"] &&
								site._latlng["lng"] === this._latlng["lng"]
							) {
								run = false;
							}
						});
					}
					if (run) {
						// control key used to select multiple sites
						if (!e.originalEvent.ctrlKey && !self.selectMultSites) {
							if (self.selectedSiteLayer) {
								self.highlightMarkers.forEach((marker) =>
									self.selectedSiteLayer.remove(marker)
								);
							}
							self.highlightMarkers = [];
							self.highlightSelectedSite(e);
							self._selectedSiteSubject.next(
								e.target.feature.properties
							);
						} else {
							self.highlightSelectedSite(e);
							self._selectMultSubject.next(
								e.target.feature.properties
							);
						}
					} else {
						this.openPopup();
					}
				});
			},
		}).addTo(this.sitesLayer);

		/* this.markerClusters = L.markerClusterGroup({
			showCoverageOnHover: false,
			maxClusterRadius: 0.05,
			spiderfyDistanceMultiplier: 2,
			iconCreateFunction: function (cluster) {
				const children = cluster.getAllChildMarkers();
				// sets which property to use for symbolization
				const props = new Array();
				let idx;
				let color;
				const colors = self.siteColors;
				const cat = self.siteCategories;
				for (const child of children) {
					let prop;
					prop = child.feature.properties[self.colorBy];
					if (props.indexOf(prop) === -1) {
						props.push(prop);
					}
				}
				if (props.length === 1) {
					// if all sites have the same property value (searchType or orgName), use the color for that property
					idx = cat.indexOf(props[0]);
					if (idx > -1) {
						color = colors[idx];
					} else {
						cat.push(props[0]);
						color = colors[cat.length - 1];
					}
					return new L.DivIcon({
						html:
							'<div class="' +
							props[0].toLowerCase() +
							'"style="background-color:' +
							color +
							';"><span>' +
							cluster.getChildCount() +
							"</span></div>",
						className:
							"marker-cluster marker-cluster-small marker-border-" +
							color.slice(1),
						iconSize: new L.Point(4, 4),
					});
				} else {
					// if the sites in the cluster have more than one property value, color the cluster grey
					return new L.DivIcon({
						html:
							'<div class="multiple-types"><span>' +
							cluster.getChildCount() +
							"</span></div>",
						className:
							"marker-cluster marker-cluster-small border-multiple-types",
						iconSize: new L.Point(4, 4),
					});
				}
			},
		});
		this.markerClusters.addLayer(this.sitesLayer);
		this.map.addLayer(this.markerClusters);

		this.markerClusters.disableClustering(); */

		// zoom
		// If sites layer has only one site, add extra padding
		if (geoJson.features.length > 1) {
			//force appropriate latitude for bad coordinates
			let bounds = this.sitesLayer.getBounds();
			if (bounds.getSouthWest().lat < 0) {
				//force hard-coded south cornder
				let SW = L.latLng(42.1111, bounds.getWest());
				bounds = L.latLngBounds(SW, bounds.getNorthEast());
			}
			this.map.fitBounds(bounds, {
				padding: [20, 20],
			});
		} else if (geoJson.features.length === 1) {
			this.map.fitBounds(this.sitesLayer.getBounds(), {
				padding: [0, 0],
			});
			this.map.setZoom(12);
		}
		this._siteChangeSubject.next(geoJson);
	}

	public highlightSelectedSite(site) {
		const highlightOptions = {
			radius: 4,
			weight: 12,
			opacity: 0.45,
			fill: true,
			color: "orange",
			fillColor: "#9b0004",
			fillOpacity: 0.5,
		};
		if (site.latlng) {
			this.highlightMarkers.push(
				L.circleMarker(site.latlng, highlightOptions)
			);
		} else if (site.geometry.coordinates) {
			const latlng = {};
			latlng["lat"] = site.geometry.coordinates[1];
			latlng["lng"] = site.geometry.coordinates[0];
			this.highlightMarkers.push(
				L.circleMarker(latlng, highlightOptions)
			);
		}
		this.selectedSiteLayer = L.featureGroup([]);
		this.highlightMarkers.forEach((marker) =>
			marker.addTo(this.selectedSiteLayer)
		);
		this.selectedSiteLayer.addTo(this.map);
		this.selectedSiteLayer.bringToBack();
	}

	public setMarker(feature, self) {
		// colors the site based on what symbology is selected (orgName or searchType/keyword)
		let fillColor = "";
		const prop = feature.properties[this.colorBy];

		const cat = self.siteCategories;
		const col = self.siteColors;
		if (cat.length > 0) {
			const idx = cat.indexOf(prop);
			if (idx > -1) {
				fillColor = col[idx];
			} else {
				cat.push(prop);
				fillColor = col[cat.length - 1];
			}
		} else {
			cat.push(prop);
			fillColor = col[cat.length - 1];
		}
		return {
			radius: 4,
			fillColor: fillColor,
			weight: 0,
			opacity: 1,
			fillOpacity: 0.5,
		};
	}

	public clearSites() {
		if (this.markerClusters) {
			this.markerClusters.remove();
		}
		if (this.selectedSiteLayer) {
			this.highlightMarkers.forEach((marker) =>
				this.selectedSiteLayer.remove(marker)
			);
		}
		this.selectedSiteLayer = L.featureGroup([]);
		this.sitesLayer.clearLayers();
	}

	public selectSites(sites, runDataQuery?) {
		// highlight sites and send to dataview
		// runDataQuery tells whether to update the sites in data view, not necessary when only switching symbolization
		if (sites.length === 1) {
			// if only one site selected
			const jsonIndex = this.geoJson.features.findIndex((site) => {
				return site.properties.name === sites[0];
			});
			if (jsonIndex > -1) {
				if (runDataQuery) {
					this._selectedSiteSubject.next(
						this.geoJson.features[jsonIndex].properties
					);
				}
				this.highlightSelectedSite(this.geoJson.features[jsonIndex]);
			}
		} else if (sites.length > 1) {
			// if multiple sites selected
			sites.forEach((selSite) => {
				const jsonIndex = this.geoJson.features.findIndex((site) => {
					return site.properties.name === selSite;
				});
				if (jsonIndex > -1) {
					if (runDataQuery) {
						this._selectMultSubject.next(
							this.geoJson.features[jsonIndex].properties
						);
					}
					this.highlightSelectedSite(
						this.geoJson.features[jsonIndex]
					);
				}
			});
		}
	}

	public changeSymbology(colorBy) {
		// if symbology method is switched (site v. organization), clear sites and re-add them with new symbology
		this.clearSites();
		this.colorBy = colorBy;
		// if site filters exist, put only filtered sites on map
		if (
			this.colorJson["features"] &&
			this.colorJson["features"].length !== 0
		) {
			this.addToSitesLayer(this.colorJson);
		} else {
			this.addToSitesLayer(this.geoJson);
		}
		this.updateLegend();
	}

	public updateLegend() {
		// rewrites legend div with updated colors
		const div = L.DomUtil.get("legend");
		let item =
			'<div id="legendHeader"><i id="legendIcon" class="fa fa-list"></i>Explanation' +
			'</div><div id="legendDiv"> <label>Symbolize sites by:</label>';
		if (this.colorBy === "orgName") {
			item +=
				'<input type="radio" id="siteRadio"><label>Keyword</label> <input type="radio" id="orgRadio" checked="checked">' +
				"<label>Organization</label><br>";
		} else {
			item +=
				'<input type="radio" id="siteRadio" checked="checked"><label>Keyword</label> <input type="radio" id="orgRadio">' +
				"<label>Organization</label><br>";
		}
		for (let i = 0; i < this.siteCategories.length; i++) {
			const color = this.siteColors[i];
			item +=
				'<i style="background: ' +
				color +
				';" class="site legend' +
				color.slice(1) +
				'"></i>' +
				this.siteCategories[i] +
				"<br>";
		}
		item +=
			'<i class="site multiple-types"></i>Multiple<br>' +
			'<i class="site sigl"></i>SiGL Site</div>';
		div.innerHTML = item;

		if (window.outerWidth < 1200) {
			document
				.getElementById("legendDiv")
				.classList.add("legendDiv-collapsed");
		}
	}

	public getBbox() {
		return (
			this.map.getBounds().getSouthWest().lng.toFixed(7) +
			"," +
			this.map.getBounds().getSouthWest().lat.toFixed(7) +
			"," +
			this.map.getBounds().getNorthEast().lng.toFixed(7) +
			"," +
			this.map.getBounds().getNorthEast().lat.toFixed(7)
		);
	}

	public addToNwisLayer(): void {
		const NWISmarker = L.divIcon({
			name: "NWIS",
			iconAnchor: [7, 10],
			popupAnchor: [0, 2],
		});
		let NWISmarkers = {};
		this.NWISsites.forEach((site) => {
			console.log(site);
			let siteID = site.$.sno;
			let siteName = site.$.sna;
			let lat = site.$.lat;
			let lng = site.$.lng;
			NWISmarkers[siteID] = L.circleMarker([lat, lng], {
				icon: NWISmarker,
			});
			NWISmarkers[siteID].data = { siteName: siteName, SiteCode: siteID };

			//https://nwis.waterdata.usgs.gov/nwis/uv?site_no=04137005
			let siteUrl =
				"https://nwis.waterdata.usgs.gov/nwis/uv?site_no=" + siteID;

			NWISmarkers[siteID].bindPopup(
				"<b>NWIS Site Name: </b>" +
					siteName +
					"</br><b>Site Id: </b> " +
					siteID +
					"</br><b>Site URL: </b><a href='" +
					siteUrl +
					"' target=_'blank'>" +
					siteUrl +
					"</a>"
			);

			this.nwisLayer.addLayer(NWISmarkers[siteID]);
		});
		this.nwisLayer.addTo(this.map);
	}

	// use extent to get NWIS rt gages based on bounding box, display on map
	public queryNWISrtGages(): Observable<any> {
		const NWISmarkers = {};
		//const bbox = this.getBbox();
		//debug -- BBOX is returning only for very small areas
		//const bbox = "-43.505249,41.5102175,-72.6506348,47.2884143";
		//-94.5043945,41.3932943,-72.9052734,47.6505876

		// NWIS query options from http://waterservices.usgs.gov/rest/IV-Test-Tool.html
		const huc = "04";
		const parameterCodeList = "00065,62619,62620,63160,72214";
		const siteTypeList = "OC,OC-CO,ES,LK,ST,ST-CA,ST-DCH,ST-TS";
		const siteStatus = "active";
		const url =
			"https://waterservices.usgs.gov/nwis/site/?format=mapper" +
			/* "&bBox=" +
			bbox + */
			"&huc=" +
			huc +
			"&parameterCd=" +
			parameterCodeList +
			"&siteType=" +
			siteTypeList +
			"&siteStatus=" +
			siteStatus;

		console.log("here", url);

		return this._http.get(url, { responseType: "text" }).pipe(
			map((response) => {
				xml2js.parseString(response, (err, result) => {
					console.log("result: ", result);
					this.NWISsites = result.mapper.sites[0].site;
					this.addToNwisLayer();
				});
			})
		);
	}
}
