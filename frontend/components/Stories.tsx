import { serverGet, type Story } from "@/lib/api";
import StoriesCarousel from "./StoriesCarousel";

const SAMPLE: Story[] = [
  { quote: "", couple: "David & Esther", city: "Hyderabad" },
];

export default async function Stories() {
  const fetched = await serverGet<Story[]>("/api/stories", []);
  // Hide the seed placeholder text until real testimonials are added.
  const real = fetched.filter((s) => !s.quote.startsWith("Replace with"));
  return <StoriesCarousel stories={real.length ? real : SAMPLE} />;
}
