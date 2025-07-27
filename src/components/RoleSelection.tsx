interface RoleSelectionProps {
  onRoleSelected: (role: 'vendor' | 'supplier') => void;
}

export default function RoleSelection({ onRoleSelected }: RoleSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-orange-100">
            <span className="text-2xl">🏪</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Smart Street
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please choose your role to continue
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
              I am a:
            </label>
            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                onClick={() => onRoleSelected('vendor')}
                className="p-6 border-2 border-gray-300 rounded-lg text-center transition-all hover:border-orange-500 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <div className="text-4xl mb-3">🏪</div>
                <div className="text-lg font-semibold text-gray-900 mb-2">Vendor</div>
                <div className="text-sm text-gray-600">
                  I want to buy products from suppliers for my business
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => onRoleSelected('supplier')}
                className="p-6 border-2 border-gray-300 rounded-lg text-center transition-all hover:border-orange-500 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <div className="text-4xl mb-3">🚚</div>
                <div className="text-lg font-semibold text-gray-900 mb-2">Supplier</div>
                <div className="text-sm text-gray-600">
                  I want to sell products to vendors and businesses
                </div>
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              You can only access features specific to your selected role. 
              Choose carefully as you'll need separate accounts for different roles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
