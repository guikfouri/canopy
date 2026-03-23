# Canopy zsh bootstrap — sources user's .zshenv while keeping ZDOTDIR for .zshrc
# ZDOTDIR currently points to this bootstrap directory (set by Canopy)
CANOPY_ZDOTDIR="$ZDOTDIR"
CANOPY_USER_ZDOTDIR="${CANOPY_ORIGINAL_ZDOTDIR:-$HOME}"

# Temporarily restore ZDOTDIR for user's .zshenv (some configs depend on it)
if [[ -f "$CANOPY_USER_ZDOTDIR/.zshenv" ]]; then
  ZDOTDIR="$CANOPY_USER_ZDOTDIR"
  source "$CANOPY_USER_ZDOTDIR/.zshenv"
fi

# CRITICAL: Restore ZDOTDIR to bootstrap dir so zsh finds our .zshrc next
ZDOTDIR="$CANOPY_ZDOTDIR"
