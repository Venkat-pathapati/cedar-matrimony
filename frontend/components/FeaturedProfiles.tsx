import { serverGet, type Profile } from "@/lib/api";
import FeaturedView from "./FeaturedView";

// Shown when the API is unreachable or has no verified profiles yet (sample data only).
const SAMPLE: Profile[] = [
  { id: -1, name: "Anusha", age: 27, city: "Hyderabad", profession: "Software Engineer", education: "B.Tech", denomination: "Christian", photo_url: "/profiles/anusha.jpg", verified: true, match: null },
  { id: -2, name: "Rahul", age: 29, city: "Bengaluru", profession: "Business Professional", education: "MBA", denomination: "Christian", photo_url: "/profiles/rahul.jpg", verified: true, match: null },
  { id: -3, name: "Sneha", age: 26, city: "Vijayawada", profession: "Teacher", education: "M.Ed", denomination: "Christian", photo_url: "/profiles/sneha.jpg", verified: true, match: null },
  { id: -4, name: "David", age: 31, city: "Hyderabad", profession: "IT Professional", education: "B.Tech", denomination: "Christian", photo_url: "/profiles/david.jpg", verified: true, match: null },
];

export default async function FeaturedProfiles() {
  const fetched = await serverGet<Profile[]>("/api/profiles/featured", []);
  const profiles = fetched.length ? fetched : SAMPLE;
  return <FeaturedView profiles={profiles} />;
}
