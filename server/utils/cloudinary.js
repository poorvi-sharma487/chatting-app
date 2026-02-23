const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (fileBuffer, folder = 'snapnova') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'auto' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(fileBuffer);
    });
};

const uploadBase64ToCloudinary = async (base64String, folder = 'snapnova') => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder,
            resource_type: 'auto',
        });
        return result;
    } catch (error) {
        throw error;
    }
};

module.exports = { cloudinary, uploadToCloudinary, uploadBase64ToCloudinary };
