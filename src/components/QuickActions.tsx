import { motion } from "framer-motion";
import { History, Download, FileText, UserCog, type LucideIcon } from "lucide-react";

interface QuickAction {
	id: string;
	label: string;
	description: string;
	icon: LucideIcon;
}

const ACTIONS: QuickAction[] = [
	{ id: "history", label: "View Health History", description: "Browse past visits and readings", icon: History },
	{ id: "download", label: "Download Report", description: "Save your latest summary", icon: Download },
	{ id: "pdf", label: "Generate PDF", description: "Create a printable record", icon: FileText },
	{ id: "profile", label: "Update Profile", description: "Edit your personal details", icon: UserCog },
];

export function QuickActions() {
	return (
		<section>
			<h3 className="text-lg font-bold text-ink">Quick Actions</h3>
			<div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{ACTIONS.map((action, index) => {
					const Icon = action.icon;
					return (
						<motion.button
							key={action.id}
							type="button"
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
							whileHover={{ y: -4 }}
							className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
						>
							<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Icon className="h-5 w-5" strokeWidth={2} />
							</span>
							<div>
								<p className="text-sm font-semibold text-ink">{action.label}</p>
								<p className="mt-0.5 text-xs text-muted">{action.description}</p>
							</div>
						</motion.button>
					);
				})}
			</div>
		</section>
	);
}
