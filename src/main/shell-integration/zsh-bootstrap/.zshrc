# Canopy zsh bootstrap — sources user's .zshrc then loads shell integration
[[ -f "$ZDOTDIR/.zshrc" ]] && source "$ZDOTDIR/.zshrc"
source "$CANOPY_SHELL_INTEGRATION_DIR/canopy-integration.zsh"
