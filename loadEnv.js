import fs from "fs";

let envConfig = {};

try {
  if (fs.existsSync("env.json")) {
    envConfig = JSON.parse(fs.readFileSync("env.json", "utf8"));
    console.log("Loaded env variables from env.json");
  } else {
    console.log("env.json not found, using Render environment variables");
  }
} catch (error) {
  console.error("Error reading env.json:", error);
}

Object.keys(envConfig).forEach((key) => {
  process.env[key] = envConfig[key];
});