const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  outputPath: process.env.OUTPUT_PATH | "output/cover",
  renderingScreenSize: {
    height: parseInt(process.env.RENDERING_SCREEN_HEIGHT, 10) || 800,
    width: parseInt(process.env.RENDERING_SCREEN_WIDTH, 10) || 600
  },
  departureStation: process.env.DEPARTURE_STATION,
  departureDestinationStations: process.env.DEPARTURE_DESTINATION_STATIONS,
  departureDestinationCategories: process.env.DEPARTURE_DESTINATION_CATEGORIES,
  departureConnectionLimit: process.env.DEPARTURE_CONNECTION_LIMIT || 12,
};

export default config;
