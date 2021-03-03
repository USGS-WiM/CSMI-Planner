import { ComponentFactoryResolver, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, tap, catchError, mergeMap } from "rxjs/operators";
import { from, Observable, throwError } from "rxjs";
import { ConfigService } from "./config.service";
import { MapService } from "../services/map.service";
import { Config } from "../interfaces/config";

@Injectable({
	providedIn: "root",
})
export class SiglService {
	private HuronProjectsUrl =
		"https://sigl.wim.usgs.gov/SiGLServices/lakes/2/projects.json";

	private projectSiteUrl = "https://sigl.wim.usgs.gov/SiGLServices/projects/";

	private fullSiteUrl = "https://sigl.wim.usgs.gov/SiGLServices/sites/";

	public siglSitesURL;
	private configSettings: Config;
	public siglgeoJson: any;
	public selectedSite: any;

	//TODO add project interface
	public projects = [];

	//get all projects in Huron as Observable
	public getProjects(): Observable<any> {
		return this.http.get<any>(`${this.HuronProjectsUrl}`).pipe(
			/* tap((projectList: any) => {
				console.log("Huron Projects", projectList);
			}), */
			map((projectList) => {
				projectList.map((project) => {
					this.projects.push(project);
				});
			}),
			catchError(this.handleError)
		);
	}

	//Get ALL sigl sites (filter for Huron in map function)
	public getSiglSites(): Observable<any> {
		return this.http.get<any>(this.siglSitesURL).pipe(
			//tap((response) => console.log("Total # sigl sites : ", response.features.length)),
			map((response) => {
				//get all sites then filter for Lake Huron ONLY
				//filter for Lake Huron
				let filteredFeatures = response.features.filter((feat) => {
					if (feat.properties.lake_type_id == 2) {
						return feat;
					}
				});

				//set features to Lake Huron ONLY
				response.features = filteredFeatures;
				//console.log("Lake Huron filtered sites:", response);
				this.siglgeoJson = response;
				this._mapService.addToSiglLayer(this.siglgeoJson);
			}),
			/* map((response) => {
				//get and use ALL SIGL SITES
				this.siglgeoJson = response;
				console.log(this.siglgeoJson.features.length);
				this._mapService.addToSiglLayer(this.siglgeoJson);
			}), */
			catchError((error) => this.handleError(error))
		);
	}

	public getFullSite(siteId): Observable<any> {
		return this.http
			.get<any>(`${this.fullSiteUrl}/${siteId}/GetFullSite.json`)
			.pipe(
				map((response) => (this.selectedSite = response)),
				catchError((error) => this.handleError(error))
			);
	}

	constructor(
		private http: HttpClient,
		private _configService: ConfigService,
		private _mapService: MapService
	) {
		this.configSettings = this._configService.getConfiguration();
		this.siglSitesURL = this.configSettings.siglSitesURL;
	}

	private handleError(err: any): Observable<never> {
		let errorMessage: string;
		if (err.error instanceof ErrorEvent) {
			// A client-side or network error occurred. Handle it accordingly.
			errorMessage = `An error occurred: ${err.error.message}`;
		} else {
			// The backend returned an unsuccessful response code.
			errorMessage = `Backend returned code ${err.status}: ${err.body.error}`;
		}
		console.error(err);
		return throwError(errorMessage);
	}
}
