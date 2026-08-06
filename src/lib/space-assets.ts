/**
 * Space scene artwork, hosted on Cloudinary.
 *
 * Centralised so a re-upload means changing one line rather than hunting
 * through components. Intrinsic dimensions are recorded because next/image
 * needs them to reserve space — without them the page reflows as each asset
 * arrives, which is exactly the layout shift a parallax scene most notices.
 */

const CLOUDINARY = 'https://res.cloudinary.com/doatpmjdp';

export interface SpaceImage {
  src: string;
  width: number;
  height: number;
  /** Empty when the image is purely decorative. */
  alt: string;
}

export const SPACE_IMAGES = {
  astronaut: {
    src: `${CLOUDINARY}/image/upload/v1786048437/new_astro_mnpwnc.avif`,
    width: 520,
    height: 856,
    alt: 'Astronaut drifting in space',
  },
  cloudBanner: {
    src: `${CLOUDINARY}/image/upload/v1786048437/cloud_1_tpitfu.avif`,
    width: 1236,
    height: 594,
    alt: '',
  },
  cloudWhite: {
    src: `${CLOUDINARY}/image/upload/v1786048437/white_cloud_dldyh6.avif`,
    width: 910,
    height: 594,
    alt: '',
  },
  cloudTwo: {
    src: `${CLOUDINARY}/image/upload/v1786048437/cloud_2_kfefuq.avif`,
    width: 1076,
    height: 848,
    alt: '',
  },
} as const satisfies Record<string, SpaceImage>;

/**
 * Lightspeed background clips.
 *
 * Deliberately not auto-played on mount: a background video is the single
 * heaviest thing on a page, and most visitors scroll past. Components gate
 * playback on visibility and skip it entirely under prefers-reduced-motion,
 * where a rushing starfield is exactly the kind of motion that causes trouble.
 */
export const SPACE_VIDEOS = {
  lightspeed: `${CLOUDINARY}/video/upload/v1786048620/Lightspeed-stars_numegq.mp4`,
  lightspeedBig: `${CLOUDINARY}/video/upload/v1786048705/Lightspeed-stars-big_wyqvts.mp4`,
  lightspeedSpinning: `${CLOUDINARY}/video/upload/v1786048749/Lightspeed-stars-spinning_kb5ksz.mp4`,
} as const;

export type SpaceVideoKey = keyof typeof SPACE_VIDEOS;
