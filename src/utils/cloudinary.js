import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const uploadCloudinary = async (localFilePath) => {

    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        
        fs.unlinkSync(localFilePath);
        
        return response;

    } catch (error) {

        console.error("Error uploading file to Cloudinary:", error.message);
        fs.unlinkSync(localFilePath);

        return null;
    }

}

export { uploadCloudinary };