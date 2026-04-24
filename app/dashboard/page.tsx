export default function DashboardOverview() {
  return (
    <div>
      <h1 data-testid="dashboard-heading" className="mb-6 text-2xl font-bold">Dashboard Overview</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded border p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Providers</h3>
          <p className="text-2xl font-bold">42</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-sm font-medium text-gray-500">Active Credentials</h3>
          <p className="text-2xl font-bold">38</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-sm font-medium text-gray-500">Pending Enrollments</h3>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="rounded border p-4">
          <h3 className="text-sm font-medium text-gray-500">Compliance Alerts</h3>
          <p className="text-2xl font-bold">3</p>
        </div>
      </div>
    </div>
  );
}
