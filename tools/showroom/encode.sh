#!/bin/sh
# Encode the rendered film frames (media-src/frames) into the web renditions in public/media.
# Limited-range output on purpose: full-range VP9 failed to decode in Chrome.
set -e
FF=${FF:-ffmpeg}
F=media-src/frames
M=media-src/masters
O=public/media
mkdir -p "$M" "$O"
enc() { # <frames dir> <name> <w> <h> <webm crf> <mp4 crf>
  vf="scale=$3:$4:flags=lanczos:out_range=tv,format=yuv420p"
  "$FF" -loglevel error -y -framerate 30 -i "$1/f%05d.jpg" -vf "$vf" -c:v libvpx-vp9 -b:v 0 -crf "$5" -row-mt 1 -deadline good -cpu-used 2 -g 60 -color_range tv -an "$O/$2.webm"
  "$FF" -loglevel error -y -framerate 30 -i "$1/f%05d.jpg" -vf "$vf" -c:v libx264 -preset slow -crf "$6" -profile:v high -g 60 -color_range tv -movflags +faststart -an "$O/$2.mp4"
}
# masters (kept out of git)
"$FF" -loglevel error -y -framerate 30 -i "$F/fg1080/f%05d.jpg" -vf "format=yuv420p" -c:v libx264 -crf 14 -preset slow "$M/showroom-film-1080p-master.mp4"
"$FF" -loglevel error -y -framerate 30 -i "$F/bg1080/f%05d.jpg" -vf "format=yuv420p" -c:v libx264 -crf 14 -preset slow "$M/showroom-loop-1080p-master.mp4"
"$FF" -loglevel error -y -framerate 30 -i "$F/bgp/f%05d.jpg" -vf "format=yuv420p" -c:v libx264 -crf 14 -preset slow "$M/showroom-loop-portrait-master.mp4"
# web: 1080p for large screens, 720p for the rest, portrait loop for phones
enc "$F/bg1080" showroom-loop-1080 1920 1080 33 23
enc "$F/bg1080" showroom-loop 1280 720 33 23
enc "$F/bgp" showroom-loop-portrait 720 1280 34 24
enc "$F/fg1080" showroom-film-1080 1920 1080 31 22
enc "$F/fg1080" showroom-film 1280 720 32 23
# posters: loop first frame, film opening frame
"$FF" -loglevel error -y -i "$F/bg1080/f00000.jpg" -vf "scale=1920:1080" -q:v 3 "$O/showroom-loop-poster.jpg"
"$FF" -loglevel error -y -i "$F/bg1080/f00000.jpg" -vf "scale=1920:1080" -c:v libwebp -q:v 86 "$O/showroom-loop-poster.webp"
"$FF" -loglevel error -y -i "$F/bgp/f00000.jpg" -vf "scale=720:1280" -q:v 3 "$O/showroom-loop-poster-portrait.jpg"
"$FF" -loglevel error -y -i "$F/bgp/f00000.jpg" -vf "scale=720:1280" -c:v libwebp -q:v 86 "$O/showroom-loop-poster-portrait.webp"
"$FF" -loglevel error -y -i "$F/fg1080/f00045.jpg" -vf "scale=1920:1080" -q:v 3 "$O/showroom-film-poster.jpg"
"$FF" -loglevel error -y -i "$F/fg1080/f00045.jpg" -vf "scale=1920:1080" -c:v libwebp -q:v 86 "$O/showroom-film-poster.webp"
ls -la "$O"
