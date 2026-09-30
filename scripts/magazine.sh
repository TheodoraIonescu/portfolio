#!/usr/bin/env bash
# Turns a PDF magazine into page images for the flip book on project pages.
#
#   scripts/magazine.sh documents/vintigue_split.pdf images/magazines/vintigue [width]
#
# Writes 01.webp, 02.webp, ... (one per PDF page), small NN-thumb.webp previews and a
# manifest.json with the page count and size. Point "magazine:" in a project file at
# the output folder. Needs pdftoppm (poppler-utils) and ImageMagick.
set -euo pipefail

if [ $# -lt 2 ]; then
    echo "usage: $0 <file.pdf> <output-folder> [page-width-px]" >&2
    exit 1
fi

pdf=$1
out=$2
width=${3:-1100}
convert=$(command -v magick || command -v convert)

mkdir -p "$out"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

pdftoppm -png -scale-to-x "$width" -scale-to-y -1 "$pdf" "$tmp/page"

n=0
for f in $(ls "$tmp"/page-*.png | sort -V); do
    n=$((n + 1))
    name=$(printf '%02d' "$n")
    "$convert" "$f" -strip -quality 80 "$out/$name.webp"
    "$convert" "$f" -strip -resize 240x -quality 70 "$out/$name-thumb.webp"
done

read -r w h < <(identify -format '%w %h\n' "$out/01.webp")
printf '{ "pages": %d, "width": %d, "height": %d }\n' "$n" "$w" "$h" > "$out/manifest.json"
echo "$n pages written to $out"
