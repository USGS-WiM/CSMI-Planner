import { Component, OnInit } from "@angular/core";
import * as Highcharts from "highcharts";
import exporting from "highcharts/modules/exporting";
exporting(Highcharts);
import * as regression from "regression";

import { MapService } from "src/app/shared/services/map.service";
import { LoaderService } from "../../shared/services/loader.service";
import {
	HttpClient,
	HttpParams,
	HttpErrorResponse,
	HttpHeaders,
} from "@angular/common/http";
import { ConfigService } from "src/app/shared/services/config.service";
import { Config } from "src/app/shared/interfaces/config";
import { CustomQueryEncoderHelper } from "src/app/shared/services/customEncoder";
import { throwError } from "rxjs";
import { Router, ActivatedRoute } from "@angular/router";
import { SiglService } from "src/app/shared/services/sigl.service";

@Component({
	selector: "app-dataview",
	templateUrl: "./dataview.component.html",
	styleUrls: ["./dataview.component.scss"],
})
export class DataviewComponent implements OnInit {
	// HighCharts
	private _siteChartOptions: any;
	public typeChart: any;
	private _typeChartOptions: any;
	public orgChart: any;
	public resultCsv;
	public resultJson;
	public queryChar = ["Nitrate"];
	public ancillaryChar = ["pH", "Temperature, water"];
	public charTypes = [];
	private siteFilterData;
	private geoJSONsiteCount;
	private geojson;
	public showSiteData = false;
	public selectedSites = [];
	public noData = false;
	public noGraphData = false;
	private selectedChar;
	private fractionTypes;
	public showModal = false;
	public urlParams = {};
	public urlSites;
	public subscription;
	public charsWithData = [];

	public selectedSiglSite$;
	public selectedSiglSite;
	public selectedProject;

	private configSettings: Config;
	public datesWithResults = [];
	public resultParams = {
		mimeType: "csv",
		zip: "no",
		minactivities: "1",
	};
	public eventYear;
	public chartNo = 0;
	public axis = "BottomX";
	public charts = [];
	public chartType = "linear";
	public selectMultSites = false;
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
	public collapsedPanel;

	constructor(
		private _mapService: MapService,
		private _siglService: SiglService,
		private _http: HttpClient,
		private _loaderService: LoaderService,
		private _configService: ConfigService,
		private router: Router,
		private route: ActivatedRoute
	) {
		this.configSettings = this._configService.getConfiguration();
	}

