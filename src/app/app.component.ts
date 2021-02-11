import { Component, OnInit } from "@angular/core";
import packageJson from "package.json";
import { MapService } from "./shared/services/map.service";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
	title = "Lake Huron CSMI Planner";
	pack = packageJson;
	expandSidebar;
	aboutModal;
	toastType = "firstLoadWarning";
	userGuideModal;

	authenticated = false;
	authPassword = "";

	constructor(public mapService: MapService) {}

	ngOnInit() {
		this.mapService.ToasterSubject.subscribe((toastType) => {
			this.toastType = toastType;
		});
	}

	/* // Authentication before load
    authenticate() {
        if (this.authPassword && this.authPassword === 'LINAP1') {
            this.authenticated = true;
        } else {
            alert('Password Incorrect');
        }
    } */

	// in sidebar
}
