import { motion } from 'framer-motion';

export default function Trainers() {
    return (
        <section id="trainers" className="py-20 md:py-32 bg-secondary/30">
            <div className="container mx-auto px-6">
                <div className="flex flex-col-reverse md:flex-row items-center gap-12 lg:gap-20">
                    {/* Text Side */}
                    <motion.div
                        className="w-full md:w-1/2"
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <span className="text-primary font-medium tracking-widest uppercase mb-4 block">Trainer</span>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-800 mb-6">
                            あなたに寄り添う、<br />
                            専属パートナー
                        </h2>
                        <h3 className="text-xl font-bold text-gray-700 mb-4">MIYUKI / 代表トレーナー</h3>
                        <p className="text-gray-600 leading-relaxed mb-6">
                            大手パーソナルジムで年間1,200セッション以上を担当。
                            「もっと一人ひとりの女性の悩みに深く向き合いたい」という想いからLumierを設立。
                        </p>
                        <blockquote className="border-l-4 border-primary pl-6 py-2 italic text-gray-500 mb-8">
                            「運動が苦手な方こそ来てほしい。
                            正しい姿勢で呼吸するだけで、体は驚くほど変わります。」
                        </blockquote>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="font-bold text-gray-800">資格</p>
                                <ul className="text-sm text-gray-600 list-disc list-inside">
                                    <li>NSCA-CPT</li>
                                    <li>ピラティスインストラクター</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">得意分野</p>
                                <ul className="text-sm text-gray-600 list-disc list-inside">
                                    <li>姿勢改善</li>
                                    <li>ブライダルダイエット</li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>

                    {/* Image Side */}
                    <motion.div
                        className="w-full md:w-1/2"
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        viewport={{ once: true }}
                    >
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl md:ml-auto max-w-sm mx-auto md:max-w-none">
                            <img
                                src="https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1974&auto=format&fit=crop"
                                alt="Trainer Portrait"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 text-white font-serif text-2xl">
                                Make Your New Lifestyle.
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
