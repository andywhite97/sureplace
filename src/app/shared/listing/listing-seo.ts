type ListingImage = { image: string; caption: string; is_cover: boolean; sort_order: number };

/** Keep the designated cover first, with the first usable gallery photo as a fallback. */
export function listingSocialImage(images: ListingImage[]) {
  const usable = images.filter((image) => image.image?.trim());
  return (
    usable.find((image) => image.is_cover) ||
    [...usable].sort((a, b) => a.sort_order - b.sort_order)[0]
  );
}

export function listingDescription(text: string, limit = 180) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit - 3).trimEnd()}...` : clean;
}