	ngOnInit() {
		this.route.queryParams.subscribe(() => {
			this.getUrlParams();
		});
		this._mapService.SelectedSite.subscribe((Response) => {
			// subscriber for map click, updates url params and queries site's result data
			if (Response.lake_type_id) {
				console.log("selected sigl site response", Response);
				this.getSiteData(Response.site_id);
				this.getProjectData(Response.project_id);
			} else {
				//ensure that previously-selected sigl sites get cleared
				this.selectedSiglSite = null;
				this.selectedProject = null;
				this.charsWithData = [];
				this.getUrlParams();
				if (this.urlSites[0] !== Response.name) {
					// add selected site to url if not already in it
					this.urlSites = [Response.name];
					this.urlParams["site"] = this.urlSites.join(",");
					this.updateQueryParams();
				}
				this.selectedSites = [Response.name];
				this.getResultData(); // query result data
			}
		});
		this._mapService.MultSelect.subscribe((Response) => {
			// subscriber for map ctrl+click (selecting multiple sites)
			this.charsWithData = [];
			this.getUrlParams();
			if (this.urlSites.indexOf(Response.name) === -1) {
				// add selected site to url if not already in it
				this.urlSites.push(Response.name);
				this.urlParams["site"] = this.urlSites.join(",");
				this.updateQueryParams();
			}
			if (this.selectedSites.indexOf(Response.name) === -1) {
				this.selectedSites.push(Response.name);
			}
			// if user doesn't have the "Select Multiple Sites" button selected, query result data
			if (this.selectMultSites === false) {
				this.getResultData();
			}
		});
		this._mapService.SelectedChar.subscribe((Response) => {
			// subscriber for parameter filter/characteristic selection
			if (Response.length > 0) {
				this.queryChar = Response;
			}
		});
		this._mapService.EventYear.subscribe((Response) => {
			// subscriber for parameter filter/characteristic selection
			this.eventYear = Response;
		});

		this._mapService.SiteChange.subscribe((geojson) => {
			// subscriber for sites updating on the map (e.g. when a filter is selected)
			this.geojson = geojson;
			this.geoJSONsiteCount = geojson.features.length;
			this.siteFilterData = this._mapService.filterOptions;
			this.getUrlParams();
			// if a site was sent through url on load, will skip making statistic charts
			if (this.urlSites.length === 0) {
				this.selectedSites = [];
				this.showSiteData = false;
				// create pie charts based on type and organization of all sites on the map
				if (this.geoJSONsiteCount > 0) {
					this.noData = false;
					this.createStatChart(
						this.typeChart,
						"Site Type Stats",
						"searchType"
					);
					this.createStatChart(
						this.orgChart,
						"Site Organization Stats",
						"orgName"
					);
				} else {
					this.noData = true;
				}
			}
		});

		this._mapService.DataPanelCollapse.subscribe((collapse) => {
			this.collapsedPanel = collapse;
		});

		// custom chart export button
		const customButton = Highcharts.getOptions().exporting.buttons
			.contextButton;
		customButton.text = "Chart Options";
		customButton.theme = { fill: "#3E3BFB" };
		customButton.symbol = null;
		if (window.outerWidth < 1200) {
			customButton.y = -10;
		}
		customButton.menuItems = customButton.menuItems.slice(2);

		this._siteChartOptions = {
			// options for site data scatter plots
			credits: {
				enabled: false,
			},
			chart: {
				type: "scatter",
				zoomType: "xy",
			},
			xAxis: {
				title: {
					text: "Activity Start Date",
				},
				startOnTick: true,
				endOnTick: true,
				// add ticks for months
				minorTickInterval: 31540000000 / 12,
				minorTickLength: 10,
				minorGridLineWidth: 0,
				gridLineWidth: 0,
				minorTickWidth: 1,
				tickLength: 15,
				tickInterval: 31540000000,
				tickmarkPlacement: "on",
				tickColor: "#000000",
				showLastLabel: true,
				labels: {
					y: 25,
					formatter: function () {
						return Highcharts.dateFormat("%Y", this.value);
					},
				},
				type: "datetime",
				height: "160px", // setting height so it doesn't adjust when there are multiple series
			},
			yAxis: {
				title: {
					text: null,
				},
				height: "160px",
			},
			legend: {
				floating: false,
				borderWidth: 1,
				maxHeight: "78",
			},
			plotOptions: {
				scatter: {
					marker: {
						radius: 5,
						states: {
							hover: {
								enabled: true,
								lineColor: "rgb(100,100,100)",
							},
						},
					},
					tooltip: {
						headerFormat: "<b>{point.x:%Y-%m-%d}<b><br>",
						pointFormat: "{point.name}",
						shared: true,
					},
				},
				line: {
					marker: {
						radius: 5,
					},
					tooltip: {
						headerFormat: "<b>{point.x:%Y-%m-%d}<b><br>",
						pointFormat: "{point.name}",
						shared: true,
					},
				},
			},
			responsive: {
				rules: [
					{
						condition: {
							maxWidth: 500,
						},
						chartOptions: {
							legend: {},
							yAxis: {
								labels: {},
								title: {
									text: null,
								},
							},
							subtitle: {
								text: null,
							},
							credits: {
								enabled: false,
							},
						},
					},
				],
			},
			exporting: {
				enabled: true,
				contextButton: customButton,
			},
		};

		this._typeChartOptions = {
			// chart options for pie charts
			credits: {
				enabled: false,
			},
			chart: {
				type: "pie",
			},
			tooltip: {
				pointFormat: "{point.name}: {point.percentage:.1f}",
			},
			plotOptions: {
				pie: {
					allowPointSelect: true,
					cursor: "pointer",
					dataLabels: {
						enabled: true,
						format: "<b>{point.name}</b>: {point.percentage:.1f} %",
					},
				},
			},
			responsive: {
				rules: [
					{
						condition: {
							maxWidth: 500,
						},
						chartOptions: {
							legend: {},
							yAxis: {
								labels: {},
								title: {
									text: null,
								},
							},
							subtitle: {
								text: null,
							},
							credits: {
								enabled: false,
							},
						},
					},
				],
			},
			exporting: {
				enabled: false,
			},
		};

		this.typeChart = new Highcharts.Chart(
			"typeChart",
			this._typeChartOptions
		);
		this.orgChart = new Highcharts.Chart(
			"orgChart",
			this._typeChartOptions
		);
		this.typeChart.setTitle({ text: "Sites By Type" });
		this.orgChart.setTitle({ text: "Sites By Organization" });
	} // End NgOnInit

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

