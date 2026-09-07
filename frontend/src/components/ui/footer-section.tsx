'use client';
import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
	ShieldCheck,
	Activity,
	Layers,
	Cpu,
	Terminal,
	Database,
	ArrowUpRight,
	Radio,
	ExternalLink,
} from 'lucide-react';

interface FooterLink {
	title: string;
	href: string;
	icon?: React.ComponentType<{ className?: string }>;
	isExternal?: boolean;
	isDashboard?: boolean;
}

interface FooterSection {
	label: string;
	links: FooterLink[];
}

const footerSections: FooterSection[] = [
	{
		label: 'Sections',
		links: [
			{ title: 'About Project', href: '#about' },
			{ title: 'Four Vectors', href: '#features' },
			{ title: 'Analysis Workflow', href: '#workflow' },
			{ title: 'AI Architecture', href: '#capabilities' },
			{ title: 'Technology Stack', href: '#stack' },
		],
	},
	{
		label: 'Analyst Workspace',
		links: [
			{ title: 'Launch Dashboard', href: '/dashboard', isDashboard: true, icon: Terminal },
			{ title: 'Live Ingestion Hub', href: '/dashboard', isDashboard: true, icon: Radio },
			{ title: 'Evidence Ledger', href: '/dashboard', isDashboard: true, icon: Database },
			{ title: 'Replay Benchmarks', href: '/dashboard', isDashboard: true, icon: Layers },
		],
	},
	{
		label: 'Analytical Vectors',
		links: [
			{ title: 'Sentiment & Stance', href: '#features', icon: Activity },
			{ title: 'Differential Privacy', href: '#features', icon: ShieldCheck },
			{ title: 'Narrative Clustering', href: '#features', icon: Layers },
			{ title: 'Network Topology', href: '#features', icon: Cpu },
		],
	},
	{
		label: 'Audit & Governance',
		links: [
			{ title: 'SIH26152 · NTRO', href: '#about' },
			{ title: 'Honest Baseline Doctrine', href: '#about' },
			{ title: 'Zero-Key Source Matrix', href: '#workflow' },
			{ title: 'Signed Evidence Certificates', href: '#capabilities' },
		],
	},
];

interface FooterProps {
	onNavigateDashboard?: () => void;
	className?: string;
}

export function Footer({ onNavigateDashboard, className = '' }: FooterProps) {
	const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, link: FooterLink) => {
		if (link.isDashboard) {
			e.preventDefault();
			if (onNavigateDashboard) {
				onNavigateDashboard();
			} else {
				window.history.pushState({}, '', '/dashboard');
				window.dispatchEvent(new PopStateEvent('popstate'));
			}
			return;
		}

		if (link.href.startsWith('#')) {
			e.preventDefault();
			const target = document.querySelector(link.href);
			if (target) {
				target.scrollIntoView({ behavior: 'smooth' });
			}
		}
	};

	return (
		<footer
			className={`md:rounded-t-6xl relative w-full max-w-7xl mx-auto flex flex-col items-center justify-center rounded-t-4xl border-t border-[#1c2638] bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 py-12 lg:py-16 text-[#edf4ff] ${className}`}
		>
			<div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

			<div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
				{/* Brand and Description */}
				<AnimatedContainer className="space-y-4">
					<div className="flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E1E0CC]/10 border border-[#E1E0CC]/30 text-[#E1E0CC] shadow-[0_0_15px_rgba(225,224,204,0.15)]">
							<ShieldCheck className="size-5" />
						</div>
						<div className="flex flex-col">
							<span className="font-mono text-base font-bold tracking-wider text-white">NEXUS</span>
							<span className="text-[10px] font-mono text-[#87b5ff] uppercase tracking-wider">
								Forensics Platform
							</span>
						</div>
					</div>

					<p className="text-muted-foreground text-xs leading-relaxed max-w-sm">
						Evidence-backed social intelligence framework designed for national situational awareness.
						Four decoupled analytical engines, honest baseline doctrine, and zero-hallucination provenance.
					</p>

					<div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#101b2d] border border-[#203454] text-[11px] font-mono text-[#87b5ff]">
						<span className="h-1.5 w-1.5 rounded-full bg-[#4ee1a0] animate-pulse" />
						<span>Smart India Hackathon 2026 · SIH26152 · NTRO</span>
					</div>

					<p className="text-muted-foreground pt-4 text-xs">
						© {new Date().getFullYear()} NEXUS. All rights reserved.
					</p>
				</AnimatedContainer>

				{/* 4-column Links Grid */}
				<div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
					{footerSections.map((section, index) => (
						<AnimatedContainer key={section.label} delay={0.1 + index * 0.08}>
							<div className="mb-8 md:mb-0">
								<h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#87b5ff]">
									{section.label}
								</h3>
								<ul className="text-muted-foreground mt-4 space-y-2.5 text-xs">
									{section.links.map((link) => (
										<li key={link.title}>
											<a
												href={link.href}
												onClick={(e) => handleLinkClick(e, link)}
												className="hover:text-white inline-flex items-center gap-1.5 transition-colors duration-200 cursor-pointer"
											>
												{link.icon && <link.icon className="size-3.5 text-[#5b8cff]" />}
												<span>{link.title}</span>
												{link.isDashboard && (
													<ArrowUpRight className="size-3 text-[#E1E0CC]/80" />
												)}
												{link.isExternal && (
													<ExternalLink className="size-3 text-[#5b8cff]/70" />
												)}
											</a>
										</li>
									))}
								</ul>
							</div>
						</AnimatedContainer>
					))}
				</div>
			</div>
		</footer>
	);
}

type ViewAnimationProps = {
	delay?: number;
	className?: ComponentProps<typeof motion.div>['className'];
	children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return children;
	}

	return (
		<motion.div
			initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.8 }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

export default Footer;
