import { Router, type IRouter } from "express";
import { ListHookStepsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const hookSteps = [
  {
    id: "macarena",
    name: "Macarena arms",
    song: "Macarena",
    artist: "Los del Río",
    movieOrAlbum: "A mí me gusta",
    tags: ["arms", "party", "classic"],
    description: "A repeatable upper-body sequence with palms, shoulders, and a turn.",
    popularity: 98,
    sampleThumbnail: "https://i.ytimg.com/vi/2z0JqA7JcQ8/hqdefault.jpg",
  },
  {
    id: "gangnam-style",
    name: "Horse-riding bounce",
    song: "Gangnam Style",
    artist: "PSY",
    movieOrAlbum: "PSY 6 (Six Rules), Pt. 1",
    tags: ["bounce", "cross-step", "viral"],
    description: "A springy cross-step and wrist-led riding motion with a strong downbeat.",
    popularity: 99,
    sampleThumbnail: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
  },
  {
    id: "single-ladies",
    name: "Single Ladies finger point",
    song: "Single Ladies (Put a Ring on It)",
    artist: "Beyoncé",
    movieOrAlbum: "I Am... Sasha Fierce",
    tags: ["arms", "point", "pop"],
    description: "Sharp arm hits, a finger point, and a side-to-side groove.",
    popularity: 97,
    sampleThumbnail: "https://i.ytimg.com/vi/4m1EFMoRFvY/hqdefault.jpg",
  },
  {
    id: "jerusalema",
    name: "Jerusalema step",
    song: "Jerusalema",
    artist: "Master KG feat. Nomcebo Zikode",
    movieOrAlbum: "Jer's",
    tags: ["footwork", "traveling", "afro"],
    description: "A buoyant traveling step with alternating footwork and open arms.",
    popularity: 94,
    sampleThumbnail: "https://i.ytimg.com/vi/fCZVL_8D048/hqdefault.jpg",
  },
  {
    id: "natu-natu",
    name: "Naatu shoulder snap",
    song: "Naatu Naatu",
    artist: "Rahul Sipligunj & Kaala Bhairava",
    movieOrAlbum: "RRR",
    tags: ["shoulders", "stomp", "bollywood"],
    description: "An explosive shoulder-led bounce with syncopated stomps and side kicks.",
    popularity: 96,
    sampleThumbnail: "https://i.ytimg.com/vi/OsU0CGZoV8E/hqdefault.jpg",
  },
] as const;

router.get("/hook-steps", (_req, res) => {
  res.json(ListHookStepsResponse.parse(hookSteps));
});

export default router;