const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗',
  '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓',
  '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕',
  '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
  '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
  '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠',
  '🤐', '🤨', '😐', '😑', '😶', '🫥', '😶‍🌫️', '😬', '🫨', '🫤',
  '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘',
  '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👏', '🙌',
  '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
  '🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💯', '💢', '💨'
];

export default function EmojiPicker({ onEmojiSelect, setShowEmojiPicker }) {
  return (
    <div className="absolute bottom-16 left-4 bg-white border border-gray-200 shadow-xl rounded-2xl p-3 z-50 w-80 max-h-64 overflow-y-auto">
      <div className="grid grid-cols-8 gap-2">
        {EMOJIS.map((emoji) => (
          <button 
            key={emoji} 
            type="button" 
            onClick={() => {
              onEmojiSelect(emoji);
              setShowEmojiPicker(false);
            }} 
            className="text-xl hover:bg-gray-100 p-1 rounded-lg transition active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}