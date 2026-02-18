export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(10, 14, 20)' }}>
      {children}
    </div>
  );
}
