import { runInstagramPosterActor } from "./instagram-poster/actor";

export interface ActorDefinition {
  id: string;
  name: string;
  execute: typeof runInstagramPosterActor;
}

const actorDefinitions: ActorDefinition[] = [
  {
    id: "instagram-poster",
    name: "Instagram Poster",
    execute: runInstagramPosterActor,
  },
];

export const listActorDefinitions = (): ActorDefinition[] => {
  return [...actorDefinitions];
};

export { runInstagramPosterActor };
export type { ActorRunResult, InstagramPosterActorDependencies } from "./instagram-poster/actor";
export type {
  InstagramPosterInput,
  ParsedInstagramPosterInput,
} from "./instagram-poster/input-schema";
