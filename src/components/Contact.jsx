import { motion } from 'framer-motion';

export default function Contact() {
    return (
        <section id="contact" className="py-20 md:py-32 bg-secondary/30">
            <div className="container mx-auto px-6 max-w-4xl">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                >
                    <span className="text-primary font-medium tracking-widest uppercase mb-2 block">Contact</span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-800 mb-6">体験レッスン予約</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        まずは体験レッスンで、体の変化を感じてください。<br />
                        些細なご質問もお気軽にどうぞ。
                    </p>
                </motion.div>

                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-lg">
                    <form className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">お名前</label>
                                <input type="text" id="name" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-gray-50" placeholder="山田 花子" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
                                <input type="email" id="email" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-gray-50" placeholder="hello@example.com" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">ご希望メニュー</label>
                            <div className="relative">
                                <select id="type" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-gray-50 appearance-none text-gray-600">
                                    <option>体験レッスン (90分)</option>
                                    <option>無料カウンセリング (30分)</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">ご質問・ご要望</label>
                            <textarea id="message" rows="4" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-gray-50" placeholder="運動経験がないのですが大丈夫でしょうか？"></textarea>
                        </div>

                        <div className="text-center pt-4">
                            <button type="submit" className="w-full md:w-auto bg-primary text-white font-bold py-4 px-12 rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                                送信する
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                        <p className="text-gray-500 mb-4 text-sm">LINEからも簡単にご予約いただけます</p>
                        <button className="bg-[#06C755] text-white font-bold py-3 px-8 rounded-full hover:bg-[#05b54d] transition-colors inline-flex items-center">
                            LINEで予約する
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
