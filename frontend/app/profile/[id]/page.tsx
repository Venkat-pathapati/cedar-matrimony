import ProfileView from "@/components/ProfileView";

export default function ProfilePage({ params }: { params: { id: string } }) {
  return <ProfileView id={Number(params.id)} />;
}
