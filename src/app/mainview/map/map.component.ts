import {
	Component,
	OnInit,
	Input,
	ElementRef,
	AfterViewInit,
} from "@angular/core";
import { MapService } from "src/app/shared/services/map.service";

import * as L from "leaflet";
import { SummariesService } from "src/app/shared/services/summaries.service";
import { ActivatedRoute } from "@angular/router";

@Component({
	selector: "app-map",
	templateUrl: "./map.component.html",
	styleUrls: ["./map.component.scss"],
})
export class MapComponent implements OnInit {
	// public WQP: any;
	collapsedMap;
	collapsedDataPanel;
	selectedSites;
	legendExpanded = true;
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
		private _summariesService: SummariesService,
		private _route: ActivatedRoute
	) {}

	ngOnInit() {
		this._summariesService.getData();
		// init map
		this._mapService.map = L.map("map", {
			center: L.latLng(44.9, -82.0),
			zoom: 9,
			minZoom: 4,
			maxZoom: 19,
			renderer: L.canvas(),
		});

		this._mapService.DataPanelCollapse.subscribe((collapse) => {
			this.collapsedDataPanel = collapse;
		});

		// baseMaps
		this._mapService.map.addLayer(
			this._mapService.baseMaps[this._mapService.chosenBaseLayer]
		);

		// add empty feature group
		this._mapService.sitesLayer = L.featureGroup().addTo(
			this._mapService.map
		);
		this._mapService.nwisLayer = L.featureGroup().addTo(
			this._mapService.map
		);

		// add legend
		this._mapService.legend = new L.Control({ position: "bottomright" });
		const self = this;
		this._mapService.legend.onAdd = function (map) {
			const div = L.DomUtil.create("div", "info legend");
			let item = "";

			item +=
				'<div id="legendHeader" ><i class="fa fa-list"></i>Explanation</div>' +
				'<div id="legendDiv"><label>Symbolize sites by:</label><input type="radio" id="siteRadio" checked="checked">' +
				'<label>Keyword</label><input type="radio" id="orgRadio"><label>Organization</label><br>';
			item += '<i class="site multiple-types"></i>Multiple</div>';
			div.innerHTML = item;
			div.id = "legend";
			// sets up click event for radio buttons
			L.DomEvent.on(div, "click", (event) => {
				// if click is in Explanation title, collapse/expand it.
				const id = event.target["id"];
				if (id === "legendHeader") {
					const classes = document.getElementById("legendDiv")
						.classList;
					if (classes.contains("legendDiv-collapsed")) {
						classes.remove("legendDiv-collapsed");
					} else {
						classes.add("legendDiv-collapsed");
					}
				} else if (id === "siteRadio" || id === "orgRadio") {
					self.changeSymbology(id);
				}
			});
			return div;
		};

		this._mapService.legend.addTo(this._mapService.map);

		/// NOT FINISHED
		this._mapService.map.on("load moveend zoomend", (e) => {
			// console.log('here',e)

			const bbox =
				this._mapService.map.getBounds().getSouthWest().lng.toFixed(7) +
				"," +
				this._mapService.map.getBounds().getSouthWest().lat.toFixed(7) +
				"," +
				this._mapService.map.getBounds().getNorthEast().lng.toFixed(7) +
				"," +
				this._mapService.map.getBounds().getNorthEast().lat.toFixed(7);

			// this._mapService.queryNWISrtGages(bbox).subscribe(results => console.log('results',results));
			if (e.target._zoom >= 15) {
				if (this._mapService.markerClusters) {
					this._mapService.markerClusters.enableClustering();
				}
			} else {
				if (this._mapService.markerClusters) {
					this._mapService.markerClusters.disableClustering();
				}
			}
		});
	}

	changeSymbology(id) {
		// triggers symbology change on clicking the radio buttons, unchecks opposite radio
		this._mapService.siteCategories = [];
		if (id === "siteRadio") {
			document.getElementById("orgRadio")["checked"] = false;
			this._mapService.changeSymbology("searchType");
		} else if (id === "orgRadio") {
			document.getElementById("siteRadio")["checked"] = false;
			this._mapService.changeSymbology("orgName");
		}
		// if sites are selected, highlights them
		const urlParams = {};
		for (const param of this.paramOptions) {
			urlParams[param] = this._route.snapshot.queryParamMap.get(param);
		}
		if (urlParams["site"] !== null) {
			this._mapService.selectSites(urlParams["site"].split(","), false);
		}
	}

	expandCollapseDataPanel() {
		this._mapService._dataPanelCollapseSubject.next(
			!this.collapsedDataPanel
		);
	}

	// When data or map is collapsed or expanded,
	// invalidate size to refresh tiles and center map
	resizeMap() {
		setTimeout(() => {
			this._mapService.map.invalidateSize();
		}, 200);
	}
}
