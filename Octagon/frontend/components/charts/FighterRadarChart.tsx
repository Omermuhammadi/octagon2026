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

export function FighterRadarChart({ data, fighterAName, fighterBName }: FighterRadarChartProps) {
    return (
        <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name={fighterAName}
                        dataKey="A"
                        stroke="#C5B358"
                        strokeWidth={2}
                        fill="#C5B358"
                        fillOpacity={0.3}
                    />
                    <Radar
                        name={fighterBName}
                        dataKey="B"
                        stroke="#D20A0A"
                        strokeWidth={2}
                        fill="#D20A0A"
                        fillOpacity={0.3}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
