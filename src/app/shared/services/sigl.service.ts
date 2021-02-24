import { ComponentFactoryResolver, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, tap, catchError, mergeMap } from "rxjs/operators";
import { from, Observable, throwError } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class SiglService {
	private HuronProjectsUrl =
		"https://sigl.wim.usgs.gov/SiGLServices/lakes/2/projects.json";

	private projectSiteUrl = "https://sigl.wim.usgs.gov/SiGLServices/projects/";

	//TODO add project interface
	public projects = [];

	projects$ = this.http.get<any>(`${this.HuronProjectsUrl}`).pipe(
		tap((projectList: any) => {
			console.log("Huron Projects", projectList);
		}),
		map((projectList) => {
			projectList.map((project) => {
				this.projects.push(project);
			});
		}),
		catchError(this.handleError)
	);

	/* public getSiglSites(): Observable<any> {
		return this.http.get<any>(this.siglSitesURL).pipe(
			tap((response) => console.log(response)),
			map((response) => {
				this.siglgeoJjson = response;
				this.addToSitesLayer(this.siglgeoJjson);
			}),
			catchError((error) => this.handleError(error))
		);
	} */

	constructor(private http: HttpClient) {}

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
