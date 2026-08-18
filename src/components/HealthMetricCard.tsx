import { motion } from "framer-motion";
import {
	Heart,
	Droplet,
	Wind,
	Thermometer,
	Scale,
	Ruler,
	TrendingDown,
	TrendingUp,
	Minus,
	type LucideIcon,
} from "lucide-react";
import { CountUp } from "./CountUp";
import type { VitalCard, VitalStatus } from "../data/mockHealth";

const ICONS: Record<VitalCard["icon"], LucideIcon> = {
	heart: Heart,
	droplet: Droplet,
	wind: Wind,
	thermometer: Thermometer,
	scale: Scale,
	ruler: Ruler,
};

const STATUS_STYLES: Record<VitalStatus, string> = {
	normal: "bg-success/10 text-success",
	monitor: "bg-warn/10 text-warn",
	attention: "bg-bad/10 text-bad",
};

const STATUS_LABELS: Record<VitalStatus, string> = {
	normal: "Normal",
	monitor: "Monitor",
	attention: "Needs attention",
};

const TREND_ICONS = { up: TrendingUp, down: TrendingDown, steady: Minus };

interface HealthMetricCardProps {
	card: VitalCard;
	index: number;
}

export function HealthMetricCard({ card, index }: HealthMetricCardProps) {
	const Icon = ICONS[card.icon];
	const TrendIcon = TREND_ICONS[card.trend];

	return (
		<motion.article
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
			whileHover={{ y: -4 }}
			className="group rounded-2xl border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
		>
			<div className="flex items-start justify-between">
				<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<Icon className="h-5 w-5" strokeWidth={2} />
				</span>
				<span
					className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[card.status]}`}
				>
					{STATUS_LABELS[card.status]}
				</span>
			</div>

			<p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted">{card.label}</p>

			<div className="mt-1 flex items-baseline gap-1.5">
				{card.secondaryValue ? (
					<span className="text-2xl font-bold text-ink">{card.secondaryValue}</span>
				) : (
					<>
						<CountUp value={card.value} decimals={card.decimals} className="text-2xl font-bold text-ink" />
						<span className="font-mono text-sm text-muted">{card.unit}</span>
					</>
				)}
				{card.secondaryValue && card.id !== "height-bmi" && (
					<span className="font-mono text-sm text-muted">{card.unit}</span>
				)}
			</div>

			<div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
				<span>{card.context}</span>
				<span className="inline-flex shrink-0 items-center gap-1 font-medium">
					<TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
					{card.trend === "steady" ? "Steady" : card.trend === "up" ? "Rising" : "Lower"}
				</span>
			</div>
			<p className="mt-2 font-mono text-[11px] text-muted">Recorded {card.dateMeasured}</p>
		</motion.article>
	);
}
