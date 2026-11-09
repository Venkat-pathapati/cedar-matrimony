import { serverGet, type Plan } from "@/lib/api";
import PlansGate from "./PlansGate";
import PlansView from "./PlansView";

// Shown only if the API is unreachable (the real plans come from the backend seed).
const FALLBACK: Plan[] = [
  { name: "Free", price: 0, period: "Lifetime", highlight: false,
    features: ["Create Profile", "Basic Search", "View Profile Details (Limited)", "Send Interest (5 per day)"],
    excluded: ["Chat with Matches", "View Contact Details", "Advanced Filters", "Priority Support"] },
  { name: "Silver", price: 999, period: "3 Months", highlight: false,
    features: ["Everything in Free Plan", "View Full Profile Details", "Send Unlimited Interests", "Chat with Matches", "View Contact Details (Limited)", "Basic Filters (Age, Location, etc.)"],
    excluded: ["Advanced Filters", "Priority Support"] },
  { name: "Gold", price: 1899, period: "6 Months", highlight: true,
    features: ["Everything in Silver Plan", "View Contact Details (Unlimited)", "Advanced Search Filters", "See Who Viewed Your Profile", "Profile Highlighting", "Direct Message to Members", "Priority Customer Support", "Verified Badge on Profile"],
    excluded: [] },
  { name: "Platinum", price: 2899, period: "12 Months", highlight: false,
    features: ["Everything in Gold Plan", "Top Placement in Search Results", "Personalized Matchmaking Suggestions", "Advanced Filters (Profession, Education, Lifestyle)", "Read Receipts for Messages", "Dedicated Relationship Manager", "Profile Spotlight (More Visibility)", "Priority Support (Phone + Chat)"],
    excluded: [] },
];

export default async function Plans() {
  const plans = await serverGet<Plan[]>("/api/plans", FALLBACK);
  return <PlansGate><PlansView plans={plans} /></PlansGate>;
}
