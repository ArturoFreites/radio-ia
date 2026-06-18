export default function CabinaLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased">
      {children}
    </div>
  );
}
