#!/bin/bash

# Set the source directory and backup directory
SOURCE_DIR="./db"
BACKUP_DIR="./backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create the backup with the timestamp
zip -r "$BACKUP_DIR/backup_$TIMESTAMP.zip" "$SOURCE_DIR"

# Take a sha256sum of the backup and rename the file
SHA=$(sha256sum "$BACKUP_DIR/backup_$TIMESTAMP.zip" | awk '{print $1}')

# Add the first 8 characters of the sha256sum to the end of the file
SHA_8=$(echo "$SHA" | cut -c1-8)
mv "$BACKUP_DIR/backup_$TIMESTAMP.zip" "$BACKUP_DIR/backup_${TIMESTAMP}_${SHA_8}.zip"

# Check if any other files have the same sha256sum and delete them
find "$BACKUP_DIR" -type f -name "backup_*_${SHA_8}.zip" -not -name "backup_${TIMESTAMP}_${SHA_8}.zip" -delete

echo "Backup created: $BACKUP_DIR/backup_${TIMESTAMP}_${SHA_8}.zip"
