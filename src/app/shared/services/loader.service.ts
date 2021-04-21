import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { fromEventPattern } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class LoaderService {
	private _loaderSubject = new Subject<boolean>();
	public loaderState = this._loaderSubject.asObservable();

	private _dataloaderSubject = new Subject<boolean>();
	public dataloaderState = this._dataloaderSubject.asObservable();

	constructor() {}

	public showFullPageLoad() {
		this._loaderSubject.next(true);
	}
	public hideFullPageLoad() {
		this._loaderSubject.next(false);
	}

	public showDataLoad() {
		this._dataloaderSubject.next(true);
	}

	public hideDataLoad() {
		this._dataloaderSubject.next(false);
	}
}
