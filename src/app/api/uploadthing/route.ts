import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export routes for Next App Router
console.log("UploadThing Route Handler Loaded");
console.log("Token present:", !!process.env.UPLOADTHING_TOKEN);
if (process.env.UPLOADTHING_TOKEN) {
    console.log("Token start:", process.env.UPLOADTHING_TOKEN.substring(0, 10) + "...");
} else {
    console.error("UPLOADTHING_TOKEN is MISSING in route.ts");
}

export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
    // Apply an (optional) custom config:
    // config: { ... },
    config: {
        isDev: true,
        logLevel: "Debug",
    },
});
