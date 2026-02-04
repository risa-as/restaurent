import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing({
    errorFormatter: (err) => {
        console.error("UploadThing Error Stack:", err.stack);
        console.error("UploadThing Error Cause:", err.cause);
        return { message: err.message };
    },
});

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
        // Set permissions and file types for this FileRoute
        .middleware(async () => {
            // This code runs on your server before upload
            // const user = await auth(req);
            // If you throw, the user will not be able to upload
            // if (!user) throw new Error("Unauthorized");
            // Whatever is returned here is accessible in onUploadComplete as `metadata`
            return { userId: "admin" };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // This code RUNS ON YOUR SERVER after upload
            console.log("Upload complete for userId:", metadata.userId);
            console.log("file url", file.url);
            // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
            return { uploadedBy: metadata.userId };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
