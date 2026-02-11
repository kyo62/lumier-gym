import { motion } from 'framer-motion';

export default function Hero() {
    return (
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
            {/* Background Image (Placeholder) */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=2070&auto=format&fit=crop"
                    alt="Yoga Stretch"
                    className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/60"></div>
            </div>

            <div className="relative z-10 container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    <p className="text-primary font-medium tracking-[0.2em] mb-4 text-lg">
                        SELF PERSONAL GYM for MAMA
                    </p>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-gray-800 mb-6 leading-tight">
                        本来の美しさを、<br />
                        <span className="italic font-light">チューニング</span>する。
                    </h1>
                    <p className="text-gray-600 max-w-lg mx-auto mb-10 text-base md:text-lg leading-relaxed">
                        忙しいママのための、姿勢改善×ダイエット。<br className="hidden md:block" />
                        少ない時間で「なりたい姿」を叶える場所。
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="#contact"
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full text-lg font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                            体験レッスンを予約する
                        </a>
                        <a
                            href="#concept"
                            className="bg-white/80 hover:bg-white text-gray-800 px-8 py-4 rounded-full text-lg font-medium transition-all shadow-md hover:shadow-lg backdrop-blur-sm"
                        >
                            コンセプトを見る
                        </a>
                    </div>
                </motion.div>
            </div>

            {/* Scroll Down Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center cursor-pointer"
                onClick={() => document.getElementById('concept').scrollIntoView({ behavior: 'smooth' })}
            >
                <span className="text-gray-500 text-sm tracking-widest mb-2">SCROLL</span>
                <div className="w-[1px] h-16 bg-gray-400/50 relative overflow-hidden">
                    <motion.div
                        className="absolute top-0 left-0 w-full h-1/2 bg-primary"
                        animate={{ top: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                </div>
            </motion.div>
        </section>
    );
}
