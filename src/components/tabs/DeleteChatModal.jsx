import { supabase } from '../../lib/supabase';

export default function DeleteChatModal({ 
  userToDelete, 
  setShowDeleteModal, 
  setUserToDelete,
  setCurrentChatUser,
  setShowChatOptions,
  currentChatUser,
  session,
  fetchChatHistory 
}) {
  const handleDeleteChat = async () => {
    if (!userToDelete ||!session?.user?.id) return;

    try {
      const { error } = await supabase
       .from('messages')
       .delete()
       .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${userToDelete.id}),and(sender_id.eq.${userToDelete.id},receiver_id.eq.${session.user.id})`);

      if (error) throw error;

      // Agar current chat delete kar rahe ho to reset kar do
      if (currentChatUser?.id === userToDelete.id) {
        setCurrentChatUser(null);
      }

      // Sidebar refresh karo
      fetchChatHistory();
      
      // Modal band karo
      setShowDeleteModal(false);
      setUserToDelete(null);
      setShowChatOptions(null);
      
    } catch (err) {
      console.error('Delete Error:', err);
      alert("❌ Failed to delete chat: " + err.message);
    }
  };

  if (!userToDelete) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center">
          <div className="text-5xl mb-4">🗑️</div>
          <h3 className="text-lg font-black text-gray-900 mb-2">Delete Chat?</h3>
          <p className="text-sm text-gray-600 mb-1">Delete all messages with</p>
          <p className="text-base font-bold text-rose-500 mb-4">👤 {userToDelete?.full_name}</p>
          <p className="text-xs text-gray-500 mb-6">⚠️ This action cannot be undone</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
              className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteChat}
              className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black py-3 rounded-xl hover:opacity-90 transition"
            >
              Delete 💔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}