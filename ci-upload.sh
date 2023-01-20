#!/bin/sh
HOST="myfiles.fastmail.com"
WEBDAVURL="https://$HOST/$RCD"
LCD="www"

set -e  # quit if any command errors
set -x  # echo commands

if [ ! "$RCD" ]
then
    echo "Error! RCD unspecified!"
    exit 1
fi

REMOTE=fm-public
rclone config create "$REMOTE" webdav url "$WEBDAVURL" vendor other user "$USER"
rclone config password "$REMOTE" pass "$PASS"
rclone --verbose sync --refresh-times --exclude '.*' "$LCD" "$REMOTE":

echo "Site successfully uploaded."
