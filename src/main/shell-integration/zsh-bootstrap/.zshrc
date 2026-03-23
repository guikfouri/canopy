# Canopy zsh bootstrap — sources user's .zshrc then loads shell integration
# Restore ZDOTDIR to user's original value (for user's .zshrc and beyond)
ZDOTDIR="${CANOPY_USER_ZDOTDIR:-$HOME}"

# Source user's .zshrc
[[ -f "$ZDOTDIR/.zshrc" ]] && source "$ZDOTDIR/.zshrc"

# Load Canopy shell integration (must be last to ensure hooks are installed after user's config)
[[ -f "$CANOPY_SHELL_INTEGRATION_DIR/canopy-integration.zsh" ]] && \
  source "$CANOPY_SHELL_INTEGRATION_DIR/canopy-integration.zsh"
