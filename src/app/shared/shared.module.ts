import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { fromEventPattern } from "rxjs";
import { TabsComponent } from "./components/tabs/tabs.component";
import { TabComponent } from "./components/tab/tab.component";
import { LoaderComponent } from "./components/loader/loader.component";
import { MapService } from "./services/map.service";
import { LoaderService } from "./services/loader.service";
import { SummaryComponent } from "./components/summary/summary.component";
import { SummariesService } from "./services/summaries.service";
import { SiglService } from "./services/sigl.service";
import { DataLoaderComponent } from "./components/loader/dataloader.component";

// Temporarily use NG Material
import { MatInputModule } from "@angular/material";
import { MatTableModule } from "@angular/material/table";
import { MatSortModule } from "@angular/material";
import { MatFormFieldModule } from "@angular/material";
import { MatExpansionModule } from "@angular/material/expansion";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { CustomQueryEncoderHelper } from "./services/customEncoder";

@NgModule({
	declarations: [
		TabsComponent,
		TabComponent,
		LoaderComponent,
		SummaryComponent,
		DataLoaderComponent,
	],
	imports: [
		CommonModule,
		MatInputModule,
		MatTableModule,
		MatSortModule,
		MatFormFieldModule,
		MatExpansionModule,
		BrowserAnimationsModule,
	],
	exports: [
		TabsComponent,
		TabComponent,
		LoaderComponent,
		SummaryComponent,
		DataLoaderComponent,
	],
	providers: [
		MapService,
		LoaderService,
		SummariesService,
		SiglService,
		CustomQueryEncoderHelper,
	],
})
export class SharedModule {}
