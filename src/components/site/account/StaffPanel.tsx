import BadgeAwardPanel from "./BadgeAwardPanel";

export default function StaffPanel({ targetUsername }: { targetUsername: string }) {
  return (
    <aside className="glass rounded-2xl border border-white/[0.1] p-4 h-fit lg:sticky lg:top-[calc(var(--banner-h,0px)+4rem)]">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Staff panel</h2>
      <BadgeAwardPanel targetUsername={targetUsername} />
    </aside>
  );
}
