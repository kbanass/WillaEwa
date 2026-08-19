import { createClient } from "@sanity/client";
import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";
import { defineQuery } from "groq";

export const sanityClient = createClient({
  projectId: "csed1mdo",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: import.meta.env.PROD,
});

const builder = createImageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// ── GROQ queries ──────────────────────────────────────────────────────────────

export const heroImagesQuery = defineQuery(`
  *[_type == "heroImages"][0]{
    images[]{
      _key,
      alt,
      image,
      "lqip": image.asset->metadata.lqip,
      "width": image.asset->metadata.dimensions.width,
      "height": image.asset->metadata.dimensions.height,
    }
  }
`);

export const galleryQuery = defineQuery(`
  *[_type == "gallery"][0]{
    images[]{
      _key,
      image,
      alt,
      caption,
      captionUrl,
      "lqip": image.asset->metadata.lqip,
      "width": image.asset->metadata.dimensions.width,
      "height": image.asset->metadata.dimensions.height,
    }
  }
`);

export const roomsSliderQuery = defineQuery(`
  *[_type == "roomsSlider"][0]{
    images[]{
      _key,
      image,
      alt,
      "lqip": image.asset->metadata.lqip,
      "width": image.asset->metadata.dimensions.width,
      "height": image.asset->metadata.dimensions.height,
    }
  }
`);

export const articlesQuery = defineQuery(`
  *[_type == "article"] | order(publishedAt desc){
    _id,
    title,
    slug,
    coverImage,
    excerpt,
    publishedAt,
  }
`);

export const articleBySlugQuery = defineQuery(`
  *[_type == "article" && slug.current == $slug][0]{
    _id,
    title,
    slug,
    coverImage,
    excerpt,
    publishedAt,
    body,
  }
`);

export const siteSettingsQuery = defineQuery(`
  *[_type == "siteSettings"][0]
`);

export const importantInfoQuery = defineQuery(`
  *[_type == "importantInfo"][0]{
    items[]{
      _key,
      icon,
      label,
      value,
    }
  }
`);

export const publicReviewsQuery = defineQuery(`
  {
    "reviews": *[_type == "review" && status == "accepted"] | order(time desc) {
      "id": _id,
      author,
      quote,
      rating,
      source,
      time,
      reply,
      replyTime,
    }
  }
`);

// ── Wrapper functions ─────────────────────────────────────────────────────────

export async function getGallery() {
  return sanityClient.fetch(galleryQuery);
}

export async function getRoomsSlider() {
  return sanityClient.fetch(roomsSliderQuery);
}

export async function getArticles() {
  return sanityClient.fetch(articlesQuery);
}

export async function getArticleBySlug(slug: string) {
  return sanityClient.fetch(articleBySlugQuery, { slug });
}

export async function getSiteSettings() {
  return sanityClient.fetch(siteSettingsQuery);
}

export async function getImportantInfo() {
  return sanityClient.fetch(importantInfoQuery);
}
