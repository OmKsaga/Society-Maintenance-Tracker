import logging
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_image(file: UploadFile) -> None:
    """Validate image type and size. Raises HTTPException on failure."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF.",
        )


async def upload_image(file: UploadFile) -> Tuple[str, str]:
    """
    Upload image to Cloudinary.
    Returns (url, public_id).
    Raises HTTPException if Cloudinary is not configured or upload fails.
    """
    if not settings.cloudinary_configured:
        raise HTTPException(
            status_code=503,
            detail="Image storage is not configured. Contact the administrator.",
        )

    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 5 MB.",
            )

        result = cloudinary.uploader.upload(
            contents,
            folder="society-maintenance/complaints",
            resource_type="image",
        )

        url: str = result.get("secure_url", "")
        public_id: str = result.get("public_id", "")

        if not url:
            raise HTTPException(status_code=500, detail="Image upload failed: no URL returned.")

        logger.info(f"[CLOUDINARY] Uploaded image: {public_id}")
        return url, public_id

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CLOUDINARY] Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


def delete_image(public_id: str) -> None:
    """Delete image from Cloudinary (best-effort, errors are logged)."""
    if not settings.cloudinary_configured or not public_id:
        return
    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
        )
        cloudinary.uploader.destroy(public_id)
        logger.info(f"[CLOUDINARY] Deleted image: {public_id}")
    except Exception as e:
        logger.error(f"[CLOUDINARY] Delete failed for {public_id}: {e}")
