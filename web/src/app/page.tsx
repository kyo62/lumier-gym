import { Header } from '@/components/site/Header';
import { Hero } from '@/components/site/Hero';
import { Concept } from '@/components/site/Concept';
import { Profile } from '@/components/site/Profile';
import { MenuSection } from '@/components/site/MenuSection';
import { Flow } from '@/components/site/Flow';
import { Access } from '@/components/site/Access';
import { Faq } from '@/components/site/Faq';
import { Footer } from '@/components/site/Footer';
import { LocalBusinessJsonLd } from '@/components/site/JsonLd';
import { ReserveCta } from '@/components/site/ReserveCta';

export default function HomePage() {
  return (
    <>
      <LocalBusinessJsonLd />
      <Header />
      <main>
        <Hero />
        <Concept />
        <Profile />
        <MenuSection />
        <Flow />
        <Access />
        <Faq />
        <ReserveCta />
      </main>
      <Footer />
    </>
  );
}
