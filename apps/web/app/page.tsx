async function getUsers() {
  try {
    const res = await fetch("http://localhost:3001/users", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function Home() {
  const users = await getUsers();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Users</h1>
        <p className="text-gray-600 mb-8">List of all registered users</p>

        {users.length > 0 ? (
          <div className="grid gap-4">
            {users.map((user: { id: number; name: string }) => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4 border-indigo-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-sm text-gray-500">ID: {user.id}</p>
                  </div>
                  <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center">
                    <span className="text-indigo-600 font-bold">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
