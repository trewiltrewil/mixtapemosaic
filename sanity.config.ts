import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./src/sanity/schemaTypes";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "mixtapemosaic";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";

export default defineConfig({
  name: "mixtape-mosaic",
  title: "Mixtape Mosaic",
  projectId,
  dataset,
  basePath: "/studio",
  schema: {
    types: schemaTypes
  },
  plugins: [structureTool(), visionTool()]
});
