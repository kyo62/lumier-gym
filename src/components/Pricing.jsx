import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

const plans = [
    {
        name: "Trial",
        price: "3,300",
        period: "1回 / 60分",
        description: "まずは姿勢改善の効果を実感したい方に",
        features: ["姿勢分析チェック", "セルフパーソナル体験", "カウンセリング", "ウェア・タオル無料レンタル"],
        recommended: false
    },
    {
        name: "Standard",
        price: "15,800",
        period: "月額 / 通い放題",
        description: "自分のペースでしっかり通いたい方に",
        features: ["通い放題", "毎月の姿勢チェック", "食事アドバイス", "LINE相談サポート"],
        recommended: true
    },
    {
        name: "Ticket",
        price: "44,000",
        period: "10回券 / 3ヶ月有効",
        description: "忙しくて定期的に来れない方に",
        features: ["1回あたり4,400円", "土日利用OK", "ウェア・タオル無料レンタル", "繰り越しOK"],
        recommended: false
    }
];

export default function Pricing() {
    return (
        <section id="pricing" className="py-20 md:py-32 bg-white">
            <div className="container mx-auto px-6">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    <span className="text-primary font-medium tracking-widest uppercase mb-2 block">Price</span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-800">料金プラン</h2>
                    <p className="text-gray-500 mt-4">入会金 22,000円 (体験当日入会で0円)</p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={index}
                            className={cn(
                                "relative p-8 rounded-2xl border transition-all duration-300",
                                plan.recommended
                                    ? "border-primary bg-secondary/10 shadow-xl transform md:-translate-y-4"
                                    : "border-gray-200 hover:border-primary/50 hover:shadow-lg"
                            )}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium tracking-wide">
                                    POPULAR
                                </div>
                            )}
                            <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">{plan.name}</h3>
                            <div className="flex items-baseline mb-4">
                                <span className="text-3xl font-bold text-primary">¥{plan.price}</span>
                                <span className="text-gray-500 ml-2 text-sm">{plan.period}</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-8">{plan.description}</p>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center text-gray-700 text-sm">
                                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button className={cn(
                                "w-full py-3 rounded-full font-medium transition-colors duration-300",
                                plan.recommended
                                    ? "bg-primary text-white hover:bg-primary/90"
                                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            )}>
                                選択する
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
