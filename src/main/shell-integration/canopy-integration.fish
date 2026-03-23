#!/usr/bin/env fish
# Canopy terminal shell integration for fish
# Emits OSC 133 escape sequences at command boundaries

# Guard against double-sourcing
if set -q __canopy_shell_integration
    exit 0
end
set -g __canopy_shell_integration 1

function __canopy_osc133
    builtin printf '\e]133;%s\a' $argv[1]
end

function __canopy_fish_prompt --on-event fish_prompt
    # Prompt start only — D is emitted by postexec for accurate exit codes
    __canopy_osc133 "A"
end

function __canopy_fish_preexec --on-event fish_preexec
    __canopy_osc133 "C"
end

function __canopy_fish_postexec --on-event fish_postexec
    __canopy_osc133 "D;$status"
end