	public toggleSelectMultSites(bool) {
		// toggle on/off "select multiple sites button"
		this._mapService.selectMultSites = bool;
		this.selectMultSites = bool;
		// if toggling it off, query result data for selected sites
		if (!bool) {
			this.getResultData();
		}
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

	public getSiteData(siteId) {
		this.selectedSiglSite$ = this._siglService
			.getFullSite(siteId)
			.subscribe((res) => {
				this.selectedSiglSite = res;
				console.log("full site in datacomponent", res);
				console.log(this.selectedSiglSite);
			});
	}

	public getProjectData(projectId) {
		this.selectedProject = this._siglService.projects.find(
			(proj) => proj.project_id === projectId
		);
		console.log("selected Project", this.selectedProject);
	}

	public getUrlParams() {
		for (const param of this.paramOptions) {
			this.urlParams[param] = this.getUrlParam(param);
		}

		// update url sites/event year
		if (this.urlParams["site"] !== null) {
			this.urlSites = this.urlParams["site"].split(",");
		} else {
			this.urlSites = [];
		}
		if (this.urlParams["eventYear"] !== null) {
			this.eventYear = this.urlParams["eventYear"];
		} else {
			this.eventYear = null;
		}
	}

	public getResultData() {
		// get result query, gets back a csv
		if (this.subscription) {
			this.subscription.unsubscribe();
		}
		this._loaderService.showDataLoad();

		// add site, characteristic and event years to request parameters
		this.resultParams["siteid"] = this.selectedSites;
		this.resultParams["characteristicName"] = this.queryChar.concat(
			this.ancillaryChar
		);
		if (this.eventYear != null) {
			this.resultParams["startDateLo"] = "01-01-" + this.eventYear;
			this.resultParams["startDateHi"] = "12-31-" + this.eventYear;
		} else {
			if (this.resultParams["startDateLo"]) {
				delete this.resultParams["startDateLo"];
			}
			if (this.resultParams["startDateHi"]) {
				delete this.resultParams["startDateHi"];
			}
		}

		// encode query parameters (some characters were causing issues)
		const preparedParams = new HttpParams({
			encoder: new CustomQueryEncoderHelper(),
			fromObject: this.resultParams,
		});
		// result data query
		this.subscription = this._http
			.get(this.configSettings.resultUrl, {
				headers: new HttpHeaders({ Accept: "text/plain" }),
				params: preparedParams,
				responseType: "text",
			})
			.subscribe(
				(csv) => {
					this.noGraphData = false;
					this.resultCsv = csv;
					this.resultJson = this.csvJSON(this.resultCsv);
					this.showSiteData = true;
					this.noData = false;
					this.charTypes = [];

					// if data returned
					if (
						this.resultJson.length > 0 &&
						this.selectedSites.length > 0
					) {
						this.getCharTypes(); // get list of characteristic types from data
						this.removeExtraData(); // remove ancillary data for dates where there's no data for the selected parameters
						this.selectedChar = this.charTypes[0];
						this.createCharts(this.charTypes[0], false); // make charts for the first characteristic type
						this.addProps();
					} else {
						this.noData = true;
					} // if response csv has no actual data, show no data message
					// clear loaders when done
					this._loaderService.hideDataLoad();
					return;
				},
				(error) => {
					this._loaderService.hideDataLoad();
					this.handleError(error);
				}
			);
	}

	public getCharTypes() {
		// gets list of characteristic types/measure unit codes that will become the options in the "Measurement Type" select
		this.fractionTypes = [];
		this.datesWithResults = [];
		// loop through resultJson
		for (let i = 0; i < this.resultJson.length; i++) {
			const value = this.resultJson[i]["ResultMeasure/MeasureUnitCode"];
			const char = this.resultJson[i].CharacteristicName;
			// if characteristic is not selected in sidebar go to next item (e.g. pH), otherwise add to list of characteristics with data
			if (this.queryChar.indexOf(char) === -1) {
				continue;
			}
			if (this.charsWithData.indexOf(char) === -1) {
				this.charsWithData.push(char);
			}
			// add to list of dates to cross-check ph/water temp with
			const dateTime =
				this.resultJson[i].ActivityStartDate +
				this.resultJson[i]["ActivityStartTime/Time"];
			if (this.datesWithResults.indexOf(dateTime) === -1) {
				this.datesWithResults.push(dateTime);
			}
			// get list of characteristic types/measure unit codes (e.g. mg/l as N) in result json
			if (
				value === "" &&
				this.resultJson[i].ResultMeasureValue !== "" &&
				this.charTypes.indexOf("N/A") === -1
			) {
				this.charTypes.push("N/A");
			} else if (value !== "" && this.charTypes.indexOf(value) === -1) {
				this.charTypes.push(value);
			}
			// get list of fraction types in result json
			const frac = this.resultJson[i].ResultSampleFractionText;
			if (
				this.fractionTypes.indexOf(frac) === -1 &&
				frac !== "None" &&
				frac !== ""
			) {
				this.fractionTypes.push(frac);
			}
		}
		this.fractionTypes.push("None");
	}

	public removeExtraData() {
		let index = this.resultJson.length - 1;
		// removes ancilarry data (pH and water temp) when they don't correspond with actual result data
		while (index >= 0) {
			const item = this.resultJson[index];
			const dateTime =
				item.ActivityStartDate + item["ActivityStartTime/Time"];
			if (
				this.queryChar.indexOf(item.CharacteristicName) === -1 &&
				this.ancillaryChar.indexOf(item.CharacteristicName) > -1 &&
				this.datesWithResults.indexOf(dateTime) === -1
			) {
				this.resultJson.splice(index, 1);
			}
			index -= 1;
		}
	}

	public createCharts(char, modal) {
		let chartDiv;
		// determine whether these are the regular charts or the charts for the print modal
		modal
			? (chartDiv = document.getElementById("modalCharts"))
			: (chartDiv = document.getElementById("charts"));
		// remove all existing charts from the div
		while (chartDiv.firstChild) {
			chartDiv.removeChild(chartDiv.firstChild);
		}
		let charts2;
		modal
			? (charts2 = document.getElementById("modalCharts2"))
			: (charts2 = document.getElementById("charts2"));
		if (charts2) {
			charts2.parentNode.removeChild(charts2);
		}
		let chartNo = 1;
		const chartData = [];
		const uniqueData = [];
		// creates charts based on characteristic (or MeasureUnitCode, e.g. "mg/l as N") as well as result fraction (dissolved, total, etc.)
		for (const frac of this.fractionTypes) {
			const series = [];
			const titleChar = [];
			for (const site of this.selectedSites) {
				// creates a series for each site
				const data = [];
				for (const result of this.resultJson) {
					const resultVal = result["ResultMeasure/MeasureUnitCode"];
					let val;
					let fracType = result.ResultSampleFractionText;
					if (fracType === "") {
						fracType = "None";
					}
					if (
						result.MonitoringLocationIdentifier === site &&
						(resultVal === char ||
							(resultVal === "" && char === "N/A")) &&
						fracType === frac
					) {
						if (/\d/.test(result.ResultMeasureValue)) {
							val = Number(result.ResultMeasureValue);
							let date = result.ActivityStartDate.split("-");
							date = Date.UTC(
								date[0],
								Number(date[1]) - 1,
								date[2]
							);
							data.push({
								x: date,
								y: val,
								name:
									val +
									" " +
									result["ResultMeasure/MeasureUnitCode"],
							});
							if (
								JSON.stringify(uniqueData).indexOf(
									JSON.stringify([date, val])
								) === -1
							) {
								uniqueData.push([date, val]);
							}
							chartData.push([date / 10000000000, val]); // need to divide values or it causes problems in regression function
							if (
								titleChar.indexOf(result.CharacteristicName) ===
								-1
							) {
								titleChar.push(result.CharacteristicName);
							}
						} // skip if no value
					}
				}
				if (data.length > 0) {
					series.push({ name: site, data: data });
				}
			}
			if (series.length > 0) {
				if (chartNo > 2 && (chartNo - 1) % 2 === 0) {
					const newChartDiv = document.createElement("div");
					modal
						? (newChartDiv.id = "modalCharts2")
						: (newChartDiv.id = "charts2");
					modal
						? newChartDiv.classList.add("chart")
						: newChartDiv.classList.add("chart-wrapper");
					chartDiv.parentNode.insertBefore(
						newChartDiv,
						chartDiv.nextSibling
					);
					chartDiv = document.getElementById(newChartDiv.id);
				}
				// dynamically adds divs for each chart before creating them
				let chartId;
				if (!modal) {
					chartId = "chart" + chartNo;
				} else {
					chartId = "modalChart" + chartNo;
				}

				const newDiv = document.createElement("div");
				newDiv.id = chartId;
				newDiv.classList.add("new-charts");
				chartDiv.appendChild(newDiv);
				const newChart = Highcharts.chart(
					chartId,
					this._siteChartOptions
				);

				// add chart title, contains characteristic and fraction
				if (frac === "" || frac === "None") {
					newChart.setTitle(
						{ text: titleChar.join(", ") + "<br>" + char },
						{},
						false
					);
				} else {
					newChart.setTitle(
						{
							text:
								titleChar.join(", ") +
								"<br>" +
								frac +
								" " +
								char,
						},
						{},
						false
					);
				}
				for (const set of series) {
					// for each series, add to chart and create a regression line
					newChart.addSeries(set);
					if (set.data.length > 2) {
						this.createRegression(newChart, set, newDiv);
					}
				}
				if (uniqueData.length < chartData.length) {
					// fix for duplicate data, slightly jitters to allow differentiation
					newChart.options.plotOptions.scatter.jitter = {
						x: 0,
						y: 0.01,
					};
				}
				newChart.redraw();
				chartNo++;
				this.charts.push(newChart);
			}
		}
		if (chartNo === 1) {
			this.noGraphData = true; // adds no graph warning if no result values were available
		} else if (!modal) {
			const charts = document.getElementsByClassName(
				"new-charts"
			) as HTMLCollectionOf<HTMLElement>;
			charts[0].style.display = "inline-block";
			for (let i = 0; i < charts.length; i++) {
				if (i + 1 !== charts.length || i % 2 === 1) {
					charts[i].style.display = "inline-block";
				}
			}
		}
		// sets chart scale to linear on start
		this.chartType = "linear";
	}

	public createRegression(chart, series, chartDiv) {
		// create regression line
		const toRemove = [];
		for (let i = 0; i < series.data.length; i++) {
			const data = series.data[i];
			data[0] = data.x / 10000000000;
			data[1] = data.y;
			if (Number.isNaN(data[0]) || Number.isNaN(data[1])) {
				toRemove.push(i);
			}
		}
		if (toRemove.length > 0) {
			// if there are any invalid points, remove them from regression and add message
			for (let i = toRemove.length - 1; i > -1; i--) {
				series.data.splice(toRemove[i], 1);
			}

			let divExists = false;
			chartDiv.childNodes.forEach((div) => {
				if (div.id === "invalid-msg-div") {
					divExists = true;
				}
			});
			if (!divExists) {
				const msg = document.createElement("div");
				msg.id = "invalid-msg-div";
				msg.innerHTML =
					'<div id="invalid-point-msg">Graph excludes measurement(s) with non-numerical values.</div>';
				chartDiv.appendChild(msg);
			}
		}
		const ymxb = regression.linear(series.data);
		const m = ymxb.equation[0];
		const b = ymxb.equation[1];
		const xs = [];
		series.data.forEach(function (d) {
			xs.push(d[0]);
		});

		const x0 = Math.min.apply(null, xs);
		let y0 = m * x0 + b;
		const xf = Math.max.apply(null, xs);
		let yf = m * xf + b;

		if (y0 < 0) {
			y0 = 0;
		}
		if (yf < 0) {
			yf = 0;
		}

		if (x0 !== xf || y0 !== yf) {
			chart.addSeries({
				type: "line",
				name: "Regression, " + series.name,
				data: [
					{ x: x0 * 10000000000, y: y0, name: y0 },
					{ x: xf * 10000000000, y: yf, name: y0 },
				],
			});
		}
	}

	public makeModalChart() {
		// replicates the data charts for the print modal
		this.showModal = true;
		const self = this;
		setTimeout(function () {
			self.createCharts(self.selectedChar, true);
			const table = document.getElementById("dataTable").cloneNode(true);
			const modalTable = document.getElementById("modalTable");
			modalTable.appendChild(table);
		}, 100);
	}

	public createStatChart(chart, name, property) {
		// creates pie charts based on type and organization of each site on the map
		while (chart.series && chart.series.length > 0) {
			chart.series[0].remove(true);
		}
		const propData = [];
		if (this.siteFilterData[property]) {
			this.siteFilterData[property].forEach((prop) => {
				const count = this.geojson.features.filter(function (feat) {
					return feat.properties[property] === prop;
				}).length;
				if (count > 0) {
					const perc = (count / this.geoJSONsiteCount) * 100;
					propData.push({
						name: prop,
						y: perc,
						sliced: true,
						selected: true,
					});
				}
			});
			chart.addSeries({ name: name, colorByPoint: true, data: propData });
		}
	}

	private handleError(err: HttpErrorResponse) {
		if (err.message) {
			// client side
			console.error("An error occurred:", err.message);
		} else if (err.error.error) {
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

	public addProps() {
		// adds locational properties and site filter properties to each line in the result query csv
		for (const result of this.resultJson) {
			const features = this._mapService.geoJson.features;
			const jsonIndex = features.findIndex((site) => {
				return (
					site.properties.name === result.MonitoringLocationIdentifier
				);
			});
			result.Latitude = features[jsonIndex].geometry.coordinates[1]; // add latitude
			result.Longitude = features[jsonIndex].geometry.coordinates[0]; // add longitude
			result.Datum = "WGS 84"; // add datum
			result.Huc8 = features[jsonIndex].properties.huc8; // add huc8
			result.LocName = features[jsonIndex].properties.locName; // add location name
			result.Type = features[jsonIndex].properties.type; // add site type
			result.SearchType = features[jsonIndex].properties.searchType; // add search type
		}
		this.resultCsv = this.jsonToCSV(this.resultJson); // recreates .csv with updated proprties
	}

	public csvJSON(csv) {
		// converts csv to json
		const lines = csv.split("\n");
		const result = [];
		const headers = lines[0].split(",");
		for (let i = 1; i < lines.length; i++) {
			const obj = {};
			const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
			for (let j = 0; j < headers.length; j++) {
				obj[headers[j]] = currentline[j].replace(/['"]+/g, "");
			}
			// only add pH field values (code 00400) to dataset
			obj["ResultMeasure/MeasureUnitCode"] = obj[
				"ResultMeasure/MeasureUnitCode"
			].replace(/\s*$/, "");
			if (
				obj["CharacteristicName"] !== "pH" ||
				obj["USGSPCode"] === "00400"
			) {
				result.push(obj);
			}
		}
		return result;
	}

	public jsonToCSV(json) {
		// converts json to csv
		let str = "";
		let line = "";
		Object.keys(json[0]).forEach(function (key) {
			if (line !== "") {
				line += ",";
			}
			line += key;
		});
		str += line + "\r\n";
		for (let i = 0; i < json.length; i++) {
			line = "";
			Object.keys(json[i]).forEach(function (key) {
				if (line !== "") {
					line += ",";
				}
				if (
					typeof json[i][key] === "string" &&
					json[i][key].indexOf(",") !== -1
				) {
					line += '"' + json[i][key] + '"';
				} else {
					line += json[i][key];
				}
			});
			str += line + "\r\n";
		}
		return str;
	}

	public downloadFile() {
		// downloads the csv from the result query
		let filename = "result.csv";
		if (this.selectedSites.length === 1) {
			filename = this.selectedSites[0] + ".csv";
		}
		const blob = new Blob([this.resultCsv], {
			type: "text/csv;charset=utf-8;",
		});
		if (navigator.msSaveBlob) {
			// IE 10+
			navigator.msSaveBlob(blob, filename);
		} else {
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			if (link.download !== undefined) {
				// feature detection
				// Browsers that support HTML5 download attribute
				link.setAttribute("href", url);
				link.setAttribute("download", filename);
				link.style.visibility = "hidden";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			} else {
				window.open(url);
			}
		}
	}

	public printReport() {
		window.print();
	}

	public setYaxisType(newType: string) {
		// add ability to switch from linear to logarithimic scale
		if (this.chartType === newType) {
			return;
		}
		this.chartType = newType;
		for (let i = 0; i < this.charts.length; i++) {
			if (newType === "logarithmic") {
				// this makes minor ticks and grid lines disappear..turn them off and uncheck boxes
				this.charts[i].yAxis[0].update({
					minorGridLineWidth: 0,
					minorTickWidth: 0,
				});
				this.charts[i].yAxis[0].update({ type: newType });
			} else {
				this.charts[i].yAxis[0].update({ tickInterval: null });
				this.charts[i].yAxis[0].update({ type: newType });
				// changing to logarithmic sometimes messes with regressions, so this re-adds them if changing back to linear
				for (const set of this.charts[i].series) {
					if (set.name.indexOf("Regression") > -1) {
						const data = [
							{
								x: set.data[0].x,
								y: set.data[0].y,
								name: set.data[0].name,
							},
							{
								x: set.data[1].x,
								y: set.data[1].y,
								name: set.data[1].name,
							},
						];
						const name = set.name;
						set.remove();
						this.charts[i].addSeries({
							data: data,
							type: "line",
							name: name,
						});
						this.charts[i].redraw();
					}
				}
			}
		}
	}
} // END class
