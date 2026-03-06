import Link from "next/link";

export function Footer() {
    return (
        <footer className="bg-octagon-black border-t border-white/10 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <span className="text-2xl font-black italic tracking-tighter text-white">
                            OCTAGON<span className="text-octagon-red">ORACLE</span>
                        </span>
                        <p className="mt-4 text-gray-400 max-w-xs">
                            The ultimate platform for fight prediction, analysis, and martial arts training.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider mb-4">Platform</h3>
                        <ul className="space-y-2">
                            <li><Link href="/prediction" className="text-gray-400 hover:text-octagon-red transition-colors">Predictions</Link></li>
                            <li><Link href="/comparison" className="text-gray-400 hover:text-octagon-red transition-colors">Fighter Comparison</Link></li>
                            <li><Link href="/training" className="text-gray-400 hover:text-octagon-red transition-colors">Training Roadmaps</Link></li>
                            <li><Link href="/gyms" className="text-gray-400 hover:text-octagon-red transition-colors">Find a Gym</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider mb-4">More</h3>
                        <ul className="space-y-2">
                            <li><Link href="/self-defense" className="text-gray-400 hover:text-octagon-red transition-colors">Self-Defense</Link></li>
                            <li><Link href="/gear" className="text-gray-400 hover:text-octagon-red transition-colors">Gear Store</Link></li>
                            <li><Link href="/form-check" className="text-gray-400 hover:text-octagon-red transition-colors">Form Check</Link></li>
                            <li><Link href="/dashboard" className="text-gray-400 hover:text-octagon-red transition-colors">Dashboard</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} OctagonOracle. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
