import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Config } from "../interfaces/config";
import { map } from "rxjs/operators";

@Injectable()
export class ConfigService {
	private config: Config;
	private lookup;
	constructor(private _http: HttpClient) {}

	public load(url: string) {
		return new Promise<void>((resolve) => {
			this._http
				.get(url)
				.pipe(map((res) => res))
				.subscribe((config: any) => {
					this.config = config;
					resolve();
				});
		});
	}

	public getConfiguration(): Config {
		return this.config;
	}

	public loadLookups(url: string) {
		return new Promise<void>((resolve) => {
			this._http
				.get(url)
				.pipe(map((res) => res))
				.subscribe((lookup: any) => {
					this.lookup = lookup;
					resolve();
				});
		});
	}

	public getLookup() {
		return this.lookup;
	}
}
