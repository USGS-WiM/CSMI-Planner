![WiM](wimlogo.png)

# CSMI-Planner

This project merges [SIGL](https://sigl.wim.usgs.gov/siglservices) and [Water Quality Portal](https://www.waterqualitydata.us/) data to create a Cooperative Science and Monitoring Initiative CSMI planning tool. Current development is focused on the Lake Huron basin in preparation for the 2022 field year.

Initial code forked from: [LIQWIDS](https://github.com/USGS-WiM/LIQWIDS)

### Prerequisites

This project has dependencies that require Angular CLI, Node 6.9.0 or higher, and NPM 3 or higher. NPM is downloaded with Node.js here: https://nodejs.org/en/.

Once npm is installed, install the Angular CLI:

```
npm install -g @angular/cli
```

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Installing

Clone the repo and install it with npm

```
git clone https://github.com/USGS-WiM/CSMI-Planner.git
cd /CSMI-Planner
npm install
```

## Building and testing

Run live server with

```
npm run start
```

To build a production version of the app:

```
ng build --prod --base-href
```

## Deployment

GitHub Actions are in place to auto-deploy a production version of the app to our test sites.

Pushes to the `staging` branch trigger an action to build and deploy to our test site.

Pushes to the `master` branch trigger an action to build and deploy to our demo site.

## Built With

-   [Angular](https://angular.io/) - The main web framework used
-   [NPM](https://www.npmjs.com/) - Dependency Management

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on the process for submitting pull requests to us. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details on adhering by the [USGS Code of Scientific Conduct](https://www2.usgs.gov/fsp/fsp_code_of_scientific_conduct.asp).

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](../../tags).

If you want to update the version numbers in the package.json and code.json:

`npm run patch` or

`npm run minor` or

`npm run major`

To reset version in those files:

`bump {version number} package.json code.json`

Advance the version when adding features, fixing bugs or making minor enhancements. Follow semver principles. To add tag in git, type `git tag v{major}.{minor}.{patch}`. Example: `git tag v2.0.5`

To push tags to remote origin: `git push origin --tags`

\*Note that your alias for the remote origin may differ.

## Authors

-   **[Erik Myers](https://www.usgs.gov/staff-profiles/erik-s-myers)** - _Developer_ - [USGS Web Informatics & Mapping](https://wim.usgs.gov/)

This project was forked from [LIQWIDS](https://github.com/USGS-WiM/LIQWIDS) primarily developed by:

-   **[Martyn Smith](https://www.usgs.gov/staff-profiles/martyn-smith)** - _Developer_ - [USGS Web Informatics & Mapping](https://wim.usgs.gov/)
-   **[Katrin Jacobsen](https://www.usgs.gov/staff-profiles/katrin-jacobsen)** - _Developer_ - [USGS Web Informatics & Mapping](https://wim.usgs.gov/)

See also the list of [contributors](../../graphs/contributors) who participated in this project.

## License

This project is licensed under the Creative Commons CC0 1.0 Universal License - see the [LICENSE.md](LICENSE.md) file for details

## Suggested Citation

In the spirit of open source, please cite any re-use of the source code stored in this repository. Below is the suggested citation:

`This project contains code produced by the Web Informatics and Mapping (WIM) team at the United States Geological Survey (USGS). As a work of the United States Government, this project is in the public domain within the United States. https://wim.usgs.gov`

## About WIM

-   This project is authored by the [USGS WIM team](https://wim.usgs.gov)
-   WIM is a team of developers and technologists who build and manage tools, software, web services, and databases to support USGS science and other federal government cooperators.
-   WIM is a part of the [Upper Midwest Water Science Center](https://www.usgs.gov/centers/wisconsin-water-science-center).
