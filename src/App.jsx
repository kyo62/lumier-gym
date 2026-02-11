import { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Concept from './components/Concept';
import Features from './components/Features';
import Trainers from './components/Trainers';
import Pricing from './components/Pricing';
import Contact from './components/Contact';
import Footer from './components/Footer';

function App() {
  // Smooth scroll fix for some edge cases
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="font-sans antialiased text-gray-900 bg-background selection:bg-primary/30">
      <Header />
      <main>
        <Hero />
        <Concept />
        <Features />
        <Trainers />
        <Pricing />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;
