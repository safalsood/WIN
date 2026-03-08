import fs from "fs";

try {
  if (fs.existsSync("env.json")) {
    const env = JSON.parse(fs.readFileSync("env.json", "utf8"));
    Object.assign(process.env, env);
    console.log("Loaded environment variables from env.json");
  } else {
    console.log("env.json not found, using environment variables from Render");
  }
} catch (error) {
  console.error("Error loading env.json:", error);
}