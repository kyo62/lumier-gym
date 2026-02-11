import { motion } from 'framer-motion';
import { Sparkles, Heart, Scale } from 'lucide-react';

const features = [
    {
        icon: <Scale className="w-8 h-8" />,
        title: "姿勢改善 × ダイエット",
        description: "骨格の歪みを整えることで、代謝を上げ、無理なく痩せやすい身体へ。産後ダイエットにも最適です。"
    },
    {
        icon: <Sparkles className="w-8 h-8" />,
        title: "忙しいママに嬉しい「時短」",
        description: "1回30分〜の短時間集中プログラム。家事や育児の合間に、効率よく理想の自分へ近づけます。"
    },
    {
        icon: <Heart className="w-8 h-8" />,
        title: "セルフパーソナルの手軽さ",
        description: "パーソナルの丁寧さと、セルフの気楽さを両立。自分のペースで続けられる、新しいフィットネスの形です。"
    }
];

export default function Features() {
    return (
        <section id="features" className="py-20 md:py-32 bg-white">
            <div className="container mx-auto px-6">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    <span className="text-primary font-medium tracking-widest uppercase mb-2 block">Why Choose TUNER.</span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">TUNER.が選ばれる理由</h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="bg-secondary/20 p-8 rounded-2xl hover:bg-secondary/40 transition-colors duration-300 group cursor-default"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center text-primary shadow-sm mb-6 group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-serif font-bold text-gray-800 mb-4">{feature.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
