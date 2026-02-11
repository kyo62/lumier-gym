import { motion } from 'framer-motion';

export default function Concept() {
    return (
        <section id="concept" className="py-20 md:py-32 bg-secondary/30 overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">

                    {/* Image Side */}
                    <motion.div
                        className="w-full md:w-1/2 relative"
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                            <img
                                src="https://images.unsplash.com/photo-1544367563-12123d8965cd?q=80&w=2070&auto=format&fit=crop"
                                alt="Meditation and Posture"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
                        </div>
                        {/* Decorative Element */}
                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl -z-10"></div>
                        <div className="absolute -top-6 -left-6 w-40 h-40 bg-white rounded-full blur-xl -z-10"></div>
                    </motion.div>

                    {/* Text Side */}
                    <motion.div
                        className="w-full md:w-1/2"
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        viewport={{ once: true }}
                    >
                        <span className="text-primary font-medium tracking-widest uppercase mb-4 block">Concept</span>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-gray-800 mb-8 leading-tight">
                            「鍛える」のではなく、<br />
                            「整える」という選択。
                        </h2>
                        <div className="space-y-6 text-gray-600 leading-relaxed text-lg">
                            <p>
                                私たちの体は、日々の生活習慣によって少しずつ歪んでいきます。
                                無理なトレーニングで筋肉をつける前に、まずは骨格を本来の位置に戻すこと。
                            </p>
                            <p>
                                姿勢が整えば、呼吸が深くなり、代謝が上がり、
                                自然と引き締まった美しいラインが生まれます。
                            </p>
                            <p>
                                Lumierでは、あなた自身の体が持つ「美しくなる力」を最大限に引き出す
                                オーダーメイドのプログラムを提供します。
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
