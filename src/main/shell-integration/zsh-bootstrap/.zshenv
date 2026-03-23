# Canopy zsh bootstrap — restores original ZDOTDIR and sources user's .zshenv
CANOPY_ZDOTDIR="$ZDOTDIR"
if [[ -n "$CANOPY_ORIGINAL_ZDOTDIR" ]]; then
  ZDOTDIR="$CANOPY_ORIGINAL_ZDOTDIR"
else
  ZDOTDIR="$HOME"
fi
[[ -f "$ZDOTDIR/.zshenv" ]] && source "$ZDOTDIR/.zshenv"
