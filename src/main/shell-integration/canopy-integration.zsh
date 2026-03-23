#!/usr/bin/env zsh
# Canopy terminal shell integration for zsh
# Emits OSC 133 escape sequences at command boundaries

# Guard against double-sourcing
[[ -n "$__canopy_shell_integration" ]] && return
__canopy_shell_integration=1

# OSC 133 sequence helpers
__canopy_osc133() {
  builtin printf '\e]133;%s\a' "$1"
}

# Track last exit code
__canopy_last_exit_code=0

# precmd: fires before each prompt is displayed
__canopy_precmd() {
  local exit_code=$?
  # Report previous command finished (with exit code)
  __canopy_osc133 "D;$exit_code"
  # Mark prompt start
  __canopy_osc133 "A"
}

# preexec: fires just before a command is executed
__canopy_preexec() {
  # Mark command execution start
  __canopy_osc133 "C"
}

# Install hooks via zsh arrays (safe for coexistence with other tools)
precmd_functions+=(__canopy_precmd)
preexec_functions+=(__canopy_preexec)

# Append input-start marker to PS1
# B marks the boundary between prompt and user input
# %{...%} tells zsh these are zero-width (non-printing) characters
PS1="${PS1}%{$(__canopy_osc133 B)%}"
