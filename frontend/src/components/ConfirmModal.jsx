export default function ConfirmModal({ message, onConfirm, onCancel, isPending }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <p className="text-gray-800 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            No, keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md disabled:opacity-50"
          >
            {isPending ? 'Cancelling...' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
