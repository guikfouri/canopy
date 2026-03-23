#!/usr/bin/env bash
# Canopy terminal shell integration for bash
# Emits OSC 133 escape sequences at command boundaries

# Guard against double-sourcing
[[ -n "$__canopy_shell_integration" ]] && return
__canopy_shell_integration=1

# Source user's bashrc first (--rcfile replaces default rc loading)
[[ -f "$HOME/.bashrc" ]] && source "$HOME/.bashrc"

__canopy_osc133() {
  builtin printf '\e]133;%s\a' "$1"
}

__canopy_precmd() {
  local exit_code=$?
  __canopy_osc133 "D;$exit_code"
  __canopy_osc133 "A"
}

__canopy_preexec() {
  # Only fire once per command (guard with flag)
  if [[ -z "$__canopy_in_command" ]]; then
    __canopy_in_command=1
    __canopy_osc133 "C"
  fi
}

# Reset the preexec guard in precmd
__canopy_precmd_wrapper() {
  __canopy_in_command=""
  __canopy_precmd
}

# Install precmd via PROMPT_COMMAND
if [[ ${BASH_VERSINFO[0]} -ge 5 ]]; then
  # Bash 5+ supports array PROMPT_COMMAND
  PROMPT_COMMAND+=(__canopy_precmd_wrapper)
else
  # Bash 4: append to string PROMPT_COMMAND
  PROMPT_COMMAND="__canopy_precmd_wrapper${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
fi

# Install preexec via DEBUG trap (bash 4.4+)
if [[ ${BASH_VERSINFO[0]} -gt 4 || (${BASH_VERSINFO[0]} -eq 4 && ${BASH_VERSINFO[1]} -ge 4) ]]; then
  trap '__canopy_preexec' DEBUG
fi

# Append input-start marker to PS1 once (not inside PROMPT_COMMAND)
PS1="${PS1}\[$(__canopy_osc133 B)\]"
