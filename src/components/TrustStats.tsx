import { useEffect, useState, useRef } from 'react';
import { Users, Sparkles, Clock, Eye } from 'lucide-react';

interface Stats {
    totalUsers: number;
    totalPrompts: number;
    recentPrompts: number;
    totalViews: number;
}

interface TrustStatsProps {
    trustStats?: Stats | null;
}

const useCountUp = (end: number, duration = 2000) => {
    const [count, setCount] = useState(0);
    const prevEnd = useRef(0);

    useEffect(() => {
        if (end === 0 || end === prevEnd.current) return;
        prevEnd.current = end;

        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [end, duration]);

    return count;
};

const formatNumber = (num: number): string => {
    return num.toLocaleString();
};

const TrustStats = ({ trustStats }: TrustStatsProps) => {
    const stats = trustStats || { totalUsers: 0, totalPrompts: 0, recentPrompts: 0, totalViews: 0 };
    const loaded = !!trustStats;

    const animatedUsers = useCountUp(stats.totalUsers);
    const animatedPrompts = useCountUp(stats.totalPrompts);
    const animatedRecent = useCountUp(stats.recentPrompts);
    const animatedViews = useCountUp(stats.totalViews);

    const statItems = [
        { icon: <Users size={22} />, value: animatedUsers, label: 'Registered Users', shortLabel: 'Users', color: '#818cf8' },
        { icon: <Sparkles size={22} />, value: animatedPrompts, label: 'Total Prompts', shortLabel: 'Prompts', color: '#a855f7' },
        { icon: <Clock size={22} />, value: animatedRecent, label: 'Added This Week', shortLabel: 'Prompts This Week', color: '#f472b6' },
        { icon: <Eye size={22} />, value: animatedViews, label: 'Total Views', shortLabel: 'Views', color: '#34d399' },
    ];

    return (
        <div className={`trust-stats-wrapper ${loaded ? 'trust-stats--loaded' : ''}`}>
            <div className="trust-stats-grid">
                {statItems.map((item, i) => (
                    <div
                        className="trust-stat-card"
                        key={i}
                        style={{ '--stat-color': item.color, animationDelay: `${i * 150}ms` } as React.CSSProperties}
                    >
                        <div className="trust-stat-glow"></div>
                        <div className="trust-stat-icon-ring">
                            {item.icon}
                        </div>
                        <span className="trust-stat-number">{formatNumber(item.value)}</span>
                        <span className="trust-stat-label trust-stat-label--full">{item.label}</span>
                        <span className="trust-stat-label trust-stat-label--short">{item.shortLabel}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TrustStats;
