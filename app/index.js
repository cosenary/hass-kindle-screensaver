import Hapi from "@hapi/hapi";
import Vision from "@hapi/vision";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import sharp from "sharp";
import fetch from "node-fetch";
import config from "./config.js";

const fetchDataFromApi = async () => {
  const url = `https://dbf.finalrewind.org/${encodeURIComponent(config.departureStation)}.json?version=3&limit=${config.departureConnectionLimit}&hafas=DB&via=${encodeURIComponent(config.departureDestinationStations)}`;
  console.log(url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(response);
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
};

const takeScreenshot = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    timeout: 10000,
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: config.renderingScreenSize.width,
    height: config.renderingScreenSize.height,
    deviceScaleFactor: 2
  });

  await page.goto(`http://localhost:${config.port}`);

  const screenshot = await page.screenshot({
    optimizeForSpeed: true,
    fullPage: true,
  });

  await browser.close();

  // Use Sharp to grayscale the image
  return await sharp(screenshot)
    .grayscale()
    .removeAlpha()
    .toBuffer();
};

const init = async () => {
  const server = Hapi.server({
    port: config.port,
  });

  // Register the vision plugin for templating
  await server.register(Vision);

  // Set up Handlebars as the templating engine
  server.views({
    engines: {
      hbs: Handlebars,
    },
    path: "views",
  });

  // Register custom Handlebars helpers
  Handlebars.registerHelper("formatDate", (unixTimestamp) => {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleTimeString("de-DE", {
      hour: "numeric",
      minute: "numeric",
      timeZone: "Europe/Berlin"
    });
  });

  Handlebars.registerHelper("isCancelled", (isCancelled) => {
    return (isCancelled) ? "text-decoration-line-through" : "";
  });

  Handlebars.registerHelper("remainingTime", (scheduledTimeUnix) => {
    // Get the current time in milliseconds (Unix time)
    const currentTime = Date.now();

    // Convert the provided Unix timestamp to milliseconds if it's in seconds
    const timestampInMillis = scheduledTimeUnix * 1000;

    // Calculate the difference in milliseconds
    const timeDifference = timestampInMillis - currentTime;

    // Convert the difference from milliseconds to minutes
    return Math.floor(timeDifference / (1000 * 60));
  });

  Handlebars.registerHelper('transportTypeClass', (str) => {
    const prefixToClassMap = {
        'S': 'rounded-pill text-bg-success',
        'RB': 'text-bg-secondary',
        'Bus': 'sharp-pill text-bg-primary'
    };

    for (const prefix in prefixToClassMap) {
        if (str.startsWith(prefix)) {
            return prefixToClassMap[prefix];
        }
    }

    return 'text-bg-secondary';
  });

  server.route({
    method: "GET",
    path: "/",
    handler: async (request, h) => {
      try {
        const apiData = await fetchDataFromApi();
        if (!apiData) {
          return h.response("Failed to fetch data").code(500);
        }

        console.log(config.departureDestinationCategories)
        const pairs = config.departureDestinationCategories.split(',');
        const mappings = new Map(pairs.map(pair => pair.split('=')));
        console.log(mappings)

        // acc = accumulate
        const departuresByDestination = apiData.departures.reduce((acc, obj) => {
                const currentTime = Date.now();
                const timestampInMillis = obj.scheduledTime * 1000;
                const timeDifference = timestampInMillis - currentTime;
                const remainingMinutes = Math.floor(timeDifference / (1000 * 60));

                let key = obj['train'];
                // If the key doesn't exist in the accumulator, create an empty array for it
                key = mappings[key];

                if (!key) {
                  key = 'default';
                  console.log(`Unknown train [${obj['train']}]`)
                  //return acc;
                }

                if (!acc[key]) {
                    acc[key] = [];
                }

                // Push the current object into the correct group
                if (remainingMinutes >= 6) {
                    acc[key].push(obj);
                }

                return acc;
            }, {}); // Start with an empty object as the accumulator

        // Render the template with data fetched from the API
        return h.view("departures", departuresByDestination);
      } catch (error) {
        console.error("Error handling request:", error);
        return h.response("Internal Server Error").code(500);
      }
    },
  });

  // Define the route
  server.route({
    method: "GET",
    path: "/screenshot",
    handler: async (request, h) => {
      try {
        const grayscaleImage = await takeScreenshot();
        return h.response(grayscaleImage)
          .type("image/png")
          .header("Content-Disposition", 'inline; filename="timetable.png"');
      } catch (error) {
        console.error(error);
        return h.response("Failed to take screenshot").code(500);
      }
    },
  });

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

// Handle unhandled rejections gracefully
process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
