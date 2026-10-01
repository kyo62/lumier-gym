import Link from 'next/link';
import { Footer } from './Footer';
import { site } from '@/config/site';

/** 利用規約・プライバシーポリシーの共通レイアウト */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-6 sm:h-20">
          <Link href="/" className="font-serif text-lg tracking-[0.18em]">
            {site.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
        <h1 className="text-2xl">{title}</h1>
        <div className="mt-10 space-y-10 text-sm leading-8 text-muted [&_h2]:text-base [&_h2]:text-ink [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>

      <Footer />
    </>
  );
}
