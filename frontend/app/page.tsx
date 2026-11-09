import CtaBand from "@/components/CtaBand";
import Features from "@/components/Features";
import FeaturedProfiles from "@/components/FeaturedProfiles";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Plans from "@/components/Plans";
import Stories from "@/components/Stories";
import Trust from "@/components/Trust";
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <FeaturedProfiles />
        <Stories />
        <Plans />
        <Trust />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
