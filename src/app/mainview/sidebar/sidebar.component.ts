import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";

import { MapService } from "src/app/shared/services/map.service";
import { SiglService } from "src/app/shared/services/sigl.service";
import { LoaderService } from "../../shared/services/loader.service";
import { ConfigService } from "src/app/shared/services/config.service";
import { ActivatedRoute, Router } from "@angular/router";
import { CDK_CONNECTED_OVERLAY_SCROLL_STRATEGY_FACTORY } from "@angular/cdk/overlay/typings/overlay-directives";
import { map, tap } from "rxjs/operators";
import { connectableObservableDescriptor } from "rxjs/internal/observable/ConnectableObservable";

@Component({
	selector: "app-sidebar",
	templateUrl: "./sidebar.component.html",
	styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnInit {
	public parameterDropDownGroup: FormGroup;
	public siteDropDownGroup: FormGroup;
	public siglDropDownGroup: FormGroup;
	public siteFilterData;
	public siglFilterData;
	public siglSiteFilterData: any;
	public parameterFilterData;
	public defaultParameterFilter;
	public defaultMinResults = 1;
	public geoJSONsiteCount;
	public siglSiteCount;
	showBasemaps = false;
	showAuxLayers = false;
	showSiteFilters = false;
	showSiglFilters = true;
	showParameterFilters = false;
	expandSidebar = false;
	chosenBaseLayer;

	public lakeProjects;

	public urlParams = {};
	public urlCharParam;
	public urlSelSites;
	public urlEventYear;
	public urlMinResults;
	public firstLoad = true;
	public filterSelections;
	private lookups;
	public parameterSelections = { characteristic: [], minResults: 1 };
	public paramOptions = [
		"characteristic",
		"site",
		"eventYear",
		"minResults",
		"huc8",
		"orgName",
		"provider",
		"searchType",
		"type",
	];

	constructor(
		private _mapService: MapService,
		private _siglService: SiglService,
		private formBuilder: FormBuilder,
		private _loaderService: LoaderService,
		private _configService: ConfigService,
		private route: ActivatedRoute,
		private router: Router
	) {
		this.lookups = this._configService.getLookup();
	}

	ngOnInit() {
		// using plain object, IE doesn't work with URLSearchParams
		this.route.queryParams.subscribe(() => {
			for (const param of this.paramOptions) {
				this.urlParams[param] = this.getUrlParam(param);
			}
		});

		// for now we can keep this a static list but ultimately could pull from here in a service
		// https://www.waterqualitydata.us/Codes/Characteristicname?mimeType=xml
		this.parameterFilterData = {
			characteristics: [
				"Ammonia",
				"Ammonia and ammonium",
				"Ammonia-nitrogen as N",
				"Chlorophyll a",
				"Dissolved oxygen (DO)",
				"Inorganic nitrogen (nitrate and nitrite)",
				"Inorganic nitrogen (nitrate and nitrite) as N",
				"Kjeldahl nitrogen",
				"Nitrate",
				"Nitrate + Nitrite",
				"Nitrate as N",
				"Nitrogen",
				"Nitrogen, mixed forms (NH3), (NH4), organic, (NO2) and (NO3)",
				"Temperature, water",
				"Total Nitrogen, mixed forms (NH3), (NH4), organic, (NO2) and (NO3)",
				"Total Kjeldahl nitrogen",
			],
			eventYears: this.getEventYears(),
		};

		this.defaultParameterFilter = "Nitrate";

		//fire sigl service data request
		this._siglService.getSiglSites().subscribe((response) => {
			/* this._siglService.siglgeoJson.features.forEach((feature) => {
				if (feature.properties.site_parameters.length > 0) {
					console.log(feature.properties.site_parameters);
				} else {
					console.log("no site properties");
				}
			}); */
			this.siglSiteCount = this._mapService.siglSiteCount;
			this._loaderService.hideFullPageLoad();
		});
		this._siglService.getProjects().subscribe((response) => {
			//TODO: create subject getter/setter in service
			this.siglFilterData = this._siglService.projects;
		});

		this.parameterDropDownGroup = this.formBuilder.group({
			characteristic: [this.defaultParameterFilter],
			eventYear: [],
			minResults: 1,
		});
		// get selected sites, characteristics and event years if they were sent through the url
		if (this.urlParams["site"] !== null) {
			this.urlSelSites = this.urlParams["site"].split(",");
		} else {
			this.urlSelSites = [];
		}
		if (this.urlParams["characteristic"] !== null) {
			this.urlCharParam = this.urlParams["characteristic"].split(",");
		} else {
			this.urlCharParam = [];
		}
		if (this.urlParams["eventYear"] !== null) {
			this.urlEventYear = this.urlParams["eventYear"];
		} else {
			this.urlEventYear = undefined;
		}
		if (this.urlParams["minResults"] !== null) {
			this.urlMinResults = this.urlParams["minResults"];
		} else {
			this.urlMinResults = undefined;
		}

		// use characteristic sent through in url, otherwise 'Nitrate'
		if (this.urlCharParam.length > 0 && this.urlCharParam[0] !== null) {
			this.setURLChar(this.urlCharParam);
		} else {
			this.urlParams["characteristic"] = this.defaultParameterFilter;
			this.updateQueryParams();
			this.parameterDropDownGroup
				.get("characteristic")
				.setValue([this.defaultParameterFilter]);
			this.parameterSelections.characteristic = [
				this.defaultParameterFilter,
			];
		}

		// use event years sent through in url
		if (this.urlEventYear) {
			this.parameterDropDownGroup
				.get("eventYear")
				.setValue(this.urlEventYear);
			this._mapService._eventYearSubject.next(this.urlEventYear);
			this._mapService.URLparams.SEARCHPARAMS +=
				";startDateLo:01-01-" +
				this.urlEventYear +
				";startDateHi:12-31-" +
				this.urlEventYear;
		}

		// use min results sent through in url, otherwise 1
		if (this.urlMinResults) {
			this.parameterDropDownGroup
				.get("minResults")
				.setValue(this.urlMinResults);
			this._mapService._minResultsSubject.next(this.urlMinResults);
			this._mapService.URLparams.SEARCHPARAMS +=
				";minresults:" + this.urlMinResults;
			this.parameterSelections.minResults = this.urlMinResults;
		} else {
			this.parameterDropDownGroup
				.get("minResults")
				.setValue(this.defaultMinResults);
			this._mapService._minResultsSubject.next(this.defaultMinResults);
			this._mapService.URLparams.SEARCHPARAMS +=
				";minresults:" + this.defaultMinResults;
		}

		this.siteDropDownGroup = this.formBuilder.group({
			huc8: [[]],
			location: [[]],
			name: [[]],
			orgName: [[]],
			provider: [[]],
			searchType: [[]],
			type: [[]],
		});

		//value must match lookup property in the sigl geoJosn feature.properties
		this.siglDropDownGroup = this.formBuilder.group({
			project_id: [[]],
		});

		// this is the main data request
		this._mapService.getData().subscribe((response) => {
			this.siteFilterData = response;
			//console.log("site filter data", this.siteFilterData);
			this._mapService.colorJson = [];
			this._mapService.siteCategories = [];
			const self = this;
			// add huc8 names to the sidebar select
			if (this.siteFilterData.huc8) {
				this.siteFilterData.huc8.forEach(function (item, index) {
					let label;
					self.lookups.huc8[item]
						? (label = self.lookups.huc8[item])
						: (label = item);
					self.siteFilterData.huc8[index] = { val: item, lab: label };
				});
			}
			this._mapService.addToSitesLayer(this._mapService.geoJson);
			this.geoJSONsiteCount = this._mapService.geoJson.totalFeatures;

			// get site filters from url params
			this.setFilters();
			// highlights selected sites on map, which triggers data query
			if (this.urlSelSites[0] !== null) {
				this._mapService.selectSites(this.urlSelSites, true);
			}
			this.firstLoad = false;
			this._mapService.updateLegend();
			this._mapService._toasterSubject.next("none");
		});

		// set up filter listeners
		this.onChanges();
	}

	onItemSelect(item: any) {
		console.log(item);
	}
	onSelectAll(items: any) {
		console.log(items);
	}

	getEventYears() {
		// creates list of year options for event year filter from 1932 to today
		const years = [];
		let startDate = new Date(1932, 0, 1);
		const endDate = new Date();
		while (startDate < endDate) {
			years.push(startDate.getFullYear());
			startDate = new Date(startDate.getFullYear() + 1, 0, 1);
		}
		return years;
	}

	public setFilters() {
		// change site dropdown filters to match filters sent through url on load
		Object.keys(this.siteDropDownGroup.controls).forEach((key) => {
			const paramKey = this.urlParams[key];
			if (paramKey && paramKey !== null) {
				this.siteDropDownGroup.get(key).setValue(paramKey.split(","));
			}
		});
	}

	public updateQueryParams() {
		// cycle through each param to create query string
		const params = this.urlParams;
		Object.keys(params).forEach((key) => {
			if (params[key] instanceof Array) {
				params[key] = params[key].join(",");
			}
		});
		this.router.navigate([], {
			relativeTo: this.route,
			queryParams: params,
		});
	}

	public setURLChar(characteristics) {
		// get shortened/url-friendly versions of the characteristic names to use in the filter/url
		const copyChar = JSON.parse(JSON.stringify(characteristics));
		for (let i = 0; i < copyChar.length; i++) {
			const char = copyChar[i];
			// check for characteristic in lookup.json
			if (this.lookups.characteristic[char]) {
				copyChar[i] = this.lookups.characteristic[char];
			}
		}
		// update url and filter
		this.parameterDropDownGroup.get("characteristic").setValue(copyChar);
		this.parameterSelections.characteristic = copyChar;
		this._mapService._characteristicFilterSubject.next(copyChar);
		const characteristic = copyChar.join("|");
		// update search params
		this._mapService.URLparams.SEARCHPARAMS =
			this._mapService.URLparams.SEARCHPARAMS.split(
				"characteristicName:"
			)[0] +
			"characteristicName:" +
			characteristic;
	}

	public setChar(characteristics) {
		// shortened/url-friendly versions of the characteristic names are used in filter/url, this sends the correct value to the request
		const copyChar = JSON.parse(JSON.stringify(characteristics));
		for (let i = 0; i < copyChar.length; i++) {
			const char = copyChar[i];
			// check for characteristic in lookup.json
			if (this.lookups.characteristic[char]) {
				copyChar[i] = this.lookups.characteristic[char];
			}
		}
		// update url and filter
		this.urlParams["characteristic"] = copyChar;
		this._mapService._characteristicFilterSubject.next(characteristics);
		const characteristic = characteristics.join("|");
		// update search params
		this._mapService.URLparams.SEARCHPARAMS =
			this._mapService.URLparams.SEARCHPARAMS.split(
				"characteristicName:"
			)[0] +
			"characteristicName:" +
			characteristic;
	}

	private onChanges(): void {
		// requery on wfs data on any parameter filter dropdown change
		this.parameterDropDownGroup.valueChanges.subscribe((selections) => {
			this.parameterSelections = selections;
		});

		this.siglDropDownGroup.valueChanges.subscribe((selections) => {
			this.filterSiglJSON(selections);
		});

		// on site dropdown change just re-filter geojson
		this.siteDropDownGroup.valueChanges.subscribe((selections) => {
			// remove selected sites from url
			delete this.urlParams["site"];
			if (!this.firstLoad) {
				// if site filters are changed after load, update the url
				Object.keys(selections).forEach((key) => {
					delete this.urlParams[key];
					if (selections[key].length > 0) {
						this.urlParams[key] = selections[key].join(",");
					} else {
						delete this.urlParams[key];
					}
				});
			}
			this.updateQueryParams();
			this.filterSelections = selections;
			this.filterGeoJSON(selections);
		});
	}

	public getUrlParam(name) {
		// because IE doesn't support URLSearchParams, this function reads the param value from the url
		const results = new RegExp("[?&]" + name + "=([^&#]*)").exec(
			window.location.href
		);
		if (results == null) {
			return null;
		} else {
			return decodeURI(results[1]) || 0;
		}
	}

	public updateParamFilters(selections) {
		if (selections.characteristic.length === 0) {
			// if no characteristics are selected, clear all map sites, update url, and alert the user
			delete this.urlParams["characteristic"];
			this.updateQueryParams();
			return;
		}
		// reset url params so only param filters (characteristic, eventYear, minResults) are listed
		this.urlParams = {};
		this.urlParams["characteristic"] = selections.characteristic.join(",");
		this.setChar(selections.characteristic);
		// check for eventYear selection
		if (!selections.eventYear || selections.eventYear == null) {
			delete this.urlParams["eventYear"];
			this._mapService._eventYearSubject.next();
		} else {
			this.urlParams["eventYear"] = selections.eventYear;
			this._mapService._eventYearSubject.next(selections.eventYear);
			this._mapService.URLparams.SEARCHPARAMS +=
				";startDateLo:01-01-" +
				selections.eventYear +
				";startDateHi:12-31-" +
				selections.eventYear;
		}
		// check for minResults selection
		if (!selections.minResults || selections.minResults == null) {
			this.parameterDropDownGroup
				.get("minResults")
				.setValue(this.defaultMinResults);
		} else {
			this.urlParams["minResults"] = selections.minResults;
			this._mapService._minResultsSubject.next(selections.minResults);
			this._mapService.URLparams.SEARCHPARAMS +=
				";minresults:" + selections.minResults;
		}
		this.updateQueryParams();
	}

	public reQuery(): void {
		this._mapService.colorJson = [];
		this._mapService.siteCategories = []; // empties categories to update symbology
		// send updated parameter filters to dataview when submitted
		this.updateParamFilters(this.parameterSelections);
		// issue new request with updated URL params
		this._mapService.clearSites();
		this._mapService.getData().subscribe((response) => {
			// repopulate site filter dropdowns
			this.siteFilterData = response;
			const self = this;
			// add huc8 names to the sidebar select
			if (this.siteFilterData.huc8) {
				this.siteFilterData.huc8.forEach(function (item, index) {
					let label;
					self.lookups.huc8[item]
						? (label = self.lookups.huc8[item])
						: (label = item);
					self.siteFilterData.huc8[index] = { val: item, lab: label };
				});
			}

			// clearForm function clears layer and readds geojson
			this.clearForm();
			this._loaderService.hideFullPageLoad();
			if (response.length === 0) {
				this._mapService._siteChangeSubject.next([]);
			}
			this._mapService.updateLegend();
		});
	}

	//Todo: This logic should really be done in the sigl service
	public filterSiglJSON(selections: any): void {
		console.log("Sigl Filter Values", selections);
		let filterJson;
		this._mapService.siglLayer.clearLayers();
		filterJson = JSON.parse(JSON.stringify(this._siglService.siglgeoJson));
		filterJson.features = [];
		this.siglSiteCount = 0;

		this._siglService.siglgeoJson.features.forEach((feature) => {
			// assume we have a match for this feature until proven otherwise
			let match = true;

			// need to check if the site matches all the selected values
			for (const selection in selections) {
				// make sure this selection has a value
				if (selections[selection].length > 0) {
					// check if this feature DOESN'T MATCH the selection
					if (
						selections[selection].indexOf(
							feature.properties[selection]
						) === -1
					) {
						// doesnt meet this selection so set flag to false
						match = false;
					}
				}
			}
			// if we still have a match, its a keeper
			if (match) {
				filterJson.features.push(feature);
			}
		});

		this._mapService.addToSiglLayer(filterJson);
		this.siglSiteCount = this._mapService.siglSiteCount;
		console.log("sigl sites after filter:", this._mapService.siglSiteCount);
	}

	public filterGeoJSON(selections: any): void {
		this._mapService.siteCategories = [];
		let filterJson;

		// console.log("dropdown changed: ", selections);
		this._mapService.sitesLayer.clearLayers();

		// make copy of geojson
		filterJson = JSON.parse(JSON.stringify(this._mapService.geoJson));
		filterJson.totalFeatures = 0;
		filterJson.features = [];

		// main loop over all features
		this._mapService.geoJson.features.forEach((feature) => {
			// assume we have a match for this feature until proven otherwise
			let match = true;

			// need to check if the site matches all the selected values
			for (const selection in selections) {
				// make sure this selection has a value
				if (selections[selection].length > 0) {
					// check if this feature DOESN'T MATCH the selection
					if (
						selections[selection].indexOf(
							feature.properties[selection]
						) === -1
					) {
						// doesnt meet this selection so set flag to false
						match = false;
					}
				}
			}

			// if we still have a match, its a keeper
			if (match) {
				filterJson.features.push(feature);
			}
		});

		filterJson.totalFeatures = filterJson.features.length;
		this.geoJSONsiteCount = filterJson.totalFeatures;
		this._mapService.colorJson = filterJson; // if symbolization is changed, it uses the colorJson if not empty
		// console.log('new json length',filterJson.totalFeatures);
		this._mapService.addToSitesLayer(filterJson);
		this._mapService._siteChangeSubject.next(filterJson);
		this._mapService.updateLegend();
	}

	public clearForm(): void {
		// reset values to empty arrays if set
		Object.keys(this.siteDropDownGroup.controls).forEach((key) => {
			if (this.siteDropDownGroup.get(key).value.length > 0) {
				this.siteDropDownGroup.get(key).setValue([]);
			}
		});

		this._mapService.sitesLayer.clearLayers();

		// set filtergeoJson back to original
		this._mapService.filterJson = this._mapService.geoJson;
		this.geoJSONsiteCount = this._mapService.geoJson.totalFeatures;
		this._mapService.addToSitesLayer(this._mapService.filterJson);
		//this._mapService.addToSitesLayer(this._mapService.siglgeoJson); // add sigl points back after clear
	}

	// called from sidebar layer click
	public toggleLayer(newVal: string) {
		//check for standard map layers, else basemaps
		if (
			newVal == "nwisLayer" ||
			newVal == "siglLayer" ||
			newVal == "sitesLayer"
		) {
			if (this._mapService.map.hasLayer(this._mapService[newVal])) {
				this._mapService.map.removeLayer(this._mapService[newVal]);
			} else {
				this._mapService.map.addLayer(this._mapService[newVal]);
			}
		} else {
			this._mapService.chosenBaseLayer = newVal;
			Object.keys(this._mapService.baseMaps).forEach((basemap) => {
				this._mapService.map.removeLayer(
					this._mapService.baseMaps[basemap]
				);
			});
			this._mapService.map.addLayer(this._mapService.baseMaps[newVal]);
		}
	}
}
