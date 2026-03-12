# ML Model Image Access Guide

This directory contains all uploaded images organized for easy ML model training and inference.

## Directory Structure

```
server/data/
├── uploads.json          # Metadata for all uploads
└── uploads/              # Image files organized by upload batch
    ├── upload-1234567890-abc123/
    │   ├── image1-1234567890-xyz.jpg
    │   └── image2-1234567890-xyz.jpg
    └── upload-1234567891-def456/
        └── image1-1234567891-xyz.jpg
```

## Accessing Images for ML Models

### Option 1: Use the API Endpoints

#### Get All Images with Metadata
```bash
GET /api/ml/images
```

Returns:
```json
{
  "images": [
    {
      "uploadId": "upload-1234567890-abc123",
      "fileId": "file-1234567890-0",
      "absolutePath": "/path/to/server/data/uploads/upload-1234567890-abc123/image1.jpg",
      "relativePath": "uploads/upload-1234567890-abc123/image1.jpg",
      "metadata": {
        "constructionType": "residential",
        "siteLocation": "123 Main St",
        "supervisorName": "John Doe",
        "uploadDate": "2025-11-06",
        "notes": "Site inspection",
        "createdAt": "2025-11-06T16:56:05.734Z"
      }
    }
  ],
  "total": 1
}
```

#### Get Images by Upload ID
```bash
GET /api/ml/images/:uploadId
```

### Option 2: Direct File System Access

All images are stored with absolute paths in `uploads.json`. You can:

1. **Read the JSON file** to get all image paths:
```python
import json

with open('server/data/uploads.json', 'r') as f:
    uploads = json.load(f)

# Extract all image paths
for upload in uploads:
    for file in upload['files']:
        image_path = file['absolutePath']
        metadata = {
            'constructionType': upload['constructionType'],
            'siteLocation': upload['siteLocation'],
            # ... other metadata
        }
        # Use image_path with your ML model
```

2. **Use the absolute paths directly** - they're stored in the JSON for easy access

### Option 3: Python Script Example

```python
import json
import os
from PIL import Image

# Load uploads data
with open('server/data/uploads.json', 'r') as f:
    uploads = json.load(f)

# Process all images
for upload in uploads:
    construction_type = upload['constructionType']  # Can be used as label
    for file in upload['files']:
        image_path = file['absolutePath']
        
        # Verify file exists
        if os.path.exists(image_path):
            # Load image for ML model
            image = Image.open(image_path)
            
            # Use with your ML model
            # predictions = model.predict(image)
            
            print(f"Processing: {image_path}")
            print(f"Label: {construction_type}")
```

## Metadata Available

Each image has associated metadata that can be used for:
- **Labeling**: `constructionType` (residential, commercial, bridge, roadwork, industrial)
- **Location tracking**: `siteLocation`
- **Date filtering**: `uploadDate`, `createdAt`
- **Additional context**: `notes`, `supervisorName`

## Image Organization

- Images are organized by upload batch (each form submission creates a new batch)
- Each batch has a unique upload ID
- Original filenames are preserved (sanitized) with unique suffixes
- All images are stored as files (not base64) for efficient ML processing

## Notes

- Images are stored in standard formats (JPG, PNG, etc.)
- File paths are absolute for easy access from any script
- The `constructionType` field can be used as a label for supervised learning
- All metadata is preserved for filtering and organizing training data

