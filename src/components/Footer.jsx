import { Instagram, Twitter, Facebook } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white py-12 md:py-16">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">

                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-serif font-bold tracking-wide mb-4">
                            TUNER<span className="text-primary">.</span>
                        </h2>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
                            忙しいママのための姿勢改善セルフパーソナル。<br />
                            本来の美しさを取り戻す、特別な場所。
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-end">
                        <div className="flex space-x-6 mb-6">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Instagram className="w-6 h-6" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Twitter className="w-6 h-6" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Facebook className="w-6 h-6" />
                            </a>
                        </div>
                        <p className="text-gray-500 text-xs">
                            &copy; {new Date().getFullYear()} TUNER. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
