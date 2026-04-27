"use client";

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
    Legend
} from "recharts";

interface FighterStats {
    subject: string;
    A: number;
    B: number;
    fullMark: number;
}

interface FighterRadarChartProps {
    data: FighterStats[];
    fighterAName: string;
    fighterBName: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
                <p className="font-bold text-gray-900 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color }} className="font-medium">
                        {entry.name}: <span className="font-bold">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function FighterRadarChart({ data, fighterAName, fighterBName }: FighterRadarChartProps) {
    return (
        <div className="w-full h-[420px] bg-white rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="82%" data={data}>
                    <PolarGrid stroke="#E5E7EB" strokeWidth={1} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#111111', fontSize: 12, fontWeight: 700 }}
                        tickLine={false}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        axisLine={false}
                        tickCount={5}
                    />
                    <Radar
                        name={fighterAName}
                        dataKey="A"
                        stroke="#DC2626"
                        strokeWidth={2.5}
                        fill="#DC2626"
                        fillOpacity={0.22}
                        dot={{ fill: '#DC2626', strokeWidth: 0, r: 5 }}
                    />
                    <Radar
                        name={fighterBName}
                        dataKey="B"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        fill="#2563EB"
                        fillOpacity={0.22}
                        dot={{ fill: '#2563EB', strokeWidth: 0, r: 5 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{
                            paddingTop: '16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#111111',
                        }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
