import { Header } from '@/components/site/Header';
import { Hero } from '@/components/site/Hero';
import { Concept } from '@/components/site/Concept';
import { Reasons } from '@/components/site/Reasons';
import { Flow } from '@/components/site/Flow';
import { Price } from '@/components/site/Price';
import { Profile } from '@/components/site/Profile';
import { Access } from '@/components/site/Access';
import { Faq } from '@/components/site/Faq';
import { ReserveCta } from '@/components/site/ReserveCta';
import { Footer } from '@/components/site/Footer';
import { LocalBusinessJsonLd } from '@/components/site/JsonLd';

export default function HomePage() {
  return (
    <>
      <LocalBusinessJsonLd />
      <Header />
      <main>
        <Hero />
        <Concept />
        <Reasons />
        <Flow />
        <Price />
        <Profile />
        <Access />
        <Faq />
        <ReserveCta />
      </main>
      <Footer />
    </>
  );
}
