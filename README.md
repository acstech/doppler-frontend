# Doppler-Heatmap Frontened
The frontend of the Doppler-Heatmap application. This repository contains all the front-end assets necessary to receive and display data points from the backend connection and display location data for live events.
## Setup

- [Make sure that the frontend API is set up](https://github.com/acstech/doppler-api#setup)

## Testing

Run `docker build . -t acstintern/doppler-frontend:latest` if either the index file or the asset files have been changed.

Then go to doppler-events/ and `run docker-compose up -d`

To receive messages and send over a web-socket connection, doppler-events and doppler-frontend must be running.

## Contributors

* [Ben Wornom](https://github.com/bwornom7)
* [Leander Stevano](https://github.com/deepmicrobe)
* [Matt Smith](https://github.com/mattsmith803)
* [Matt Harrington](https://github.com/Matt2Harrington)
* [Pranav Minasandram](https://github.com/PranavMin)
* [Peter Kaufman](https://github.com/pjkaufman)
