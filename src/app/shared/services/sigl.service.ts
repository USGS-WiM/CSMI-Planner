import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, tap, catchError } from "rxjs/operators";
import { Observable, throwError } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class SiglService {
	private HuronProjectsUrl =
		"https://sigl.wim.usgs.gov/SiGLServices/lakes/2/projects.json";

	//TODO add project interface
	public projects = [];

	projects$ = this.http.get<any>(`${this.HuronProjectsUrl}`).pipe(
		tap((projects: any) => {
			console.log("Huron Projects", projects);
		}),
		map((project) => {
			project.forEach((project) => {
				//console.log(project.project_id);
				this.projects.push(project);
				/* let projId = project.project_id;
			this.http
			  .get<any>(`${this.projectSiteUrl}/${projId}/ProjectFullSites.json`)
			  .pipe(
				tap((sites) => console.log('Sites ', JSON.stringify(sites))),
				catchError(this.handleError)
			  ); */
			});
			console.log("this.projects: ", this.projects);
		}),
		catchError(this.handleError)
	);

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
